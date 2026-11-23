import { Router } from 'express';
import { handleWhatsAppWebhook } from '../controllers/whatsappController.js';

const router = Router();

// Twilio webhooks usually use URL-encoded POST
router.post('/', handleWhatsAppWebhook);
router.post('/webhook', handleWhatsAppWebhook);

export default router;
