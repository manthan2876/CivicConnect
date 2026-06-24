import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
});

export class StorageService {
    private static bucketName = process.env.MINIO_BUCKET || 'civic-connect-uploads';

    static async uploadFile(file: any, folder: string = 'reports'): Promise<string | null> {
        try {
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${folder}/${uuidv4()}.${fileExt}`;

            // Upload to MinIO
            await minioClient.putObject(
                this.bucketName,
                fileName,
                file.buffer,
                file.size,
                { 'Content-Type': file.mimetype }
            );

            // Construct Presigned URL (Valid for 24 hours)
            const presignedUrl = await minioClient.presignedGetObject(this.bucketName, fileName, 24 * 60 * 60);
            
            return presignedUrl;
        } catch (error) {
            console.error('MinIO Storage Service Error:', error);
            return null;
        }
    }

    static async getPresignedUrl(urlOrKey: string): Promise<string> {
        try {
            if (!urlOrKey) return '';
            
            // If it's already a presigned URL (contains X-Amz-Signature), return it
            if (urlOrKey.includes('X-Amz-Signature')) return urlOrKey;

            // Extract the key from the full URL if necessary
            let objectKey = urlOrKey;
            if (urlOrKey.includes(this.bucketName)) {
                const parts = urlOrKey.split(`${this.bucketName}/`);
                if (parts.length > 1 && parts[1]) {
                    objectKey = parts[1];
                }
            }

            // Generate a fresh presigned URL valid for 1 hour
            return await minioClient.presignedGetObject(this.bucketName, objectKey, 60 * 60);
        } catch (error) {
            console.error('Error generating presigned URL:', error);
            return urlOrKey; // Fallback to original
        }
    }

    static async deleteFile(path: string): Promise<boolean> {
        try {
            await minioClient.removeObject(this.bucketName, path);
            return true;
        } catch (error) {
            console.error('MinIO Storage Service Delete Error:', error);
            return false;
        }
    }

    static getBucketName(): string {
        return this.bucketName;
    }
}
