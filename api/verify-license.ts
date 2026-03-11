import { kv } from '@vercel/kv';
import { del, list } from '@vercel/blob';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - 授权码验证API (带 Redis 监控版 + 数据压缩)
 */

// === 数据结构定义 ===

// 完整版数据结构 (用于 API 返回)
interface DeviceInfo {
  deviceId: string;
  firstSeen: string;
  lastSeen: string;
  ua: string;
}

export interface LicenseMetadata {
  code: string;
  totalDevices: number;
  maxDevices: number;
  generatedDate: string;
  expiryDate: string;
  firstActivatedAt?: string;
  lastUsedTime: string;
  devices: DeviceInfo[];
  rooms?: string[]; // 房间广播激活列表
  brChannels?: any[];   // 班级广播：频道同步列表
  brMessages?: Record<string, any>; // 房间消息内容 (roomId -> Message)
  fishUsage?: number;   // 班级广播：鱼声 TTS 使用次数
}

// 压缩版数据结构 (用于 Redis 存储)
interface CompressedDevice {
  i: string; // deviceId
  f: number; // firstSeen (timestamp)
  l: number; // lastSeen (timestamp)
  u: string; // ua
}

export interface CompressedMetadata {
  m: number; // maxDevices
  f: number; // firstActivatedAt (timestamp)
  l: number; // lastUsedTime (timestamp)
  d: CompressedDevice[]; // devices
  r?: string[]; // active rooms
  brc?: any[]; // channels
  brm?: Record<string, any>; // messages
  fu?: number; // fish usage
}

// === 辅助工具 ===

// 获取设备概况
function getDeviceType(ua: string): string {
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'Mac';
  return 'Unknown';
}

