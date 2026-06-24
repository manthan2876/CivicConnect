import fs from 'fs';
import { AIService } from '../services/aiService.js';

async function main() {
    const imagePath = `C:/Users/Archi/.gemini/antigravity-ide/brain/7f1671ac-56f1-4895-94c2-bf425e890d65/pothole_test_image_1782285100107.png`;
    console.log(`[TEST] Reading test image from ${imagePath}...`);
    
    if (!fs.existsSync(imagePath)) {
        console.error(`[TEST ERROR] Test image not found at: ${imagePath}`);
        process.exit(1);
    }
    
    const buffer = fs.readFileSync(imagePath);
    console.log('[TEST] Calling AIService.classifyImage...');
    
    try {
        const start = Date.now();
        const predictions = await AIService.classifyImage(buffer, 'test_pothole.png');
        const duration = Date.now() - start;
        
        console.log(`\n[TEST SUCCESS] Classification completed in ${duration}ms!`);
        console.log('Predictions:');
        console.log(JSON.stringify(predictions, null, 2));
    } catch (err) {
        console.error('[TEST ERROR] AIService classification failed:', err);
    }
}

main();
