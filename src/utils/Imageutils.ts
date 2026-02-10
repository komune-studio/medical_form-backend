import axios from 'axios';

/**
 * Fetch image from URL and convert to base64
 * @param imageUrl - URL of the image to fetch
 * @returns Base64 string with data URI format (e.g., "data:image/jpeg;base64,...")
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
    try {
        // Fetch image as arraybuffer
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000, // 10 second timeout
        });

        // Get content type from response headers
        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        // Convert arraybuffer to base64
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        
        // Return as data URI
        return `data:${contentType};base64,${base64}`;
    } catch (error: any) {
        console.error(`Failed to fetch image from ${imageUrl}:`, error.message);
        return null;
    }
}

/**
 * Fetch multiple images concurrently and convert to base64
 * @param imageUrls - Array of image URLs
 * @returns Array of base64 strings (null for failed fetches)
 */
export async function fetchMultipleImagesAsBase64(imageUrls: string[]): Promise<(string | null)[]> {
    const promises = imageUrls.map(url => fetchImageAsBase64(url));
    return Promise.all(promises);
}

/**
 * Check if URL is valid image URL
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        
        return validExtensions.some(ext => pathname.endsWith(ext));
    } catch {
        return false;
    }
}