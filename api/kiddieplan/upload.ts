import { put } from '@vercel/blob';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 星梦奇旅 - 孩子头像上传接口
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { filename, contentType } = request.query as { filename: string; contentType: string };
        const blob = await put(filename || 'avatar.webp', request, {
            contentType: contentType || 'image/webp',
            access: 'public',
        });

        return response.status(200).json({ success: true, url: blob.url });
    } catch (error: any) {
        console.error('Upload API Error:', error);
        return response.status(500).json({ success: false, message: '上传失败: ' + error.message });
    }
}
