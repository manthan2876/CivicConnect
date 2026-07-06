import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const bucketName = process.env.AWS_BUCKET || 'civic-connect-data';
const accessKey = process.env.AWS_ACCESS_KEY;
const secretKey = process.env.AWS_SECRET_KEY;

if (!accessKey || !secretKey) {
  console.error("AWS credentials missing in .env file (AWS_ACCESS_KEY or AWS_SECRET_KEY)");
  process.exit(1);
}

console.log(`Initializing S3 client for bucket: ${bucketName}...`);

const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  }
});

const corsRules = {
  Bucket: bucketName,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
        AllowedOrigins: ["*"], // Allows all domains, critical for mobile web / local web client.
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3000
      }
    ]
  }
};

async function setCors() {
  try {
    const command = new PutBucketCorsCommand(corsRules);
    const response = await s3.send(command);
    console.log("S3 CORS Configuration successfully updated:", response);
  } catch (error) {
    console.error("Error setting S3 CORS configuration:", error);
    process.exit(1);
  }
}

setCors();
