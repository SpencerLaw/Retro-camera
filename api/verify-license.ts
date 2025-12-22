import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

/**
 * Vercel Serverless Function - 授权码验证API (带 Redis 监控版)
 * 
 * 授权规则：
 * - 每个授权码有效期1年
 * - 每个授权码最多绑定 10 个设备
 * - 记录首次激活时间、最后使用时间、设备信息、用户 IP
 */

interface DeviceInfo {
  deviceId: string;
  firstSeen: string;
  lastSeen: string;
  ua: string;
  ip: string;
}

interface LicenseMetadata {
  code: string;
  totalDevices: number;
  maxDevices: number;
  generatedDate: string;
  expiryDate: string;
  lastUsedTime: string;
  devices: DeviceInfo[];
}

// 获取用户真实 IP
function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// 获取设备概况
function getDeviceType(ua: string): string {
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'Mac';
  return 'Unknown';
}

// 从授权码中提取生成日期（前8位：YYYYMMDD）
function extractDateFromCode(code: string): Date | null {
  try {
    const cleanCode = code.replace(/[-\s]/g, '');
    const dateStr = cleanCode.substring(0, 8);
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

// 检查授权码是否在白名单中
function isCodeInWhitelist(code: string): boolean {
  const codes = process.env.LICENSE_CODES || '';
  const validCodes = codes.split(',')
    .map(c => c.replace(/[-\s]/g, '').toUpperCase())
    .filter(c => c.length > 0);
  return validCodes.includes(code.toUpperCase());
}

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
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || 'unknown';

    // === 管理员查询模式 ===
    if (action === 'query') {
      if (adminKey !== 'spencer') {
        return res.status(401).json({ success: false, message: '管理员密码错误' });
      }

      if (!licenseCode) {
        return res.status(400).json({ success: false, message: '请输入要查询的授权码' });
      }

      const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();
      const redisKey = `license:${cleanCode}`;
      const metadata = await kv.get<LicenseMetadata>(redisKey);

      if (!metadata) {
        return res.status(404).json({ success: false, message: '该授权码尚未激活或不存在' });
      }

      return res.status(200).json({
        success: true,
        data: metadata
      });
    }

    // === 管理员获取所有列表模式 ===
    if (action === 'list_all') {
      if (adminKey !== 'spencer') {
        return res.status(401).json({ success: false, message: '管理员密码错误' });
      }

      try {
        // 1. 获取所有 license:* 的 key
        // 注意：keys 命令在数据量巨大时可能会慢，但对于几千条数据没问题
        // 生产环境建议使用 scan，这里为了简单直接用 keys
        const keys = await kv.keys('license:*');
        
        if (keys.length === 0) {
          return res.status(200).json({ success: true, data: [] });
        }

        // 2. 批量获取详情
        // Pipeline 并不是 kv 库直接支持的，我们用 Promise.all 并行获取
        // 对于 Vercel KV (Upstash)，mget 也是好选择，但 key 可能较多，分批处理更好
        // 这里直接简单并发获取
        const values = await Promise.all(keys.map(key => kv.get<LicenseMetadata>(key)));

        // 3. 过滤掉空值并整理格式
        const list = values
          .filter(v => v !== null)
          .map(v => v!)
          .sort((a, b) => new Date(b.lastUsedTime).getTime() - new Date(a.lastUsedTime).getTime()); // 按最后使用时间倒序

        return res.status(200).json({
          success: true,
          data: list
        });
      } catch (error) {
        console.error('获取列表失败:', error);
        return res.status(500).json({ success: false, message: '获取数据失败' });
      }
    }

    // === 普通用户验证模式 ===
    if (!licenseCode || !deviceId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();
    
    // 1. 基础验证
    if (cleanCode.length !== 16 || !isCodeInWhitelist(cleanCode)) {
      return res.status(401).json({ success: false, message: '授权码无效' });
    }

    // 2. 过期检查
    const generatedDate = extractDateFromCode(cleanCode);
    if (!generatedDate) {
      return res.status(401).json({ success: false, message: '授权码格式异常' });
    }
    const expiryDate = new Date(generatedDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    if (new Date() > expiryDate) {
      return res.status(401).json({ success: false, message: '授权码已过期' });
    }

    // 3. Redis 监控与设备限制
    const redisKey = `license:${cleanCode}`;
    let metadata = await kv.get<LicenseMetadata>(redisKey);
    const now = new Date().toISOString();

    if (!metadata) {
      // 首次激活
      metadata = {
        code: cleanCode,
        totalDevices: 1,
        maxDevices: 10,
        generatedDate: generatedDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        lastUsedTime: now,
        devices: [{
          deviceId,
          firstSeen: now,
          lastSeen: now,
          ua: rawDeviceInfo || getDeviceType(ua),
          ip: ip
        }]
      };
    } else {
      // 已激活过，检查设备
      const deviceIndex = metadata.devices.findIndex(d => d.deviceId === deviceId);
      
      if (deviceIndex > -1) {
        // 已绑定设备，更新最后使用时间
        metadata.devices[deviceIndex].lastSeen = now;
        metadata.devices[deviceIndex].ip = ip; // 更新最后登录IP
        metadata.lastUsedTime = now;
      } else {
        // 新设备，检查是否超过10台
        if (metadata.totalDevices >= (metadata.maxDevices || 10)) {
          return res.status(403).json({ 
            success: false, 
            message: `绑定失败：该授权码已在 ${metadata.totalDevices} 台设备上激活，达到上限。`,
            data: { totalDevices: metadata.totalDevices }
          });
        }
        
        // 允许绑定新设备
        metadata.devices.push({
          deviceId,
          firstSeen: now,
          lastSeen: now,
          ua: rawDeviceInfo || getDeviceType(ua),
          ip: ip
        });
        metadata.totalDevices = metadata.devices.length;
        metadata.lastUsedTime = now;
      }
    }

    // 保存回 Redis
    await kv.set(redisKey, metadata);

    // 4. 返回成功，附带验证 Token (简单 Hash 防伪)
    // 注意：这里为了简单不引入加密库，实际可以使用 crypto 生成更安全的哈希
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
    console.error('Redis 验证出错:', error);
    // 如果 Redis 出错，为了保证用户体验，回退到基础验证逻辑（不限制设备）
    return res.status(200).json({
      success: true,
      message: '授权验证成功 (离线模式)',
      data: { validFor: '1年' }
    });
  }
}