"""
CivicConnect Batch AI Processor (Nightly Fallback / Retry Runner)
Reads pending processing_jobs from Supabase, downloads from S3,
runs HF/Groq classification, and commits results using the SQL RPC function.
"""
import os
import requests
import json
import boto3
from supabase import create_client
from dotenv import load_dotenv

# ─────────────────────────────────────────────
# 1. Load local .env (ignored by GitHub Actions, which uses system env vars)
# ─────────────────────────────────────────────
env_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', '..', 'backend', '.env')
)
load_dotenv(dotenv_path=env_path)

# ─────────────────────────────────────────────
# 2. Helper: get env variable with optional default / required guard
# ─────────────────────────────────────────────
def get_env(key, default=None, required=False):
    val = os.environ.get(key, default)
    if required and not val:
        raise Exception(f"CRITICAL: Missing required environment variable: {key}")
    return val

# ─────────────────────────────────────────────
# 3. Configuration
# ─────────────────────────────────────────────
SUPABASE_URL          = get_env('SUPABASE_URL',            required=True)
SUPABASE_SERVICE_ROLE = get_env('SUPABASE_SERVICE_ROLE',   required=True)

AWS_ACCESS_KEY_ID = (
    get_env("AWS_ACCESS_KEY_ID")
    or get_env("AWS_ACCESS_KEY")
)
AWS_SECRET_ACCESS_KEY = (
    get_env("AWS_SECRET_ACCESS_KEY")
    or get_env("AWS_SECRET_KEY")
)
if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
    raise Exception("Missing S3/MinIO credentials: set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY "
                    "or AWS_ACCESS_KEY/AWS_SECRET_KEY")

AWS_REGION   = get_env('AWS_REGION',            'ap-south-1')
HF_TOKEN     = get_env('HF_TOKEN')
HF_MODEL_ID  = get_env('HF_MODEL_ID',           'manthan2876/CivicConnect-Classifier')
GROQ_API_KEY = get_env('OPEN_SOURCE_LLM_KEY',   required=True)
GROQ_URL     = get_env('OPEN_SOURCE_LLM_URL',   'https://api.groq.com/openai/v1')
LLM_MODEL    = get_env('LLM_MODEL',             'llama-3.1-8b-instant')
BUCKET       = get_env('AWS_BUCKET',           'civic-connect-data')

MAX_RETRIES = 3

# ─────────────────────────────────────────────
# 4. Startup environment summary (no secrets)
# ─────────────────────────────────────────────
print("Environment loaded.")
print(f"  Bucket   : {BUCKET}")
print(f"  Region   : {AWS_REGION}")
print(f"  HF Model : {HF_MODEL_ID}")
print(f"  LLM Model: {LLM_MODEL}")

# ─────────────────────────────────────────────
# 5. Clients
# ─────────────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
s3 = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

# ─────────────────────────────────────────────
# 6. HuggingFace image classification
# ─────────────────────────────────────────────
def get_gradio_predictions(file_bytes):
    api_url = f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

    last_exc = None
    for attempt in range(3):
        try:
            response = requests.post(api_url, headers=headers, data=file_bytes, timeout=30)
            response.raise_for_status()
            res_json = response.json()

            # Surface HF-level errors (model loading, not-found, etc.)
            if isinstance(res_json, dict) and "error" in res_json:
                raise Exception(f"HF API error: {res_json['error']}")

            predictions = []
            if isinstance(res_json, list):
                predictions = [
                    {'class': p.get('label'), 'confidence': p.get('score', 0)}
                    for p in res_json
                ]
            elif isinstance(res_json, dict) and 'confidences' in res_json:
                predictions = [
                    {'class': p.get('label'), 'confidence': p.get('confidence', 0)}
                    for p in res_json['confidences']
                ]
            return predictions[:3]

        except requests.RequestException as e:
            last_exc = e
            if attempt == 2:
                print(f"[HF ERROR] All retries exhausted: {e}")
                raise
        except Exception as e:
            print(f"[HF ERROR] {e}")
            raise

    return []