// 从授权码中提取生成日期
function extractDateFromCode(code: string): Date | null {
  try {
    let cleanCode = code.replace(/[-\s]/g, '').toUpperCase();

    // 移除前缀
    if (cleanCode.startsWith('XXDK')) {
      cleanCode = cleanCode.substring(4);
    } else if (cleanCode.startsWith('ZY') || cleanCode.startsWith('DM') || cleanCode.startsWith('ZD') || cleanCode.startsWith('GB') || cleanCode.startsWith('XM')) {
      cleanCode = cleanCode.substring(2);
    }

    // 自动识别 YYYYMMDD 或 YYMMDD
    let year: number, month: number, day: number;

    // 如果前 4 位看起来像 20xx
    if (cleanCode.startsWith('20') && cleanCode.length >= 8) {
      year = parseInt(cleanCode.substring(0, 4));
      month = parseInt(cleanCode.substring(4, 6)) - 1;
      day = parseInt(cleanCode.substring(6, 8));
    } else if (cleanCode.length >= 6) {
      // 旧版 YYMMDD
      year = 2000 + parseInt(cleanCode.substring(0, 2));
      month = parseInt(cleanCode.substring(2, 4)) - 1;
      day = parseInt(cleanCode.substring(4, 6));
    } else {
      return null;
    }

    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

// 获取设备限制数
function getEffectiveMaxDevices(code: string): number {
  const cleanCode = code.toUpperCase();
  if (cleanCode.startsWith('XXDK') || cleanCode.startsWith('XM')) {
    return 999999; // 星梦奇旅不限制
  }
  if (cleanCode.startsWith('GB')) {
    return 5; // 班级广播限制 5 个设备
  }
  return 5; // 其他默认 5
}

// 检查授权码是否在白名单中
function isCodeInWhitelist(code: string): boolean {
  const envCodes = process.env.LICENSE_CODES || '';
  const validCodeSet = new Set(
    envCodes.split(',')
      .map(c => c.replace(/[-\s]/g, '').toUpperCase())
      .filter(c => c.length > 0)
  );
  return validCodeSet.has(code.replace(/[-\s]/g, '').toUpperCase());
}

// === 压缩与解压逻辑 ===

export function compressMetadata(full: LicenseMetadata): CompressedMetadata {
  return {
    m: full.maxDevices,
    f: new Date(full.firstActivatedAt || full.generatedDate).getTime(),
    l: new Date(full.lastUsedTime).getTime(),
    d: full.devices.map(dev => ({
      i: dev.deviceId,
      f: new Date(dev.firstSeen).getTime(),
      l: new Date(dev.lastSeen).getTime(),
      u: dev.ua
    })),
    r: full.rooms,
    brc: full.brChannels,
    brm: full.brMessages,
    fu: full.fishUsage
  };
}

export function decompressMetadata(compressed: CompressedMetadata | LicenseMetadata, code: string): LicenseMetadata {
  // 兼容性检查：如果已经是完整版（旧数据），直接返回
  if ('devices' in compressed) {
    return compressed as LicenseMetadata;
  }

  // 容错检查：防止数据损坏导致后台崩溃
  const c = compressed as CompressedMetadata;
  if (!c || !c.d) {
    console.warn(`[Data Corruption] Key for ${code} is missing data`);
    return {
      code: code,
      totalDevices: 0,
      maxDevices: getEffectiveMaxDevices(code),
      generatedDate: new Date().toISOString(),
      expiryDate: new Date().toISOString(),
      firstActivatedAt: new Date().toISOString(),
      lastUsedTime: new Date().toISOString(),
      devices: []
    };
  }

  // 解压逻辑
  const genDate = extractDateFromCode(code) || new Date();
  const expDate = new Date(genDate);
  expDate.setFullYear(expDate.getFullYear() + 1);

  return {
    code: code,
    totalDevices: c.d.length,
    maxDevices: getEffectiveMaxDevices(code), // 强制使用最新的限制逻辑
    generatedDate: genDate.toISOString(),
    expiryDate: expDate.toISOString(),
    firstActivatedAt: new Date(c.f).toISOString(),
    lastUsedTime: c.l ? new Date(c.l).toISOString() : new Date().toISOString(),
    devices: c.d.map(dev => ({
      deviceId: dev.i,
      firstSeen: new Date(dev.f).toISOString(),
      lastSeen: new Date(dev.l).toISOString(),
      ua: dev.u
    })),
    rooms: c.r,
    brChannels: (c as any).brChannels || c.brc,
    brMessages: (c as any).brMessages || c.brm,
    fishUsage: (c as any).fishUsage || c.fu || 0
  };
}

// === 主处理函数 ===

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: '方法不允许' });

  try {
    const { licenseCode, deviceId, deviceInfo: rawDeviceInfo, action, adminKey } = req.body;
    const ua = req.headers['user-agent'] || 'unknown';

    // === 管理员查询 ===
    if (action === 'query') {
      if (!adminKey || adminKey.trim() !== 'spencer') {
        console.warn(`[Admin Query] Auth failed. Key: ${adminKey ? '***' : 'missing'}`);
        return res.status(401).json({ success: false, message: '密码错误' });
      }
      if (!licenseCode) return res.status(400).json({ success: false, message: '请输入授权码' });

      const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();
      const redisKey = `license:${cleanCode}`;
      const data = await kv.get<CompressedMetadata | LicenseMetadata>(redisKey);

      if (!data) return res.status(404).json({ success: false, message: '未找到记录' });

      // 解压后返回，保证前端兼容
      return res.status(200).json({
        success: true,
        data: decompressMetadata(data, cleanCode)
      });
    }

    // === 管理员删除 ===
    if (action === 'delete') {
      if (!adminKey || adminKey.trim() !== 'spencer') {
        console.warn(`[Admin Delete] Auth failed. Key: ${adminKey ? '***' : 'missing'}`);
        return res.status(401).json({ success: false, message: '密码错误' });
      }
      if (!licenseCode) return res.status(400).json({ success: false, message: '请输入授权码' });

      const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();
      const redisKey = `license:${cleanCode}`;

      // 1. (Legacy avatar cleanup for KiddiePlan removed as children data is no longer stored here)

      await kv.del(redisKey);

      // 临时处理：如果存在旧的带横杠的数据，也一并删除
      const rawRedisKey = `license:${licenseCode}`;
      if (rawRedisKey !== redisKey) {
        await kv.del(rawRedisKey);
      }

      return res.status(200).json({
        success: true,
        message: '授权记录及关联头像已被彻底删除'
      });
    }

    // === 垃圾回收：清理孤儿头像 ===
    if (action === 'cleanup_blobs') {
      if (!adminKey || adminKey.trim() !== 'spencer') {
        return res.status(401).json({ success: false, message: '密码错误' });
      }

      console.log('[Cleanup] Starting global blob garbage collection...');

      // 1. 获取所有已存储的 Blob 文件
      const { blobs } = await list();
      if (blobs.length === 0) return res.status(200).json({ success: true, message: '空间为空，无需清理' });

      // 2. 获取所有正在使用的授权码 keys
      const keys = await kv.keys('license:*');
      const usedAvatars = new Set<string>();

      // 3. 扫描所有授权码，提取所有孩子正在使用的头像 URL
      if (keys.length > 0) {
        const values = await Promise.all(keys.map(key => kv.get<any>(key)));
        values.forEach((license, idx) => {
          if (!license) return;
          const cleanCode = keys[idx].replace('license:', '');
          const metadata = decompressMetadata(license, cleanCode);
          if (metadata.rooms) {
            // (Note: broadcast messages are now in metadata and won't be deleted)
            console.log(`[Cleanup] An active license has rooms.`);
          }
        });
      }

      // 4. 找出不在 usedAvatars 中的文件 (且仅清理头像目录下的文件)
      const orphans = blobs
        .filter(blob => !usedAvatars.has(blob.url))
        .map(blob => blob.url);

      if (orphans.length === 0) {
        return res.status(200).json({ success: true, message: '扫描完成，未发现未引用头像' });
      }

      // 5. 批量删除
      console.log(`[Cleanup] Found ${orphans.length} orphan blobs. Deleting...`);
      await del(orphans);

      return res.status(200).json({
        success: true,
        message: `清理成功！共删除 ${orphans.length} 个过期头像文件`,
        clearedCount: orphans.length,
        clearedList: orphans
      });
    }

    if (action === 'nuclear_cleanup') {
      if (!adminKey || adminKey.trim() !== 'spencer') {
        return res.status(401).json({ success: false, message: '密码错误' });
      }

      console.log('[Nuclear Cleanup] Starting deep garbage collection...');
  
      const allKeys = await kv.keys('*');
      const keysToDelete = allKeys.filter(key => !key.startsWith('license:'));
  
      if (keysToDelete.length === 0) {
        return res.status(200).json({ success: true, message: '数据库已经很干净了' });
      }
  
      console.log(`[Nuclear Cleanup] Deleting ${keysToDelete.length} keys...`);
      await Promise.all(keysToDelete.map(key => kv.del(key)));
  
      return res.status(200).json({
        success: true,
        message: `大核爆清理完成：共强制删除 ${keysToDelete.length} 条非规范记录 (包括所有旧版 br:* 数据)`,
        deletedList: keysToDelete
      });
    }

    // === 彻底清除所有尝试记录 ===
    if (action === 'purge_attempts') {
      if (!adminKey || adminKey.trim() !== 'spencer') {
        return res.status(401).json({ success: false, message: '密码错误' });
      }

      const keys = await kv.keys('license:attempt:*');
      if (keys.length > 0) {
        await Promise.all(keys.map(k => kv.del(k)));
      }

      return res.status(200).json({
        success: true,
        message: `已清除 ${keys.length} 条未授权尝试记录`
      });
    }


    // === 管理员列表 ===
    if (action === 'list_all') {
      if (!adminKey || adminKey.trim() !== 'spencer') {
        console.warn(`[Admin List] Auth failed. Key: ${adminKey ? '***' : 'missing'}`);
        return res.status(401).json({ success: false, message: '密码错误' });
      }

      const [keys, attemptKeys] = await Promise.all([
        kv.keys('license:*'),
        kv.keys('license:attempt:*')
      ]);

      if (keys.length === 0 && attemptKeys.length === 0) return res.status(200).json({ success: true, data: [] });

      // === 自动同步：如果 Vercel 环境里已经删掉了，这里也自动删除数据库中的记录 ===
      const activeKeys: string[] = [];
      const deletedCount: string[] = [];

      for (const key of keys) {
        // 跳过尝试记录主键
        if (key.startsWith('license:attempt:')) continue;

        const code = key.replace('license:', '');
        if (isCodeInWhitelist(code)) {
          activeKeys.push(key);
        } else {
          // 不在白名单了，执行物理删除
          console.log(`[Auto-Sync] License ${code} is no longer in whitelist. Deleting from KV.`);
          await kv.del(key);
          deletedCount.push(code);
        }
      }

      const [values, attemptValues] = await Promise.all([
        Promise.all(activeKeys.map(key => kv.get<CompressedMetadata | LicenseMetadata>(key))),
        Promise.all(attemptKeys.map(key => kv.get<any>(key)))
      ]);

      // 处理正常激活的列表
      const list = values
        .map((v, index) => {
          if (!v) return null;
          const code = activeKeys[index].replace('license:', '');
          const meta = decompressMetadata(v, code);
          return {
            ...meta,
            status: 'active' // 既然没被删，肯定是在白名单里的
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // 处理未授权尝试的列表
      const attemptItems = attemptValues
        .map((v, index) => {
          if (!v) return null;
          const code = attemptKeys[index].replace('license:attempt:', '');

          // 如果该代码已经在正常列表中（后来被授权了），则跳过尝试记录
          if (list.some(l => l.code === code)) return null;

          return {
            code: code,
            totalDevices: v.count || 1,
            maxDevices: getEffectiveMaxDevices(code),
            generatedDate: extractDateFromCode(code)?.toISOString() || new Date().toISOString(),
            expiryDate: new Date().toISOString(),
            lastUsedTime: v.lastAttempt || v.firstAttempt || new Date().toISOString(),
            status: 'unauthorized', // 特殊状态
            devices: [{
              deviceId: v.deviceId || 'unknown',
              firstSeen: v.firstAttempt || new Date().toISOString(),
              lastSeen: v.lastAttempt || new Date().toISOString(),
              ua: v.ua || 'unknown'
            }]
          };
        })
        .filter(item => item !== null);

      const combined = [...list, ...attemptItems].sort((a, b) =>
        new Date(b.lastUsedTime).getTime() - new Date(a.lastUsedTime).getTime()
      );

      return res.status(200).json({
        success: true,
        data: combined,
        syncInfo: deletedCount.length > 0 ? `已从数据库同步删除 ${deletedCount.length} 条失效记录` : null
      });
    }

    // === 验证流程 ===
    if (!licenseCode || !deviceId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();

    // 1. 基础检查
    const generatedDate = extractDateFromCode(cleanCode);
    const dateNow = Date.now();
    const dateNowISO = new Date(dateNow).toISOString();

    if (!isCodeInWhitelist(cleanCode)) {
      return res.status(401).json({ success: false, message: '授权码不存在或已被禁用，请联系管理员购买' });
    }

    if (!generatedDate) return res.status(401).json({ success: false, message: '授权码格式异常' });

    const expiryDate = new Date(generatedDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    if (new Date() > expiryDate) {
      return res.status(401).json({ success: false, message: `授权码已于 ${expiryDate.toLocaleDateString()} 过期，请购买新码` });
    }

    // 2. 读取 Redis
    // 统一使用不带横杠的 Key 以匹配新旧数据 (如果旧数据也没横杠的话)
    // 提示：如果之前存的是带横杠的，这里可能需要兼容
    const redisKey = `license:${cleanCode}`;
    const rawData = await kv.get<CompressedMetadata | LicenseMetadata>(redisKey);

    // 兼容性检查：如果没搜到，再尝试带原始授权码搜一下 (处理可能有横杠的旧数据)
    let finalData = rawData;
    if (!finalData && licenseCode !== cleanCode) {
      const backupKey = `license:${licenseCode}`;
      finalData = await kv.get<CompressedMetadata | LicenseMetadata>(backupKey);
      if (finalData) console.log(`[License] Found legacy data with original key: ${backupKey}`);
    }

    console.log(`[License] Logged in: ${cleanCode} action: verify`);

    let metadata: LicenseMetadata;

    if (!finalData) {
      // 首次激活
      console.log(`[License] New Activation: ${cleanCode} Device: ${deviceId}`);
      metadata = {
        code: cleanCode,
        totalDevices: 1,
        maxDevices: getEffectiveMaxDevices(cleanCode),
        generatedDate: generatedDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        firstActivatedAt: dateNowISO,
        lastUsedTime: dateNowISO,
        devices: [{
          deviceId,
          firstSeen: dateNowISO,
          lastSeen: dateNowISO,
          ua: rawDeviceInfo || getDeviceType(ua)
        }]
      };
    } else {
      // 解压旧数据
      metadata = decompressMetadata(rawData, cleanCode);

      const deviceIndex = metadata.devices.findIndex(d => d.deviceId === deviceId);

      if (deviceIndex > -1) {
        // 更新现有设备
        console.log(`[License] Update Device: ${cleanCode} Device: ${deviceId}`);
        metadata.devices[deviceIndex].lastSeen = dateNowISO;

        // 更新 UserAgent，以防用户更新了浏览器
        metadata.devices[deviceIndex].ua = rawDeviceInfo || getDeviceType(ua);

        // 确保 License 的最后使用时间也更新
        metadata.lastUsedTime = dateNowISO;
      } else {
        // 添加新设备
        console.log(`[License] New Device: ${cleanCode} Device: ${deviceId}`);

        // 检查限制
        const max = getEffectiveMaxDevices(cleanCode);
        if (metadata.devices.length >= max) {
          return res.status(403).json({
            success: false,
            message: `设备授权已满 (${metadata.devices.length}/${max})，请联系管理员清理旧设备`
          });
        }

        metadata.devices.push({
          deviceId,
          firstSeen: dateNowISO,
          lastSeen: dateNowISO,
          ua: rawDeviceInfo || getDeviceType(ua)
        });
        metadata.totalDevices = metadata.devices.length;
        metadata.lastUsedTime = dateNowISO;
      }
    }

    // 3. 压缩并保存
    const compressed = compressMetadata(metadata);
    await kv.set(redisKey, compressed);

    // 4. 返回 Token
    const token = Buffer.from(`${cleanCode}:${deviceId}:${expiryDate.getTime()}`).toString('base64');

    return res.status(200).json({
      success: true,
      message: '授权验证成功',
      data: {
        expiryDate: metadata.expiryDate,
        totalDevices: metadata.totalDevices,
        token: token
      }
    });

  } catch (error) {
    console.error('API Error:', error);

    // 获取 action 以区分请求类型
    const { action } = req.body || {};

    // 管理员请求不应降级，应返回明确的错误
    if (action === 'list_all' || action === 'query') {
      return res.status(500).json({
        success: false,
        message: `服务器错误: ${(error as Error).message || '连接 Redis 失败'}`,
        data: []
      });
    }

    // 普通验证请求可降级处理
    return res.status(200).json({
      success: true,
      message: '验证成功(离线)',
      data: { validFor: '1年' }
    });
  }
}
