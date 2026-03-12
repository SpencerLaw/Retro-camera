import { kv } from '@vercel/kv';
import { del } from '@vercel/blob';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 学霸成长计划 - 家长管理接口
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    const { action, token, data } = request.body;

    // 默认分类配置
    const DEFAULT_CATEGORIES = [
        { id: 'study', name: '自主学习', icon: '📚' },
        { id: 'morning', name: '晨间习惯', icon: '☀️' },
        { id: 'evening', name: '晚间习惯', icon: '🌙' },
        { id: 'sports', name: '运动健康', icon: '🏃' },
        { id: 'discipline', name: '自律管理', icon: '🎯' },
        { id: 'chores', name: '劳动技能', icon: '🧹' },
        { id: 'hygiene', name: '个人卫生', icon: '🧼' },
        { id: 'creativity', name: '创意艺术', icon: '🎨' },
        { id: 'other', name: '自定义', icon: '✨' }
    ];

    if (!token) return response.status(401).json({ success: false, message: '未授权' });

    try {
        const decodedToken = Buffer.from(token, 'base64').toString();
        const rawLicenseCode = decodedToken.split(':')[1];
        const licenseCode = rawLicenseCode.replace(/[-\s]/g, '').toUpperCase();

        // 1. 获取授权许可聚合对象
        const licenseKey = `license:${licenseCode}`;

        if (action === 'get_config') {
            let license: any = await kv.get(licenseKey) || { children: [], tasks: [], rewards: [], analytics: {}, progress: {} };

            // 临时数据迁移：将旧的带横杠的数据合并到新 Key 中
            if (rawLicenseCode !== licenseCode && (!license.children || license.children.length === 0)) {
                const oldLicenseKey = `license:${rawLicenseCode}`;
                const oldLicense: any = await kv.get(oldLicenseKey);
                if (oldLicense && oldLicense.children && oldLicense.children.length > 0) {
                    // 合并旧数据
                    license = { ...license, ...oldLicense };
                    license.code = licenseCode; // 修正 code 字段
                    await kv.set(licenseKey, license);
                    // 彻底删除旧的带横杠 Key，以防在控制台继续显示
                    await kv.del(oldLicenseKey);
                }
            }

            let modified = false;

            // 检查过期挂起的专注状态 (防止因为孩子端断电导致家长端一直看到“正在进行”)
            const now = Date.now();
            if (license.children && license.children.length > 0) {
                license.children.forEach((child: any) => {
                    if (child.isFocusing) {
                        if (!child.focusStartTime || (now - child.focusStartTime > 12 * 60 * 60 * 1000)) {
                            child.isFocusing = false;
                            child.currentTaskName = null;
                            child.lastFocusDuration = 0;
                            child.focusStartTime = null;
                            modified = true;
                        }
                    }
                });
            }

            // 初始化默认分类
            if (!license.categories || license.categories.length === 0) {
                license.categories = DEFAULT_CATEGORIES;
                modified = true;
            }

            if (modified) {
                await kv.set(licenseKey, license);
            }

            // 对今日数据进行实时去重合并，确保前端拿到的数据是干净的
            const today = new Date().toISOString().split('T')[0];
            if (license.progress && license.progress[today]) {
                const dayProgress = license.progress[today];
                for (const childId of Object.keys(dayProgress)) {
                    const childData = dayProgress[childId];
                    if (childData.focusLogs && childData.focusLogs.length > 1) {
                        const mergedMap: Record<string, any> = {};
                        const silents: any[] = [];
                        for (const log of childData.focusLogs) {
                            if (log.type === 'silent') { silents.push(log); continue; }
                            const key = log.taskId || log.taskTitle || '_unknown';
                            if (!mergedMap[key]) {
                                mergedMap[key] = { ...log };
                            } else {
                                const ex = mergedMap[key];
                                const exS = ex.startTime ? new Date(ex.startTime).getTime() : Infinity;
                                const newS = log.startTime ? new Date(log.startTime).getTime() : Infinity;
                                const exE = ex.endTime ? new Date(ex.endTime).getTime() : 0;
                                const newE = log.endTime ? new Date(log.endTime).getTime() : 0;
                                mergedMap[key] = {
                                    ...ex,
                                    startTime: newS < exS ? log.startTime : ex.startTime,
                                    endTime: newE > exE ? log.endTime : ex.endTime,
                                    duration: (ex.duration || 0) + (log.duration || 0),
                                };
                            }
                        }
                        childData.focusLogs = [...Object.values(mergedMap), ...silents];
                    }
                }
            }

            return response.status(200).json({ success: true, data: license });
        }

        if (action === 'save_child') {
            const { id, name, avatar, roomCode } = data;
            const license: any = await kv.get(licenseKey) || {};
            if (!license.children) license.children = [];

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
                // If avatar is changing, delete old one to prevent orphans
                const oldAvatar = license.children[existingChildIdx].avatar;
                if (oldAvatar && oldAvatar !== avatar && oldAvatar.includes('public.blob.vercel-storage.com')) {
                    try { await del(oldAvatar); } catch (e) { console.error('Delete old avatar failed', e); }
                }
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

        if (action === 'remove_child') {
            const { childId } = request.body;
            const license: any = await kv.get(licenseKey) || { children: [], progress: {} };

            const childToDelete = license.children.find((c: any) => c.id === childId);
            if (childToDelete) {
                // 1. Physically delete avatar from Vercel Blob
                if (childToDelete.avatar && childToDelete.avatar.includes('public.blob.vercel-storage.com')) {
                    try {
                        await del(childToDelete.avatar);
                    } catch (e) {
                        console.error('Failed to delete child avatar from blob', e);
                    }
                }

                // 2. Remove child from children list
                license.children = license.children.filter((c: any) => c.id !== childId);

                // 3. Cleanup progress data for today if exists
                const today = new Date().toISOString().split('T')[0];
                if (license.progress?.[today]?.[childId]) {
                    delete license.progress[today][childId];
                }

                await kv.set(licenseKey, license);
            }

            return response.status(200).json({ success: true, data: license });
        }

        if (action === 'publish_tasks') {
            const { childId, tasks, date } = data;
            const license: any = await kv.get(licenseKey) || { children: [], progress: {} };

            if (!license.progress) license.progress = {};
            if (!license.progress[date]) license.progress[date] = {};
            if (!license.progress[date][childId]) license.progress[date][childId] = { tasks: [], checkins: [] };

            // 更新该孩子在该日期的任务库，保留已有的打卡记录和累计时间
            const existingTasks = license.progress[date][childId].tasks || [];
            license.progress[date][childId].tasks = tasks.map((newTask: any) => {
                const existing = existingTasks.find((et: any) => et.id === newTask.id || (et.title === newTask.title && et.timeSlot === newTask.timeSlot));
                if (existing) {
                    return {
                        ...newTask,
                        accumulatedTime: existing.accumulatedTime || 0,
                        completed: existing.completed || false
                    };
                }
                return newTask;
            });

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, message: '任务发布成功' });
        }

        if (action === 'save_rewards') {
            const { childId, rewards } = data;
            const license: any = await kv.get(licenseKey) || {};
            if (!license.children) license.children = [];
            const idx = license.children.findIndex((c: any) => c.id === childId);
            if (idx > -1) {
                license.children[idx].rewards = rewards;
                await kv.set(licenseKey, license);
            }
            return response.status(200).json({ success: true, message: '奖励规则已保存' });
        }

        if (action === 'get_rewards') {
            const { childId } = data;
            const license: any = await kv.get(licenseKey) || {};
            if (!license.children) license.children = [];
            const child = license.children.find((c: any) => c.id === childId);
            return response.status(200).json({ success: true, data: { rewards: child?.rewards || [] } });
        }

        if (action === 'save_categories') {
            const { categories, rewardCategories, hiddenPresets, hiddenRewardPresets } = data;
            const license: any = await kv.get(licenseKey) || {};
            if (!license.children) license.children = [];
            if (categories) license.categories = categories;
            if (rewardCategories) license.rewardCategories = rewardCategories;
            if (hiddenPresets !== undefined) license.hiddenPresets = hiddenPresets;
            if (hiddenRewardPresets !== undefined) license.hiddenRewardPresets = hiddenRewardPresets;
            await kv.set(licenseKey, license);
            return response.status(200).json({
                success: true,
                message: '设置已更新',
                data: {
                    categories: license.categories,
                    rewardCategories: license.rewardCategories,
                    hiddenPresets: license.hiddenPresets,
                    hiddenRewardPresets: license.hiddenRewardPresets
                }
            });
        }

        if (action === 'record_redemption') {
            const { childId, rewardName, pointsCost } = data;
            const license: any = await kv.get(licenseKey) || { children: [] };

            // 初始化 redemptionLogs
            if (!license.redemptionLogs) license.redemptionLogs = [];

            const newLog = {
                id: `log_${Date.now()}`,
                childId,
                rewardName,
                pointsCost,
                remainingPoints: data.remainingPoints || 0,
                redeemedAt: new Date().toISOString(),
                status: 'approved' // 家长端直接核销的视为已批准
            };

            license.redemptionLogs.unshift(newLog); // 最新的在前面
            // 限制日志数量，保留最近100条
            if (license.redemptionLogs.length > 100) {
                license.redemptionLogs = license.redemptionLogs.slice(0, 100);
            }

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, data: newLog });
        }

        if (action === 'approve_redemption') {
            const { logId } = data;
            const license: any = await kv.get(licenseKey);
            if (!license) return response.status(404).json({ success: false, message: '未找到授权许可' });

            if (!license.redemptionLogs) license.redemptionLogs = [];
            const logIdx = license.redemptionLogs.findIndex((l: any) => l.id === logId);
            if (logIdx === -1) return response.status(404).json({ success: false, message: '申请记录不存在' });

            const log = license.redemptionLogs[logIdx];
            if (log.status !== 'pending') return response.status(400).json({ success: false, message: '该记录已处理' });

            // 获取孩子并扣分
            const childIdx = license.children.findIndex((c: any) => c.id === log.childId);
            if (childIdx === -1) return response.status(404).json({ success: false, message: '孩子不存在' });

            const child = license.children[childIdx];
            if (child.points < log.pointsCost) {
                return response.status(400).json({ success: false, message: '孩子糖果不足，无法批准' });
            }

            // 扣分并更新状态
            child.points -= log.pointsCost;
            log.status = 'approved';
            log.remainingPoints = child.points; // 更新为扣分后的余额

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, message: '奖励已批准，糖果已扣除' });
        }

        if (action === 'reject_redemption') {
            const { logId } = data;
            const license: any = await kv.get(licenseKey);
            if (!license) return response.status(404).json({ success: false, message: '未找到授权许可' });

            if (!license.redemptionLogs) license.redemptionLogs = [];
            const logIdx = license.redemptionLogs.findIndex((l: any) => l.id === logId);
            if (logIdx === -1) return response.status(404).json({ success: false, message: '申请记录不存在' });

            const log = license.redemptionLogs[logIdx];
            if (log.status !== 'pending') return response.status(400).json({ success: false, message: '该记录已处理' });

            // 仅更新状态
            log.status = 'rejected';

            await kv.set(licenseKey, license);
            return response.status(200).json({ success: true, message: '申请已拒绝' });
        }

        if (action === 'get_redemption_history') {
            const { childId } = data;
            const license: any = await kv.get(licenseKey) || {};
            const logs = license.redemptionLogs || [];

            // 如果指定了 childId，则筛选
            const filteredLogs = childId
                ? logs.filter((l: any) => l.childId === childId)
                : logs;

            return response.status(200).json({ success: true, data: filteredLogs });
        }

        if (action === 'cleanup_focus_logs') {
            // 一次性清理：将所有 progress 中的 focusLogs 按 taskId 去重合并
            const license: any = await kv.get(licenseKey);
            if (!license) return response.status(404).json({ success: false, message: '未找到授权许可' });

            const progress = license.progress || {};
            let totalMerged = 0;

            const dedup = (rawLogs: any[]) => {
                const map: Record<string, any> = {};
                const silents: any[] = [];
                for (const log of rawLogs) {
                    if (log.type === 'silent') { silents.push(log); continue; }
                    const key = log.taskId || log.taskTitle || '_unknown';
                    if (!map[key]) {
                        map[key] = { ...log };
                    } else {
                        const ex = map[key];
                        const exS = ex.startTime ? new Date(ex.startTime).getTime() : Infinity;
                        const newS = log.startTime ? new Date(log.startTime).getTime() : Infinity;
                        const exE = ex.endTime ? new Date(ex.endTime).getTime() : 0;
                        const newE = log.endTime ? new Date(log.endTime).getTime() : 0;
                        map[key] = {
                            ...ex,
                            startTime: newS < exS ? log.startTime : ex.startTime,
                            endTime: newE > exE ? log.endTime : ex.endTime,
                            duration: (ex.duration || 0) + (log.duration || 0),
                        };
                        totalMerged++;
                    }
                }
                return [...Object.values(map), ...silents];
            };

            for (const dateKey of Object.keys(progress)) {
                for (const childId of Object.keys(progress[dateKey])) {
                    const dayData = progress[dateKey][childId];
                    if (dayData.focusLogs && dayData.focusLogs.length > 1) {
                        const before = dayData.focusLogs.length;
                        dayData.focusLogs = dedup(dayData.focusLogs);
                        const after = dayData.focusLogs.length;
                        totalMerged += before - after;
                    }
                }
            }

            license.progress = progress;
            await kv.set(licenseKey, license);

            return response.status(200).json({
                success: true,
                message: `清理完成，共合并了 ${totalMerged} 条重复专注记录`
            });
        }

        return response.status(400).json({ success: false, message: '无效的操作' });


    } catch (error: any) {
        console.error('Manage API Error:', error);
        return response.status(500).json({ success: false, message: '操作失败: ' + error.message });
    }
}