# ─────────────────────────────────────────────
# 7. Groq LLM text/audio classification
# ─────────────────────────────────────────────
def call_groq_llm(description, transcription):
    system_msg = """You are a civic infrastructure expert for "Civic Connect".
Your task is to classify citizen reports into the top 3 most likely categories.

PRIMARY CLASSIFICATION CLASSES (Choose ONLY from this list):
- construction_waste
- damaged_sidewalk
- damaged_sign
- dead_animal
- flooding_waterlogging
- garbage_overflow_west_container
- good_road
- illegal_construction
- illegal_parking
- open_manhole
- pothole_road_crack
- powerline_damage
- streetlight_damage
- traffic_light

MAPPING GUIDES:
- "Trash", "garbage", "waste", "rubbish", "piled up", "dump" -> "garbage_overflow_west_container" or "construction_waste"
- "Portal", "Bottle", "pothole", "cracked road", "bump" -> "pothole_road_crack"
- "Leak", "Pipe", "water logging", "overflowing water" -> "flooding_waterlogging" or "open_manhole"
- "Darkness", "Bulb", "lamp", "street light out" -> "streetlight_damage"

Return a JSON object containing "predictions", which is a list of the top 3 categories and confidence scores (must sum to 1.0).
Format strictly as: {"predictions": [{"category": "class_name", "confidence": 0.XX}, ...]}"""

    user_msg = f"""Analyze these citizen inputs:
1. User Description: "{description}"
2. Voice Transcription: "{transcription}" """

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}",
    }
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user",   "content": user_msg},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0,
    }

    last_exc = None
    for attempt in range(3):
        try:
            res = requests.post(
                f"{GROQ_URL}/chat/completions",
                headers=headers, json=payload, timeout=30
            )
            res.raise_for_status()
            parsed      = res.json()
            raw_content = parsed['choices'][0]['message']['content']

            try:
                data = json.loads(raw_content)
            except json.JSONDecodeError:
                print(f"[GROQ LLM] Raw response that failed to parse:\n{raw_content}")
                raise Exception("Groq returned invalid JSON.")

            return data.get('predictions', [])

        except requests.RequestException as e:
            last_exc = e
            if attempt == 2:
                raise

    return []

# ─────────────────────────────────────────────
# 8. Groq Whisper audio transcription
# ─────────────────────────────────────────────
def transcribe_audio(file_bytes):
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    files   = {"file": ("audio.mp3", file_bytes, "audio/mpeg")}
    data    = {"model": "whisper-large-v3"}

    last_exc = None
    for attempt in range(3):
        try:
            res = requests.post(
                f"{GROQ_URL}/audio/transcriptions",
                headers=headers, files=files, data=data, timeout=30
            )
            res.raise_for_status()
            return res.json().get('text', '')

        except requests.RequestException as e:
            last_exc = e
            if attempt == 2:
                print(f"[GROQ AUDIO ERROR] All retries exhausted: {e}")
                return ''

    return ''

# ─────────────────────────────────────────────
# 9. Weighted fusion of modality predictions
# ─────────────────────────────────────────────
def calculate_fusion(image_top3, audio_top3, text_top3):
    weights   = {'IMAGE': 0.50, 'AUDIO': 0.30, 'TEXT': 0.20}
    score_map = {}
    total_weight = 0

    def add_modality(top3, wt):
        nonlocal total_weight
        if not top3:
            return
        total_weight += wt
        for item in top3:
            label      = item.get('category') or item.get('class') or item.get('label') or 'Other'
            confidence = item.get('confidence') or item.get('score') or 0
            score_map[label] = score_map.get(label, 0) + (confidence * wt)

    add_modality(image_top3, weights['IMAGE'])
    add_modality(audio_top3, weights['AUDIO'])
    add_modality(text_top3,  weights['TEXT'])

    sorted_results = sorted(
        [
            {
                'category':        k,
                'normalizedScore': v / total_weight if total_weight > 0 else 0,
            }
            for k, v in score_map.items()
        ],
        key=lambda x: x['normalizedScore'],
        reverse=True,
    )

    winner    = sorted_results[0] if sorted_results            else {'category': 'Other', 'normalizedScore': 0}
    runner_up = sorted_results[1] if len(sorted_results) > 1  else {'category': 'Other', 'normalizedScore': 0}
    margin    = winner['normalizedScore'] - runner_up['normalizedScore']

    return {
        'finalCategory':    winner['category'],
        'fusionScore':      winner['normalizedScore'],
        'marginOfVictory':  margin,
        'needsHumanReview': margin < 0.15 and winner['normalizedScore'] < 0.7,
    }

