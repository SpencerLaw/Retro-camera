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
        const licenseCode = decodedToken.split(':')[2];
        const licenseKey = `license:${licenseCode}`;

        const today = data?.date || new Date().toISOString().split('T')[0];

        if (action === 'get_today_data') {
            const license: any = await kv.get(licenseKey) || { children: [], progress: {} };
            const childData = license.children.find((c: any) => c.id === childId) || {};

            // 从聚合对象中读取记录
            const dailyData = license.progress?.[today]?.[childId] || { tasks: [], checkins: [] };
            const { streak = 0, points = 0, rewards = [], name = '宝贝', avatar = '' } = childData;

            return response.status(200).json({
                success: true,
                data: {
                    tasks: dailyData.tasks,
                    checkins: dailyData.checkins,
                    focusLogs: dailyData.focusLogs || [],
                    rewards,
                    streak,
                    points,
                    profile: { name, avatar }
                }
            });
        }

        if (action === 'toggle_checkin') {
            const { taskId } = data;
            const license: any = await kv.get(licenseKey);
            if (!license) return response.status(404).json({ success: false, message: '未找到授权许可' });

            const childIdx = license.children.findIndex((c: any) => c.id === childId);
            if (childIdx === -1) return response.status(404).json({ success: false, message: '孩子不存在' });

            // 获取进度记录
            if (!license.progress) license.progress = {};
            if (!license.progress[today]) license.progress[today] = {};
            if (!license.progress[today][childId]) {
                // 可能是从旧任务列表初始化
                // 可能是从旧任务列表初始化
                license.progress[today][childId] = {
                    tasks: [],
                    checkins: []
                };
            }

            const daily = license.progress[today][childId];
            let currentPoints: number = license.children[childIdx].points || 0;

            const task = daily.tasks.find((t: any) => t.id === taskId);
            const pointsDelta = task ? task.points : 0;

            if (daily.checkins.includes(taskId)) {
                daily.checkins = daily.checkins.filter((id: string) => id !== taskId);
                currentPoints = Math.max(0, currentPoints - pointsDelta);
            } else {
                daily.checkins.push(taskId);
                currentPoints += pointsDelta;
            }

            // 更新点数
            license.children[childIdx].points = currentPoints;

            // 记录统计 (Stubs)
            if (!license.analytics) license.analytics = {};
            license.analytics[`stats:${today}:${childId}`] = {
                completed: daily.checkins.length,
                total: daily.tasks.length,
                points: currentPoints
            };

            await kv.set(licenseKey, license);

            return response.status(200).json({ success: true, checkins: daily.checkins, points: currentPoints });
        }

        if (action === 'record_focus') {
            const { log } = data; // { taskId, taskTitle, startTime, endTime, duration }
            const license: any = await kv.get(licenseKey);
            if (!license) return response.status(404).json({ success: false, message: '未找到授权许可' });

            if (!license.progress) license.progress = {};
            if (!license.progress[today]) license.progress[today] = {};
            if (!license.progress[today][childId]) {
                license.progress[today][childId] = { tasks: [], checkins: [], focusLogs: [] };
            }

            const daily = license.progress[today][childId];
            if (!daily.focusLogs) daily.focusLogs = [];
            daily.focusLogs.push({
                ...log,
                recordedAt: new Date().toISOString()
            });

            // 同时累加到具体任务的 accumulatedTime 字段上，方便展示
            if (daily.tasks) {
                const taskIdx = daily.tasks.findIndex((t: any) => t.id === log.taskId);
                if (taskIdx > -1) {
                    const currentTotal = daily.tasks[taskIdx].accumulatedTime || 0;
                    daily.tasks[taskIdx].accumulatedTime = currentTotal + log.duration;
                }
            }

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, message: '专注日志已归档' });
        }

        if (action === 'update_focus_status') {
            const { isFocusing, taskTitle, duration } = data;
            const license: any = await kv.get(licenseKey);
            if (!license) return response.status(404).json({ success: false, message: '未找到授权许可' });

            const childIdx = license.children.findIndex((c: any) => c.id === childId);
            if (childIdx > -1) {
                license.children[childIdx].isFocusing = isFocusing;
                license.children[childIdx].currentTaskName = isFocusing ? taskTitle : null;
                license.children[childIdx].lastFocusDuration = isFocusing ? duration : 0;
                await kv.set(licenseKey, license);
            }
            return response.status(200).json({ success: true });
        }

        return response.status(400).json({ success: false, message: '无效的操作' });

    } catch (error: any) {
        console.error('Client API Error:', error);
        return response.status(500).json({ success: false, message: '操作失败: ' + error.message });
    }
}
