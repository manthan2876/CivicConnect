import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Client, handle_file } from '@gradio/client';

dotenv.config();

let hfClient: any = null;

async function getGradioClient() {
    if (!hfClient) {
        const spaceId = process.env.HF_SPACE_ID || 'manthan2876/CivicConnect-Classifier';
        const hfToken = process.env.HF_TOKEN;
        console.log(`[AI SERVICE] Connecting to Hugging Face Space: ${spaceId}...`);
        hfClient = await Client.connect(spaceId, hfToken ? { token: hfToken } as any : {});
        console.log('[AI SERVICE] Connected to Hugging Face Space successfully.');
    }
    return hfClient;
}

const MODALITY_WEIGHTS = {
    IMAGE: 0.50,
    AUDIO: 0.30,
    TEXT: 0.20
};

// Open Source focus: Defaulting to Groq (Llama 3) which is OpenAI-compatible
const openai = new OpenAI({
    apiKey: process.env.OPEN_SOURCE_LLM_KEY || '',
    baseURL: process.env.OPEN_SOURCE_LLM_URL || 'https://api.groq.com/openai/v1'
});

export class AIService {
    /**
     * Standardizes and translates multiple text inputs into a ranked JSON array using an Open Source LLM (via Groq/Ollama).
     */
    static async standardizeContent(userInput: string, audioTranscription: string): Promise<any[]> {
        const prompt = `
            You are a civic infrastructure expert for "Civic Connect". 
            Analyze these two inputs from a citizen:
            1. User Description: "${userInput}"
            2. Voice Transcription: "${audioTranscription}"

            PRIMARY CLASSIFICATION CLASSES (Choose only from these 14):
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

            CONVINCING CONTEXT:
            Citizens often use voice recording while walking or driving. Transcription errors are common.
            - "Portal" or "Bottle" in the road usually means "pothole_road_crack".
            - "Leak" or "Pipe" usually means "flooding_waterlogging" or "open_manhole".
            - "Darkness" or "Bulb" usually means "streetlight_damage".
            
            Tasks:
            1. Select the Top 3 most likely classes from the list above.
            2. Return a JSON object with "predictions" containing these classes with confidence scores (must sum to 1.0).
            
            Format strictly as: {"predictions": [{"category": "class_name", "confidence": 0.XX}, ...]}
        `;

        try {
            const response = await openai.chat.completions.create({
                model: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            });

            const rawJson = response.choices?.[0]?.message?.content || '{}';
            const parsed = JSON.parse(rawJson);
            
            // Extract array from standard possible keys, prioritizing 'predictions'
            return parsed.predictions || parsed.results || parsed.categories || (Array.isArray(parsed) ? parsed : [parsed]);
        } catch (error) {
            console.error('LLM Standardization failed:', error);
            return [{ category: 'Other', confidence: 1.0 }];
        }
    }

    /**
     * Executes the Advanced Weighted Fusion Logic across all modalities.
     */
    static calculateAdvancedFusion(imageTop3: any[], audioTop3: any[], textTop3: any[]): any {
        const scoreMap: Record<string, number> = {};
        let totalWeightUsed = 0;

        const processModality = (top3Array: any[], weight: number) => {
            if (!top3Array || !Array.isArray(top3Array) || top3Array.length === 0) return;
            totalWeightUsed += weight;
            top3Array.forEach(p => {
                const rawClass = p.category || p.class || p.label || 'Other';
                if (!scoreMap[rawClass]) scoreMap[rawClass] = 0;
                scoreMap[rawClass] += ((p.confidence || 0) * weight);
            });
        };

        processModality(imageTop3, MODALITY_WEIGHTS.IMAGE);
        processModality(audioTop3, MODALITY_WEIGHTS.AUDIO);
        processModality(textTop3, MODALITY_WEIGHTS.TEXT);

        const sorted = Object.entries(scoreMap)
            .map(([category, score]) => ({ 
                category, 
                score, 
                // Normalize score based on available modalities
                normalizedScore: totalWeightUsed > 0 ? (score / totalWeightUsed) : 0 
            }))
            .sort((a, b) => b.score - a.score);

        const winner = sorted[0] || { category: 'Other', score: 0, normalizedScore: 0 };
        const runnerUp = sorted[1] || { category: 'Other', score: 0, normalizedScore: 0 };
        const marginOfVictory = winner.normalizedScore - runnerUp.normalizedScore;

        return {
            finalCategory: winner.category,
            fusionScore: winner.normalizedScore, // Return normalized score for UI (0.0 to 1.0)
            marginOfVictory,
            needsHumanReview: marginOfVictory < 0.15 && winner.normalizedScore < 0.7
        };
    }

