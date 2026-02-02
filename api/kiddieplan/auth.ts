import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 学霸成长计划 - 授权验证接口
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    const { action, code } = request.body;

    if (!code) {
        return response.status(400).json({ success: false, message: '验证码不能为空' });
    }

    try {
        const cleanCode = code.toUpperCase().trim();

        // 1. 家长端验证 (以 DK_ 开头的环境变量)
        if (action === 'parent_auth') {
            const validCodes = Object.entries(process.env)
                .filter(([key]) => key.startsWith('DK_'))
                .map(([_, value]) => value?.toUpperCase());

            if (validCodes.includes(cleanCode)) {
                return response.status(200).json({
                    success: true,
                    role: 'parent',
                    token: Buffer.from(`parent:${cleanCode}`).toString('base64')
                });
            }
            return response.status(401).json({ success: false, message: '家长授权码无效' });
        }

        // 2. 孩子端验证 (4位房间码)
        if (action === 'child_auth') {
            if (cleanCode.length !== 4) {
                return response.status(400).json({ success: false, message: '请输入4位房间码' });
            }

            // 从 KV 中查找该房间码关联的孩子信息
            const roomData = await kv.get<{ childId: string, parentCode: string }>(`kp:room:${cleanCode}`);

            if (roomData) {
                const childInfo = await kv.get(`kp:child:${roomData.childId}`);
                return response.status(200).json({
                    success: true,
                    role: 'child',
                    child: childInfo,
                    token: Buffer.from(`child:${roomData.childId}`).toString('base64')
                });
            }
            return response.status(404).json({ success: false, message: '未找到该房间，请检查房间码是否正确' });
        }

        return response.status(400).json({ success: false, message: '无效的操作类型' });

    } catch (error: any) {
        console.error('Auth API Error:', error);
        return response.status(500).json({ success: false, message: '服务器繁忙: ' + error.message });
    }
}
