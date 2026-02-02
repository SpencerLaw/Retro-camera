import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 学霸成长计划 - 学生/客户端接口
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    const { action, token, data } = request.body;

    if (!token) return response.status(401).json({ success: false, message: '未授权' });

    try {
        const decodedToken = Buffer.from(token, 'base64').toString();
        if (!decodedToken.startsWith('child:')) {
            return response.status(403).json({ success: false, message: '权限不足' });
        }
        const childId = decodedToken.split(':')[1];
        const parentCode = decodedToken.split(':')[2]; // 如果 token 中没有，我们可以通过反查 room 映射（见后文）
        const parentKey = `kp:parent:${parentCode}`;

        const today = new Date().toISOString().split('T')[0];

        if (action === 'get_today_data') {
            const config: any = await kv.get(parentKey) || { children: [] };
            const childData = config.children.find((c: any) => c.id === childId) || {};

            const tasks = await kv.get(`kp:child:${childId}:tasks:${today}`) || [];
            const checkins: string[] = await kv.get(`kp:child:${childId}:checkins:${today}`) || [];

            // 聚合对象中已包含 streak, points, rewards
            const { streak = 0, points = 0, rewards = [], name = '宝贝', avatar = '' } = childData;

            return response.status(200).json({
                success: true,
                data: {
                    tasks,
                    checkins,
                    rewards,
                    streak,
                    points,
                    profile: { name, avatar }
                }
            });
        }

        if (action === 'toggle_checkin') {
            const { taskId } = data;
            const config: any = await kv.get(parentKey);
            const childIdx = config?.children?.findIndex((c: any) => c.id === childId);

            if (childIdx === -1) return response.status(404).json({ success: false, message: '孩子不存在' });

            const tasks: any[] = await kv.get(`kp:child:${childId}:tasks:${today}`) || [];
            const checkinKey = `kp:child:${childId}:checkins:${today}`;

            let currentCheckins: string[] = (await kv.get(checkinKey)) || [];
            let currentPoints: number = config.children[childIdx].points || 0;

            const task = tasks.find(t => t.id === taskId);
            const pointsDelta = task ? task.points : 0;

            if (currentCheckins.includes(taskId)) {
                currentCheckins = currentCheckins.filter(id => id !== taskId);
                currentPoints = Math.max(0, currentPoints - pointsDelta);
            } else {
                currentCheckins.push(taskId);
                currentPoints += pointsDelta;
            }

            // 更新 checkins (按天存储)
            await kv.set(checkinKey, currentCheckins);

            // 更新聚合中的 points
            config.children[childIdx].points = currentPoints;
            await kv.set(parentKey, config);

            return response.status(200).json({ success: true, checkins: currentCheckins, points: currentPoints });
        }

        return response.status(400).json({ success: false, message: '无效的操作' });

    } catch (error: any) {
        console.error('Client API Error:', error);
        return response.status(500).json({ success: false, message: '操作失败: ' + error.message });
    }
}
