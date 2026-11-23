import express, { type Request, type Response } from 'express'; // Restarting to pick up remote env
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectPostgres } from './config/connect.js';
import { seedUlbBoundaries } from './seed/ulbBoundaries.js';
import { startSpatialDeduplicator } from './cron/deduplicator.js';
import { runArchivalProcess } from './cron/archiver.js';
import './config/supabase.js'; // Initialize Supabase


import reportRoutes from './routes/reportRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serve local uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount routes under /api and also at root for resilient client URL compatibility
const mountAllRoutes = (prefix: string) => {
    app.use(`${prefix}/reports`, reportRoutes);
    app.use(`${prefix}/departments`, departmentRoutes);
    app.use(`${prefix}/notifications`, notificationRoutes);
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/users`, userRoutes);
    app.use(`${prefix}/analytics`, analyticsRoutes);
    app.use(`${prefix}/audit-logs`, auditRoutes);
    app.use(`${prefix}/uploads`, uploadRoutes);
    app.use(`${prefix}/system`, systemRoutes);
    app.use(`${prefix}/whatsapp`, whatsappRoutes);
};

mountAllRoutes('/api');
mountAllRoutes('');


app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async () => {
    await connectPostgres();
    await seedUlbBoundaries();
    
    // Background Services
    startSpatialDeduplicator();
    
    // Run archival every 24 hours (86400000 ms)
    setInterval(runArchivalProcess, 86400000);
    // Initial run
    runArchivalProcess().catch(err => console.error('Initial archival failed:', err));

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
};

startServer().catch(err => {
    console.error('Fatal error during startup:', err);
    process.exit(1);
});


// Global Error Handler
app.use(errorHandler);

