import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

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

interface LicenseMetadata {
  code: string;
  totalDevices: number;
  maxDevices: number;
  generatedDate: string;
  expiryDate: string;
  firstActivatedAt?: string;
  lastUsedTime: string;
  devices: DeviceInfo[];
}

// 压缩版数据结构 (用于 Redis 存储)
interface CompressedDevice {
  i: string; // deviceId
  f: number; // firstSeen (timestamp)
  l: number; // lastSeen (timestamp)
  u: string; // ua
}

interface CompressedMetadata {
  m: number; // maxDevices
  f: number; // firstActivatedAt (timestamp)
  l: number; // lastUsedTime (timestamp)
  d: CompressedDevice[]; // devices
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

    // 支持多种前缀 (ZY 或 DM 或 ZD 或 GB)
    if (cleanCode.startsWith('ZY') || cleanCode.startsWith('DM') || cleanCode.startsWith('ZD') || cleanCode.startsWith('GB')) {
      cleanCode = cleanCode.substring(2);
    }

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

// 检查白名单
function isCodeInWhitelist(code: string): boolean {
  const codes = process.env.LICENSE_CODES || '';
  const validCodes = codes.split(',')
    .map(c => c.replace(/[-\s]/g, '').toUpperCase())
    .filter(c => c.length > 0);
  return validCodes.includes(code.toUpperCase());
}

// === 压缩与解压逻辑 ===

function compressMetadata(full: LicenseMetadata): CompressedMetadata {
  return {
    m: full.maxDevices,
    f: new Date(full.firstActivatedAt || full.generatedDate).getTime(),
    l: new Date(full.lastUsedTime).getTime(),
    d: full.devices.map(dev => ({
      i: dev.deviceId,
      f: new Date(dev.firstSeen).getTime(),
      l: new Date(dev.lastSeen).getTime(),
      u: dev.ua
    }))
  };
}

function decompressMetadata(compressed: CompressedMetadata | LicenseMetadata, code: string): LicenseMetadata {
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
      maxDevices: 3,
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
    maxDevices: c.m,
    generatedDate: genDate.toISOString(),
    expiryDate: expDate.toISOString(),
    firstActivatedAt: new Date(c.f).toISOString(),
    lastUsedTime: new Date(c.l).toISOString(),
    devices: c.d.map(dev => ({
      deviceId: dev.i,
      firstSeen: new Date(dev.f).toISOString(),
      lastSeen: new Date(dev.l).toISOString(),
      ua: dev.u
    }))
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

    // === 管理员列表 ===
    if (action === 'list_all') {
      if (!adminKey || adminKey.trim() !== 'spencer') {
        console.warn(`[Admin List] Auth failed. Key: ${adminKey ? '***' : 'missing'}`);
        return res.status(401).json({ success: false, message: '密码错误' });
      }

      const keys = await kv.keys('license:*');
      if (keys.length === 0) return res.status(200).json({ success: true, data: [] });

      const values = await Promise.all(keys.map(key => kv.get<CompressedMetadata | LicenseMetadata>(key)));

      // 获取当前白名单
      const envCodes = process.env.LICENSE_CODES || '';
      const validCodeSet = new Set(
        envCodes.split(',')
          .map(c => c.replace(/[-\s]/g, '').toUpperCase())
          .filter(c => c.length > 0)
      );

      const list = values
        .map((v, index) => {
          if (!v) return null;
          const code = keys[index].replace('license:', '');
          const meta = decompressMetadata(v, code);

          // 注入状态字段：检查是否在白名单中
          return {
            ...meta,
            status: validCodeSet.has(code) ? 'active' : 'revoked'
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.lastUsedTime).getTime() - new Date(a!.lastUsedTime).getTime());

      return res.status(200).json({
        success: true,
        data: list
      });
    }

    // === 验证流程 ===
    if (!licenseCode || !deviceId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();

    // 1. 基础检查
    if (!isCodeInWhitelist(cleanCode)) {
      return res.status(401).json({ success: false, message: '授权码不存在或已被禁用，请联系管理员购买' });
    }

    const generatedDate = extractDateFromCode(cleanCode);
    if (!generatedDate) return res.status(401).json({ success: false, message: '授权码格式异常' });

    const expiryDate = new Date(generatedDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    if (new Date() > expiryDate) {
      return res.status(401).json({ success: false, message: `授权码已于 ${expiryDate.toLocaleDateString()} 过期，请购买新码` });
    }

    // 2. 读取 Redis
    const redisKey = `license:${cleanCode}`;
    const rawData = await kv.get<CompressedMetadata | LicenseMetadata>(redisKey);
    const now = Date.now();
    const nowISO = new Date(now).toISOString();

    let metadata: LicenseMetadata;

    if (!rawData) {
      // 首次激活
      console.log(`[License] New Activation: ${cleanCode} Device: ${deviceId}`);
      metadata = {
        code: cleanCode,
        totalDevices: 1,
        maxDevices: 3, // 默认限制 3 台设备
        generatedDate: generatedDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        firstActivatedAt: nowISO,
        lastUsedTime: nowISO,
        devices: [{
          deviceId,
          firstSeen: nowISO,
          lastSeen: nowISO,
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
        metadata.devices[deviceIndex].lastSeen = nowISO;

        // 更新 UserAgent，以防用户更新了浏览器
        metadata.devices[deviceIndex].ua = rawDeviceInfo || getDeviceType(ua);

        // 确保 License 的最后使用时间也更新
        metadata.lastUsedTime = nowISO;
      } else {
        // 添加新设备
        console.log(`[License] New Device: ${cleanCode} Device: ${deviceId}`);
        if (metadata.devices.length >= metadata.maxDevices) {
          return res.status(403).json({
            success: false,
            message: `绑定失败：设备已满 (${metadata.devices.length}/${metadata.maxDevices})`,
            data: { totalDevices: metadata.devices.length }
          });
        }

        metadata.devices.push({
          deviceId,
          firstSeen: nowISO,
          lastSeen: nowISO,
          ua: rawDeviceInfo || getDeviceType(ua)
        });
        metadata.totalDevices = metadata.devices.length;
        metadata.lastUsedTime = nowISO;
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
    return res.status(200).json({ // 降级处理
      success: true,
      message: '验证成功(离线)',
      data: { validFor: '1年' }
    });
  }
}
