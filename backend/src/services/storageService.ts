import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.AWS_ENDPOINT || 's3.amazonaws.com';
const isS3Standard = endpoint === 's3.amazonaws.com' || endpoint === 's3.us-east-1.amazonaws.com';

const clientConfig: any = {
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || '',
        secretAccessKey: process.env.AWS_SECRET_KEY || '',
    },
};

if (!isS3Standard) {
    clientConfig.endpoint = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
    clientConfig.forcePathStyle = true;
}

clientConfig.region = process.env.AWS_REGION || 'us-east-1';

const s3Client = new S3Client(clientConfig);

export class StorageService {
    private static bucketName = process.env.AWS_BUCKET || 'civic-connect-uploads';

    static async uploadFile(file: any, folder: string = 'reports'): Promise<string | null> {
        try {
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${folder}/${uuidv4()}.${fileExt}`;

            // Upload to S3
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            });

            await s3Client.send(command);

            // Construct Presigned URL (Valid for 24 hours)
            const presignedUrl = await this.getPresignedUrl(fileName, 24 * 60 * 60);

            return presignedUrl;
        } catch (error) {
            console.error('S3 Storage Service Upload Error:', error);
            return null;
        }
    }

    static async getPresignedUrl(urlOrKey: string, expiresInSeconds: number = 60 * 60): Promise<string> {
        try {
            if (!urlOrKey) return '';

            // If it's an external HTTP/HTTPS URL, return it as-is
            if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
                if (!urlOrKey.includes(this.bucketName)) {
                    return urlOrKey;
                }
            }

            // If it's already a presigned URL (contains X-Amz-Signature or similar), return it
            if (urlOrKey.includes('X-Amz-Signature') || urlOrKey.includes('X-Amz-Algorithm')) return urlOrKey;

            // Extract the key from the full URL if necessary
            let objectKey: string = urlOrKey.split('?')[0] || '';
            if (objectKey.includes(this.bucketName)) {
                if (objectKey.includes(`/${this.bucketName}/`)) {
                    const parts = objectKey.split(`/${this.bucketName}/`);
                    if (parts.length > 1 && parts[1]) {
                        objectKey = parts[1];
                    }
                } else {
                    const bucketIndex = objectKey.indexOf(this.bucketName);
                    const firstSlashAfterBucket = objectKey.indexOf('/', bucketIndex);
                    if (firstSlashAfterBucket !== -1) {
                        objectKey = objectKey.substring(firstSlashAfterBucket + 1);
                    }
                }
            }

            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: objectKey,
            });

            // Generate a fresh presigned URL valid for 1 hour
            return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
        } catch (error) {
            console.error('S3 Storage Service Presigned GET URL Error:', error);
            return urlOrKey; // Fallback to original
        }
    }

    static async deleteFile(path: string): Promise<boolean> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: path,
            });
            await s3Client.send(command);
            return true;
        } catch (error) {
            console.error('S3 Storage Service Delete Error:', error);
            return false;
        }
    }

    static getBucketName(): string {
        return this.bucketName;
    }

    static async getPresignedPutUrl(fileName: string): Promise<string> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
            });
            return await getSignedUrl(s3Client, command, { expiresIn: 60 * 60 });
        } catch (error) {
            console.error('S3 Storage Service Presigned PUT URL Error:', error);
            throw error;
        }
    }
}
