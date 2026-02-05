import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 学霸成长计划 - 家长管理接口
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    const { action, token, data } = request.body;

    if (!token) return response.status(401).json({ success: false, message: '未授权' });

    try {
        const decodedToken = Buffer.from(token, 'base64').toString();
        const licenseCode = decodedToken.split(':')[1];

        // 1. 获取授权许可聚合对象
        const licenseKey = `license:${licenseCode}`;

        if (action === 'get_config') {
            const license = await kv.get(licenseKey) || { children: [], tasks: [], rewards: [], analytics: {}, progress: {} };
            return response.status(200).json({ success: true, data: license });
        }

        if (action === 'save_child') {
            const { id, name, avatar, roomCode } = data;
            const license: any = await kv.get(licenseKey) || { children: [], tasks: [], rewards: [], analytics: {}, progress: {} };

            const childId = id || `c_${Date.now()}`;
            const existingChildIdx = license.children.findIndex((c: any) => c.id === childId);
            const oldRoomCode = existingChildIdx > -1 ? license.children[existingChildIdx].roomCode : null;

            // 检查房间码冲突（遍历所有授权码）
            if (roomCode !== oldRoomCode) {
                const allKeys = await kv.keys('license:*');
                for (const key of allKeys) {
                    try {
                        const otherLicense: any = await kv.get(key);
                        if (!otherLicense?.children) continue;
                        const conflict = otherLicense.children.find((c: any) => c.roomCode === roomCode);
                        if (conflict) {
                            return response.status(400).json({ success: false, message: '该房间码已被占用' });
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            const newChild = {
                id: childId,
                name,
                avatar,
                roomCode,
                points: data.points || 0,
                streak: data.streak || 0,
                rewards: data.rewards || []
            };

            if (existingChildIdx > -1) {
                license.children[existingChildIdx] = { ...license.children[existingChildIdx], ...newChild };
            } else {
                if (license.children.length >= 3) {
                    return response.status(400).json({ success: false, message: '最多只能添加3个孩子' });
                }
                license.children.push(newChild);
            }

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, data: license });
        }

        if (action === 'publish_tasks') {
            const { childId, tasks, date } = data;
            const license: any = await kv.get(licenseKey) || { children: [], progress: {} };

            if (!license.progress) license.progress = {};
            if (!license.progress[date]) license.progress[date] = {};
            if (!license.progress[date][childId]) license.progress[date][childId] = { tasks: [], checkins: [] };

            // 更新该孩子在该日期的任务库，保留已有的打卡记录
            license.progress[date][childId].tasks = tasks;

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, message: '任务发布成功' });
        }

        if (action === 'save_rewards') {
            const { childId, rewards } = data;
            const license: any = await kv.get(licenseKey) || { children: [] };
            const idx = license.children.findIndex((c: any) => c.id === childId);
            if (idx > -1) {
                license.children[idx].rewards = rewards;
                await kv.set(licenseKey, license);
            }
            return response.status(200).json({ success: true, message: '奖励规则已保存' });
        }

        if (action === 'get_rewards') {
            const { childId } = data;
            const license: any = await kv.get(licenseKey) || { children: [] };
            const child = license.children.find((c: any) => c.id === childId);
            return response.status(200).json({ success: true, data: { rewards: child?.rewards || [] } });
        }

        return response.status(400).json({ success: false, message: '无效的操作' });

    } catch (error: any) {
        console.error('Manage API Error:', error);
        return response.status(500).json({ success: false, message: '操作失败: ' + error.message });
    }
}
