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
        const rawLicenseCode = decodedToken.split(':')[2];
        const licenseCode = rawLicenseCode.replace(/[-\s]/g, '').toUpperCase();
        const licenseKey = `license:${licenseCode}`;

        const today = data?.date || new Date().toISOString().split('T')[0];

        if (action === 'get_today_data') {
            const license: any = await kv.get(licenseKey) || { children: [], progress: {} };
            const childData = license.children.find((c: any) => c.id === childId) || {};
            let modified = false;

            // 自动清理过期挂起的专注状态 (防止设备断电或关机后状态一直卡住)
            const now = Date.now();
            if (childData.isFocusing) {
                if (!childData.focusStartTime || (now - childData.focusStartTime > 12 * 60 * 60 * 1000)) {
                    childData.isFocusing = false;
                    childData.currentTaskName = null;
                    childData.lastFocusDuration = 0;
                    childData.focusStartTime = null;
                    modified = true;
                }
            }

            if (modified) {
                await kv.set(licenseKey, license);
            }

            // 从聚合对象中读取记录
            const dailyData = license.progress?.[today]?.[childId] || { tasks: [], checkins: [] };
            const { streak = 0, points = 0, rewards = [], name = '宝贝', avatar = '' } = childData;

            // 获取该孩子的核销日志
            const redemptionLogs = (license.redemptionLogs || []).filter((l: any) => l.childId === childId);

            // 对 focusLogs 按 taskId 去重合并（兼容历史脏数据）
            const rawLogs: any[] = dailyData.focusLogs || [];
            const mergedLogsMap: Record<string, any> = {};
            const silentLogs: any[] = [];

            for (const log of rawLogs) {
                if (log.type === 'silent') {
                    silentLogs.push(log);
                    continue;
                }
                const key = log.taskId || log.taskTitle || '_unknown';
                if (!mergedLogsMap[key]) {
                    mergedLogsMap[key] = { ...log };
                } else {
                    const ex = mergedLogsMap[key];
                    const exStart = ex.startTime ? new Date(ex.startTime).getTime() : Infinity;
                    const newStart = log.startTime ? new Date(log.startTime).getTime() : Infinity;
                    const exEnd = ex.endTime ? new Date(ex.endTime).getTime() : 0;
                    const newEnd = log.endTime ? new Date(log.endTime).getTime() : 0;
                    mergedLogsMap[key] = {
                        ...ex,
                        startTime: newStart < exStart ? log.startTime : ex.startTime,
                        endTime: newEnd > exEnd ? log.endTime : ex.endTime,
                        duration: (ex.duration || 0) + (log.duration || 0),
                    };
                }
            }
            const focusLogs = [...Object.values(mergedLogsMap), ...silentLogs];

            return response.status(200).json({
                success: true,
                data: {
                    tasks: dailyData.tasks,
                    checkins: dailyData.checkins,
                    focusLogs,
                    isFocusing: childData.isFocusing || false,
                    currentTaskName: childData.currentTaskName || null,
                    lastFocusDuration: childData.lastFocusDuration || 0,
                    rewards,
                    redemptionLogs,
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
                // 必须深拷贝当前的任务快照，否则 checkin 无法找到分母
                const currentTasks = license.children[childIdx].tasks || [];
                license.progress[today][childId] = {
                    tasks: currentTasks,
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

                // Remove silent completion log if it exists
                if (daily.focusLogs) {
                    daily.focusLogs = daily.focusLogs.filter((log: any) =>
                        !(log.taskTitle === task.title && log.type === 'silent')
                    );
                }
            } else {
                daily.checkins.push(taskId);
                currentPoints += pointsDelta;

                // Add silent completion log
                if (!daily.focusLogs) daily.focusLogs = [];
                daily.focusLogs.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    startTime: new Date().toISOString(),
                    endTime: new Date().toISOString(),
                    duration: 0,
                    type: 'silent'
                });
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

            // 合并同一任务的专注日志（同一任务只保留一条记录）
            // 保留最早开始时间、最晚结束时间、累计时长
            const existingIdx = daily.focusLogs.findIndex(
                (l: any) => l.taskId === log.taskId && l.type !== 'silent'
            );

            if (existingIdx > -1) {
                // Merge into existing entry
                const existing = daily.focusLogs[existingIdx];
                const existingStart = existing.startTime ? new Date(existing.startTime).getTime() : Infinity;
                const newStart = log.startTime ? new Date(log.startTime).getTime() : Infinity;
                const existingEnd = existing.endTime ? new Date(existing.endTime).getTime() : 0;
                const newEnd = log.endTime ? new Date(log.endTime).getTime() : 0;

                daily.focusLogs[existingIdx] = {
                    ...existing,
                    startTime: newStart < existingStart ? log.startTime : existing.startTime,
                    endTime: newEnd > existingEnd ? log.endTime : existing.endTime,
                    duration: (existing.duration || 0) + (log.duration || 0),
                    updatedAt: new Date().toISOString()
                };
            } else {
                // No existing entry for this task - create a fresh one
                daily.focusLogs.push({
                    ...log,
                    recordedAt: new Date().toISOString()
                });
            }

            // 同时累加到具体任务的 accumulatedTime 字段上，方便统计分析展示
            if (daily.tasks) {
                const taskIdx = daily.tasks.findIndex((t: any) => t.id === log.taskId);
                if (taskIdx > -1) {
                    const currentTotal = daily.tasks[taskIdx].accumulatedTime || 0;
                    daily.tasks[taskIdx].accumulatedTime = currentTotal + log.duration;
                }
            }

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, message: '专注日志已更新' });
        }

        if (action === 'update_focus_status') {
            const { isFocusing, taskTitle, duration, startTime, accumulatedTime, taskId } = data;
            const license: any = await kv.get(licenseKey);
            if (!license) return response.status(404).json({ success: false, message: '未找到授权许可' });

            const childIdx = license.children.findIndex((c: any) => c.id === childId);
            if (childIdx > -1) {
                license.children[childIdx].isFocusing = isFocusing;
                license.children[childIdx].currentTaskName = isFocusing ? taskTitle : null;
                // 不再实时记录最后时长和累计时间到主对象，减少同步开销和前端显示干扰
                license.children[childIdx].lastFocusDuration = 0; 

                // 记录专注开始时间，用于判断是否过期
                if (isFocusing) {
                    license.children[childIdx].focusStartTime = startTime || Date.now();
                } else {
                    license.children[childIdx].focusStartTime = null;
                }

                await kv.set(licenseKey, license);
            }
            return response.status(200).json({ success: true });
        }

        if (action === 'redeem_reward') {
            const { rewardId, rewardName, cost } = data;
            const license: any = await kv.get(licenseKey);
            if (!license) return response.status(404).json({ success: false, message: '未找到授权许可' });

            const childIdx = license.children.findIndex((c: any) => c.id === childId);
            if (childIdx === -1) return response.status(404).json({ success: false, message: '孩子不存在' });

            const currentPoints = license.children[childIdx].points || 0;
            if (currentPoints < cost) {
                return response.status(400).json({ success: false, message: '糖果不足' });
            }

            // [Refactor] 不再立即扣除糖果，改为提交申请，等待家长审批
            // 糖果扣除由 manage.ts 的 approve_redemption 处理

            // 记录申请日志
            if (!license.redemptionLogs) license.redemptionLogs = [];

            const newLog = {
                id: `log_${Date.now()}`,
                childId,
                rewardName: rewardName || '未知奖励',
                pointsCost: cost,
                remainingPoints: currentPoints, // 这里显示的是申请时的点数
                redeemedAt: new Date().toISOString(),
                status: 'pending' // 初始状态为待审批
            };

            license.redemptionLogs.unshift(newLog); // 最新的在前面
            // 限制日志数量
            if (license.redemptionLogs.length > 100) {
                license.redemptionLogs = license.redemptionLogs.slice(0, 100);
            }

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, message: '申请已发送，请等待家长审批哦 ~' });
        }

        return response.status(400).json({ success: false, message: '无效的操作' });

    } catch (error: any) {
        console.error('Client API Error:', error);
        return response.status(500).json({ success: false, message: '操作失败: ' + error.message });
    }
}