    /**
     * Transcribes audio using Groq's Whisper-large-v3 (Open Source).
     */
    static async transcribeAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
        try {
            // Convert Buffer to a File object for the OpenAI client
            // Node.js 18+ has Blob/File, but for older we can use a Stream or just a custom object
            const file = new File([new Uint8Array(audioBuffer)], fileName, { type: 'audio/mpeg' });

            const transcription = await openai.audio.transcriptions.create({
                file: file,
                model: 'whisper-large-v3',
            });

            return transcription.text;
        } catch (error) {
            console.error('Audio Transcription failed:', error);
            return '';
        }
    }

    /**
     * Call the Python AI Microservice or Hugging Face Space to classify the image (returns Top-3).
     */
    static async classifyImage(imageBuffer: Buffer, fileName: string): Promise<any[]> {
        const useHF = process.env.USE_HF_CLASSIFIER !== 'false';
        if (useHF) {
            try {
                const client = await getGradioClient();
                const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
                const file = new File([blob], fileName, { type: 'image/jpeg' });

                console.log(`[AI SERVICE] Classifying image via Hugging Face Space...`);
                const result = await client.predict('/classify', {
                    image: handle_file(file)
                });
                
                if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
                    const labelData = result.data[0];
                    if (labelData && Array.isArray(labelData.confidences)) {
                        return labelData.confidences.map((item: any) => ({
                            class: item.label,
                            confidence: item.confidence
                        }));
                    }
                }
                console.warn('[AI SERVICE] HF Space result in unexpected format. Falling back to local microservice.');
            } catch (error) {
                console.error('[AI SERVICE] HF Space classification failed. Falling back to local microservice. Error:', error);
            }
        }

        // Fallback: local Python AI Microservice
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        formData.append('file', imageBuffer, { filename: fileName });

        try {
            const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8005';
            const response = await axios.post(`${aiUrl}/classify`, formData, {
                headers: formData.getHeaders(),
            });
            // Extract top_3 from the python response object
            return response.data?.top_3 || (Array.isArray(response.data) ? response.data : [response.data]);
        } catch (error) {
            console.error('AI Classification failed:', error);
            return [];
        }
    }

    /**
     * Performs a multimodal analysis using an image URL, audio buffer, and description text.
     */
    static async analyzeMultimodal(imageUrl: string | null, audioBuffer: Buffer | null, text: string): Promise<any> {
        let imageTop3: any[] = [];
        if (imageUrl) {
            try {
                console.log(`[AI SERVICE] Fetching remote image for classification: ${imageUrl}`);
                const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                imageTop3 = await this.classifyImage(buffer, 'whatsapp_image.jpg');
            } catch (err) {
                console.error('[AI SERVICE] WhatsApp image fetch or classification failed:', err);
            }
        }

        let audioText = '';
        if (audioBuffer) {
            try {
                audioText = await this.transcribeAudio(audioBuffer, 'whatsapp_audio.mp3');
            } catch (err) {
                console.error('[AI SERVICE] WhatsApp audio transcription failed:', err);
            }
        }

        const textTop3 = await this.standardizeContent(text, audioText);
        const fusionResult = this.calculateAdvancedFusion(imageTop3, [], textTop3);

        return fusionResult;
    }

    /**
     * Maps AI predicted labels or generic names to official application categories.
     */
    static getAppCategory(rawLabel: string | null | undefined): string {
        if (!rawLabel || typeof rawLabel !== 'string') return 'Other';
        const mapping: { [key: string]: string } = {
            'garbage_overflow_west_container': 'Waste Management',
            'construction_waste': 'Waste Management',
            'pothole_road_crack': 'Road/Potholes',
            'damaged_sidewalk': 'Road/Potholes',
            'damaged_sign': 'Road/Potholes',
            'streetlight_damage': 'Street Light',
            'traffic_light': 'Street Light',
            'powerline_damage': 'Street Light',
            'flooding_waterlogging': 'Water Leakage',
            'open_manhole': 'Water Leakage',
            'dead_animal': 'Waste Management', // Mapped based on user preference
            'illegal_construction': 'Other',
            'illegal_parking': 'Other',
            'good_road': 'Other'
        };

        const normalized = rawLabel.toLowerCase().replace(/ /g, '_');
        return mapping[normalized] || mapping[rawLabel] || rawLabel;
    }
}
