"""Nightly CivicConnect AI retry processor.

Uses Supabase Storage for media and the private Hugging Face Space for image,
transcription, and text classification.
"""
import os
import tempfile
import time

from dotenv import load_dotenv
from gradio_client import Client, handle_file
from supabase import create_client

env_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env")
)
load_dotenv(dotenv_path=env_path)


def get_env(key, default=None, required=False):
    value = os.environ.get(key, default)
    if required and not value:
        raise Exception(f"CRITICAL: Missing required environment variable: {key}")
    return value


SUPABASE_URL = get_env("SUPABASE_URL", required=True)
SUPABASE_SERVICE_ROLE = get_env("SUPABASE_SERVICE_ROLE", required=True)
BUCKET = get_env("SUPABASE_STORAGE_BUCKET", "civic-connect-data")
HF_TOKEN = get_env("HF_TOKEN") or get_env("HF_SPACE_WRITE_TOKEN")
if not HF_TOKEN:
    raise Exception("CRITICAL: Missing required environment variable: HF_TOKEN (or HF_SPACE_WRITE_TOKEN)")
HF_SPACE_ID = get_env("HF_SPACE_ID", "Maharsh8805/CivicConnect-Classifier")
MAX_RETRIES = 3
SPACE_ATTEMPTS = int(get_env("HF_SPACE_ATTEMPTS", "3"))
SPACE_RETRY_DELAY_SECONDS = float(get_env("HF_SPACE_RETRY_DELAY_MS", "1500")) / 1000

CIVIC_CLASSES = {
    "construction_waste", "damaged_sidewalk", "damaged_sign", "dead_animal",
    "flooding_waterlogging", "garbage_overflow_west_container", "good_road",
    "illegal_construction", "illegal_parking", "open_manhole",
    "pothole_road_crack", "powerline_damage", "streetlight_damage", "traffic_light",
}

print(f"Environment loaded. Bucket: {BUCKET}; HF Space: {HF_SPACE_ID}")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)


def with_space_retry(operation):
    last_error = None
    for attempt in range(SPACE_ATTEMPTS):
        try:
            return operation()
        except Exception as error:
            last_error = error
            if attempt < SPACE_ATTEMPTS - 1:
                time.sleep(SPACE_RETRY_DELAY_SECONDS * (attempt + 1))
    raise last_error


def get_gradio_client():
    return Client(HF_SPACE_ID, token=HF_TOKEN)


def normalize_predictions(result):
    data = result.get("data") if isinstance(result, dict) else result
    candidates = []
    if isinstance(data, (list, tuple)):
        first = data[0] if data else []
        candidates = first.get("confidences", first) if isinstance(first, dict) else first
    elif isinstance(data, dict):
        candidates = (
            data.get("confidences")
            or data.get("predictions")
            or data.get("results")
            or []
        )
    if not isinstance(candidates, (list, tuple)):
        raise ValueError("Classifier returned an unsupported prediction shape")

    predictions = []
    for item in candidates:
        if not isinstance(item, dict):
            continue
        category = item.get("label") or item.get("category") or item.get("class")
        confidence = item.get("confidence", item.get("score"))
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            continue
        if category in CIVIC_CLASSES and confidence >= 0:
            predictions.append({"category": category, "confidence": confidence})
    if candidates and not predictions:
        raise ValueError("Classifier returned no valid civic classes")
    return predictions[:3]


def download_media(path_or_url):
    if not path_or_url:
        return None
    clean_path = path_or_url.split("?", 1)[0]
    marker = f"/{BUCKET}/"
    if marker in clean_path:
        clean_path = clean_path.split(marker, 1)[1]
    try:
        result = supabase.storage.from_(BUCKET).download(clean_path)
        return bytes(result)
    except Exception as error:
        print(f"[STORAGE WARNING] Download failed for {clean_path}: {error}")
        return None


