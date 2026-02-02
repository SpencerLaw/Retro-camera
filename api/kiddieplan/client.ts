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

        const today = new Date().toISOString().split('T')[0];

        if (action === 'get_today_data') {
            const tasks = await kv.get(`kp:child:${childId}:tasks:${today}`) || [];
            const checkins: string[] = await kv.get(`kp:child:${childId}:checkins:${today}`) || [];
            const rewards = await kv.get(`kp:child:${childId}:rewards`) || [];
            const streak = await kv.get(`kp:child:${childId}:streak`) || 0;
            const points = await kv.get(`kp:child:${childId}:points`) || 0;

            return response.status(200).json({
                success: true,
                data: { tasks, checkins, rewards, streak, points }
            });
        }

        if (action === 'toggle_checkin') {
            const { taskId } = data;
            const tasks: any[] = await kv.get(`kp:child:${childId}:tasks:${today}`) || [];
            const checkinKey = `kp:child:${childId}:checkins:${today}`;
            const pointsKey = `kp:child:${childId}:points`;

            let currentCheckins: string[] = (await kv.get(checkinKey)) || [];
            let currentPoints: number = (await kv.get(pointsKey)) || 0;

            const task = tasks.find(t => t.id === taskId);
            const pointsDelta = task ? task.points : 0;

            if (currentCheckins.includes(taskId)) {
                currentCheckins = currentCheckins.filter(id => id !== taskId);
                currentPoints = Math.max(0, currentPoints - pointsDelta);
            } else {
                currentCheckins.push(taskId);
                currentPoints += pointsDelta;
            }

            await kv.set(checkinKey, currentCheckins);
            await kv.set(pointsKey, currentPoints);

            return response.status(200).json({ success: true, checkins: currentCheckins, points: currentPoints });
        }

        return response.status(400).json({ success: false, message: '无效的操作' });

    } catch (error: any) {
        console.error('Client API Error:', error);
        return response.status(500).json({ success: false, message: '操作失败: ' + error.message });
    }
}
