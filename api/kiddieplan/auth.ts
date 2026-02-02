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

        // 1. 家长端验证
        if (action === 'parent_auth') {
            // 兼容性检查：支持旧的 DK_ 环境变量
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

            // 新版检查：如果是 XXDK 开头，集成到授权码系统
            if (cleanCode.startsWith('XXDK')) {
                // 转发到 verify-license 逻辑
                const baseUrl = request.headers.origin || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
                const res = await fetch(`${baseUrl}/api/verify-license`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        licenseCode: cleanCode,
                        deviceId: request.body.deviceId || 'legacy-web',
                        deviceInfo: request.body.deviceInfo || 'Parent Device',
                        action: 'verify'
                    })
                });
                const result = await res.json();
                if (result.success) {
                    return response.status(200).json({
                        success: true,
                        role: 'parent',
                        token: Buffer.from(`parent:${cleanCode}`).toString('base64')
                    });
                }
                return response.status(401).json({ success: false, message: result.message || '授权码验证失败' });
            }

            return response.status(401).json({ success: false, message: '家长授权码无效 (须以 XXDK 开头)' });
        }

        // 2. 孩子端验证 (4位房间码)
        if (action === 'child_auth') {
            if (cleanCode.length !== 4) {
                return response.status(400).json({ success: false, message: '请输入4位房间码' });
            }

            // 优先从新的全局授权索引查找
            let roomDataString: any = await kv.hget('license:registry', cleanCode);

            // 兼容性回退：如果索引中没找到，尝试旧的索引
            if (!roomDataString) {
                roomDataString = await kv.hget('kp:rooms', cleanCode);
            }

            if (roomDataString) {
                const [licenseCode, childId] = roomDataString.split(':');
                const licenseKey = `license:${licenseCode}`;

                // 从授权对象中获取孩子完整画像
                const license: any = await kv.get(licenseKey);
                const childInfo = license?.children?.find((c: any) => c.id === childId);

                if (childInfo) {
                    return response.status(200).json({
                        success: true,
                        role: 'child',
                        child: childInfo,
                        // Token 增强：包含 licenseCode 以便 Client 直接定位授权 Key
                        token: Buffer.from(`child:${childId}:${licenseCode}`).toString('base64')
                    });
                }
            }
            return response.status(404).json({ success: false, message: '未找到该房间，请检查房间码是否正确' });
        }

        return response.status(400).json({ success: false, message: '无效的操作类型' });

    } catch (error: any) {
        console.error('Auth API Error:', error);
        return response.status(500).json({ success: false, message: '服务器繁忙: ' + error.message });
    }
}
