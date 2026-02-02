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
        if (!decodedToken.startsWith('parent:')) {
            return response.status(403).json({ success: false, message: '权限不足' });
        }
        const parentCode = decodedToken.split(':')[1];

        // 1. 获取/创建家长名下的孩子列表
        const parentKey = `kp:parent:${parentCode}`;

        if (action === 'get_config') {
            const config = await kv.get(parentKey) || { children: [] };
            return response.status(200).json({ success: true, data: config });
        }

        if (action === 'save_child') {
            const { id, name, avatar, roomCode } = data;
            const config: any = await kv.get(parentKey) || { children: [] };

            const existingChildIdx = config.children.findIndex((c: any) => c.id === id);
            const childId = id || `c_${Date.now()}`;

            // 获取可能存在的旧点数和成就（兼容旧版本）
            const oldPoints = await kv.get(`kp:child:${childId}:points`) || 0;
            const oldStreak = await kv.get(`kp:child:${childId}:streak`) || 0;
            const oldRewards = await kv.get(`kp:child:${childId}:rewards`) || [];

            const newChild = {
                id: childId,
                name,
                avatar,
                roomCode,
                points: oldPoints, // 迁移数据入聚合对象
                streak: oldStreak,
                rewards: oldRewards
            };

            if (existingChildIdx > -1) {
                const oldRoomCode = config.children[existingChildIdx].roomCode;
                if (oldRoomCode !== roomCode) {
                    const roomInfo: any = await kv.hget('kp:rooms', roomCode);
                    if (roomInfo) return response.status(400).json({ success: false, message: '该房间码已被占用' });
                    await kv.hdel('kp:rooms', oldRoomCode);
                }
                // 保留聚合后的属性
                newChild.points = config.children[existingChildIdx].points ?? oldPoints;
                newChild.streak = config.children[existingChildIdx].streak ?? oldStreak;
                newChild.rewards = config.children[existingChildIdx].rewards ?? oldRewards;
                config.children[existingChildIdx] = newChild;
            } else {
                if (config.children.length >= 3) {
                    return response.status(400).json({ success: false, message: '最多只能添加3个孩子' });
                }
                const roomInfo: any = await kv.hget('kp:rooms', roomCode);
                if (roomInfo) return response.status(400).json({ success: false, message: '该房间码已被占用' });
                config.children.push(newChild);
            }

            // 更新聚合映射：使用 Hash 存储所有房间映射
            await kv.hset('kp:rooms', { [roomCode]: `${parentCode}:${childId}` });
            await kv.set(parentKey, config);

            // 清理旧的离散 Key (异步，不阻塞主流程)
            kv.del(`kp:room:${roomCode}`).catch(() => { });
            kv.del(`kp:child:${childId}`).catch(() => { });

            return response.status(200).json({ success: true, data: config });
        }

        if (action === 'publish_tasks') {
            const { childId, tasks, date } = data;
            const taskKey = `kp:child:${childId}:tasks:${date}`;
            await kv.set(taskKey, tasks);
            return response.status(200).json({ success: true, message: '任务发布成功' });
        }

        if (action === 'save_rewards') {
            const { childId, rewards } = data;
            const config: any = await kv.get(parentKey) || { children: [] };
            const idx = config.children.findIndex((c: any) => c.id === childId);
            if (idx > -1) {
                config.children[idx].rewards = rewards;
                await kv.set(parentKey, config);
            }
            return response.status(200).json({ success: true, message: '奖励规则已保存' });
        }

        if (action === 'get_rewards') {
            const { childId } = data;
            const config: any = await kv.get(parentKey) || { children: [] };
            const child = config.children.find((c: any) => c.id === childId);
            return response.status(200).json({ success: true, data: { rewards: child?.rewards || [] } });
        }

        return response.status(400).json({ success: false, message: '无效的操作' });

    } catch (error: any) {
        console.error('Manage API Error:', error);
        return response.status(500).json({ success: false, message: '操作失败: ' + error.message });
    }
}