# ─────────────────────────────────────────────
# 10. Process a single job
# ─────────────────────────────────────────────
def process_job(job):
    job_id = job['id']
    print(f"\n--- Processing Job {job_id} ---")

    # Mark as processing AND increment attempts atomically
    supabase.table('processing_jobs').update({
        'status':   'processing',
        'attempts': job['attempts'] + 1,
    }).eq('id', job_id).execute()

    try:
        # ── Download image ──────────────────────────────
        image_bytes = None
        if job.get('image_s3_key'):
            try:
                print(f"  Downloading S3 image : {job['image_s3_key']}")
                obj         = s3.get_object(Bucket=BUCKET, Key=job['image_s3_key'])
                image_bytes = obj['Body'].read()
            except Exception as e:
                print(f"  [S3 WARNING] Image download failed, continuing without image. Error: {e}")

        # ── Download audio ──────────────────────────────
        audio_bytes = None
        if job.get('audio_s3_key'):
            try:
                print(f"  Downloading S3 audio : {job['audio_s3_key']}")
                obj         = s3.get_object(Bucket=BUCKET, Key=job['audio_s3_key'])
                audio_bytes = obj['Body'].read()
            except Exception as e:
                print(f"  [S3 WARNING] Audio download failed, continuing without audio. Error: {e}")

        # ── HuggingFace image classification ───────────
        image_top3 = []
        if image_bytes:
            image_top3 = get_gradio_predictions(image_bytes)

        # ── Groq Whisper transcription ──────────────────
        audio_text = ""
        if audio_bytes and GROQ_API_KEY:
            audio_text = transcribe_audio(audio_bytes)

        # ── Groq LLM: text description ──────────────────
        text_top3 = []
        if job.get('description') and GROQ_API_KEY:
            text_top3 = call_groq_llm(job['description'], "")

        # ── Groq LLM: audio transcription ──────────────
        audio_top3 = []
        if audio_text and GROQ_API_KEY:
            audio_top3 = call_groq_llm("", audio_text)

        print(f"  image_top3 : {image_top3}")
        print(f"  text_top3  : {text_top3}")
        print(f"  audio_top3 : {audio_top3}")

        # ── Weighted fusion ─────────────────────────────
        fusion_result = calculate_fusion(image_top3, audio_top3, text_top3)
        print(f"  fusion     : {fusion_result}")

        ai_result_json = {
            'finalCategory':    fusion_result['finalCategory'],
            'fusionScore':      fusion_result['fusionScore'],
            'needsHumanReview': fusion_result['needsHumanReview'],
            'imageTop3':        image_top3,
            'audioTop3':        audio_top3,
            'textTop3':         text_top3,
            'audioText':        audio_text,
        }

        # ── Commit via Postgres RPC ─────────────────────
        print(f"  Committing category '{ai_result_json['finalCategory']}' via RPC …")
        rpc_res = supabase.rpc('process_issue_ai_results', {
            'p_job_id':    job_id,
            'p_ai_result': ai_result_json,
        }).execute()

        # Validate RPC result
        if rpc_res.data is None:
            raise Exception("RPC returned no data — possible stored-procedure failure.")

        print(f"  Commit success: {rpc_res.data}")

    except Exception as e:
        print(f"  [JOB FAILURE] Job {job_id} failed: {e}")
        # If we've used all retries, permanently mark as failed; otherwise re-queue
        new_status = 'failed' if job['attempts'] + 1 >= MAX_RETRIES else 'pending'
        supabase.table('processing_jobs').update({
            'status': new_status,
            'error':  str(e),
        }).eq('id', job_id).execute()

# ─────────────────────────────────────────────
# 11. Entry point
# ─────────────────────────────────────────────
if __name__ == '__main__':
    print(
        f"DEBUG: Checking Supabase for jobs with status in "
        f"['pending', 'failed', 'processing (stale)'] and attempts < {MAX_RETRIES}"
    )

    # Fetch pending / failed jobs.
    # NOTE: stale 'processing' jobs (abandoned due to runner crash) should be
    # reclaimed by a separate scheduled cleanup that resets them to 'pending'
    # when updated_at < now() - interval '30 minutes', OR add 'processing' here
    # filtered by updated_at age (see architectural note in code review).
    result = (
        supabase.table('processing_jobs')
        .select('*')
        .in_('status', ['pending', 'failed'])
        .lt('attempts', MAX_RETRIES)
        .execute()
    )

    jobs = result.data or []
    print(f"Found {len(jobs)} jobs.")

    for job in jobs:
        process_job(job)

    print("Batch processing execution completed.")