import type { Request } from 'express';

export interface AuthRequest extends Request {
    userIdentifier?: string;
    file?: any;
    files?: any;
    user?: any;
}

// Categories that require privacy obfuscation for the reporter
export const SENSITIVE_CATEGORIES = ['Illegal Construction', 'Encroachment', 'Criminal Activity', 'Vandalism'];

export function obfuscateLocation(lon: number, lat: number) {
    // Add a random offset of ~15-30 meters (approx 0.0001 to 0.0003 degrees)
    const factor = 0.0002;
    const offsetLon = (Math.random() - 0.5) * factor;
    const offsetLat = (Math.random() - 0.5) * factor;
    return [lon + offsetLon, lat + offsetLat];
}

export function getS3KeyFromUrl(url: string, bucketName: string): string {
    if (!url) return '';
    const cleanUrl = url.split('?')[0] || '';
    if (cleanUrl.includes(bucketName)) {
        if (cleanUrl.includes(`/${bucketName}/`)) {
            const parts = cleanUrl.split(`/${bucketName}/`);
            if (parts.length > 1 && parts[1]) {
                return parts[1];
            }
        }
        const bucketIndex = cleanUrl.indexOf(bucketName);
        const firstSlashAfterBucket = cleanUrl.indexOf('/', bucketIndex);
        if (firstSlashAfterBucket !== -1) {
            return cleanUrl.substring(firstSlashAfterBucket + 1);
        }
    }
    return cleanUrl;
}
