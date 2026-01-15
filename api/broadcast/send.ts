import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 班级广播发送接口 (授权隔离版)
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { code, text, isEmergency, license } = request.body;

    if (!license) {
        return response.status(401).json({ error: '未提供有效的授权码' });
    }

    if (!code || !text) {
        return response.status(400).json({ error: '房间码和消息内容不能为空' });
    }

    try {
        // 简单的安全性：只取授权码前8位或哈希，避免直接在 Key 中暴露全码
        const licPrefix = license.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
        const messageId = Date.now().toString();

        const messageData = {
            id: messageId,
            text,
            isEmergency: !!isEmergency,
            timestamp: messageId,
        };

        // 格式: br:lic:{授权码前缀}:rm:{房间码}:act
        const key = `br:lic:${licPrefix}:rm:${code.toUpperCase()}:act`;
        await kv.set(key, messageData, { ex: 60 });

        return response.status(200).json({ success: true, messageId });
    } catch (error: any) {
        console.error('Send error:', error);
        return response.status(500).json({ error: '发送失败: ' + error.message });
    }
}
