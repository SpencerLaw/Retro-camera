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
        const { filename, contentType, token } = request.query as { filename: string; contentType: string; token: string };

        if (!token) return response.status(401).json({ success: false, message: '未授权' });

        // Simple check to ensure token is valid format
        try {
            const decodedToken = Buffer.from(token, 'base64').toString();
            if (!decodedToken.includes(':')) throw new Error();
        } catch (e) {
            return response.status(401).json({ success: false, message: '无效授权' });
        }
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
