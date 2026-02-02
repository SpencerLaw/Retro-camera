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
            const newChild = { id: id || `c_${Date.now()}`, name, avatar, roomCode };

            if (existingChildIdx > -1) {
                // 检查房间码是否被修改且是否冲突
                const oldRoomCode = config.children[existingChildIdx].roomCode;
                if (oldRoomCode !== roomCode) {
                    const isTaken = await kv.get(`kp:room:${roomCode}`);
                    if (isTaken) return response.status(400).json({ success: false, message: '该房间码已被占用' });
                    await kv.del(`kp:room:${oldRoomCode}`);
                }
                config.children[existingChildIdx] = newChild;
            } else {
                if (config.children.length >= 3) {
                    return response.status(400).json({ success: false, message: '最多只能添加3个孩子' });
                }
                const isTaken = await kv.get(`kp:room:${roomCode}`);
                if (isTaken) return response.status(400).json({ success: false, message: '该房间码已被占用' });
                config.children.push(newChild);
            }

            // 更新映射
            await kv.set(`kp:room:${roomCode}`, { childId: newChild.id, parentCode });
            await kv.set(`kp:child:${newChild.id}`, newChild);
            await kv.set(parentKey, config);

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
            const rewardKey = `kp:child:${childId}:rewards`;
            await kv.set(rewardKey, rewards);
            return response.status(200).json({ success: true, message: '奖励规则已保存' });
        }

        return response.status(400).json({ success: false, message: '无效的操作' });

    } catch (error: any) {
        console.error('Manage API Error:', error);
        return response.status(500).json({ success: false, message: '操作失败: ' + error.message });
    }
}