def get_gradio_predictions(file_bytes):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
        temp_file.write(file_bytes)
        temp_path = temp_file.name
    try:
        def classify():
            result = get_gradio_client().predict(
                image=handle_file(temp_path), api_name="/classify"
            )
            return normalize_predictions(result)
        return with_space_retry(classify)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def transcribe_audio(file_bytes):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
        temp_file.write(file_bytes)
        temp_path = temp_file.name
    try:
        def transcribe():
            result = get_gradio_client().predict(
                audio=handle_file(temp_path), language="auto", api_name="/transcribe"
            )
            data = result.get("data") if isinstance(result, dict) else result
            transcript = data[0] if isinstance(data, (list, tuple)) else data
            if not isinstance(transcript, str):
                raise ValueError("Classifier returned an invalid transcript")
            return transcript.strip()
        return with_space_retry(transcribe)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def classify_text(text):
    def classify():
        result = get_gradio_client().predict(
            text=text[:2000], api_name="/classify_text"
        )
        return normalize_predictions(result)
    return with_space_retry(classify)


def calculate_fusion(image_top3, audio_top3, text_top3):
    weights = {"IMAGE": 0.50, "AUDIO": 0.30, "TEXT": 0.20}
    score_map = {}
    total_weight = 0

    def add_modality(predictions, weight):
        nonlocal total_weight
        if not predictions:
            return
        total_weight += weight
        for item in predictions:
            label = item.get("category") or item.get("class") or item.get("label")
            if label not in CIVIC_CLASSES:
                continue
            score_map[label] = score_map.get(label, 0) + (
                (item.get("confidence") or item.get("score") or 0) * weight
            )

    add_modality(image_top3, weights["IMAGE"])
    add_modality(audio_top3, weights["AUDIO"])
    add_modality(text_top3, weights["TEXT"])
    sorted_results = sorted(
        [
            {"category": category, "normalizedScore": score / total_weight}
            for category, score in score_map.items()
        ],
        key=lambda item: item["normalizedScore"],
        reverse=True,
    ) if total_weight else []
    winner = sorted_results[0] if sorted_results else {
        "category": "Other", "normalizedScore": 0
    }
    runner_up = sorted_results[1] if len(sorted_results) > 1 else {
        "category": "Other", "normalizedScore": 0
    }
    margin = winner["normalizedScore"] - runner_up["normalizedScore"]
    return {
        "finalCategory": winner["category"],
        "fusionScore": winner["normalizedScore"],
        "marginOfVictory": margin,
        "needsHumanReview": margin < 0.15 and winner["normalizedScore"] < 0.7,
    }


def process_job(job):
    job_id = job["id"]
    print(f"\n--- Processing Job {job_id} ---")
    supabase.table("processing_jobs").update({
        "status": "processing",
        "attempts": job["attempts"] + 1,
    }).eq("id", job_id).execute()

    try:
        image_bytes = download_media(job.get("image_s3_key"))
        audio_bytes = download_media(job.get("audio_s3_key"))
        image_top3 = get_gradio_predictions(image_bytes) if image_bytes else []
        audio_text = transcribe_audio(audio_bytes) if audio_bytes else ""
        text_top3 = classify_text(job["description"]) if job.get("description") else []
        audio_top3 = classify_text(audio_text) if audio_text else []
        fusion = calculate_fusion(image_top3, audio_top3, text_top3)
        result = {
            "finalCategory": fusion["finalCategory"],
            "fusionScore": fusion["fusionScore"],
            "needsHumanReview": fusion["needsHumanReview"],
            "imageTop3": image_top3,
            "audioTop3": audio_top3,
            "textTop3": text_top3,
            "audioText": audio_text,
        }
        rpc_result = supabase.rpc("process_issue_ai_results", {
            "p_job_id": job_id, "p_ai_result": result
        }).execute()
        if rpc_result.data is None:
            raise Exception("RPC returned no data")
        print(f"  Commit success: {rpc_result.data}")
    except Exception as error:
        print(f"  [JOB FAILURE] Job {job_id} failed: {error}")
        new_status = "failed" if job["attempts"] + 1 >= MAX_RETRIES else "pending"
        supabase.table("processing_jobs").update({
            "status": new_status, "error": str(error)
        }).eq("id", job_id).execute()


if __name__ == "__main__":
    result = (
        supabase.table("processing_jobs")
        .select("*")
        .in_("status", ["pending", "failed"])
        .lt("attempts", MAX_RETRIES)
        .execute()
    )
    jobs = result.data or []
    print(f"Found {len(jobs)} jobs.")
    for job in jobs:
        process_job(job)
    print("Batch processing execution completed.")
