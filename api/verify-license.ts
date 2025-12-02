import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - 授权码验证API
 * 
 * 这个API负责验证用户输入的授权码
 * 你需要在Vercel环境变量中设置：
 * - LICENSE_CODES: 有效授权码列表（逗号分隔）
 */

interface LicenseData {
  code: string;
  deviceLimit: number;
  validUntil?: string;
  usedDevices: string[];
}

// 模拟数据库 - 实际使用时，你应该使用真实数据库（如Vercel KV、MongoDB等）
// 这里为了演示，使用内存存储
const licenseDatabase: Map<string, LicenseData> = new Map();

// 从环境变量加载授权码
function loadLicenseCodes(): string[] {
  const codes = process.env.LICENSE_CODES || '';
  console.log('环境变量 LICENSE_CODES:', codes ? '已设置' : '未设置');
  console.log('原始值:', codes);
  
  const codeList = codes.split(',').map(c => c.trim().toUpperCase()).filter(c => c.length > 0);
  console.log('解析后的授权码列表:', codeList);
  
  return codeList;
}

// 验证授权码是否有效
function isValidLicenseCode(code: string): boolean {
  const validCodes = loadLicenseCodes();
  const upperCode = code.toUpperCase();
  
  console.log('验证授权码:', upperCode);
  console.log('有效授权码列表:', validCodes);
  console.log('是否匹配:', validCodes.includes(upperCode));
  
  return validCodes.includes(upperCode);
}

// 检查设备是否可以使用此授权码
function checkDeviceLimit(code: string, deviceId: string): {
  allowed: boolean;
  reason?: string;
} {
  const upperCode = code.toUpperCase();
  
  // 获取或创建授权码数据
  if (!licenseDatabase.has(upperCode)) {
    licenseDatabase.set(upperCode, {
      code: upperCode,
      deviceLimit: 3, // 每个授权码最多3台设备
      usedDevices: [],
    });
  }

  const licenseData = licenseDatabase.get(upperCode)!;

  // 检查设备是否已注册
  if (licenseData.usedDevices.includes(deviceId)) {
    return { allowed: true }; // 已注册的设备可以继续使用
  }

  // 检查是否达到设备限制
  if (licenseData.usedDevices.length >= licenseData.deviceLimit) {
    return {
      allowed: false,
      reason: `授权码已达到设备数量限制（${licenseData.deviceLimit}台）`,
    };
  }

  // 添加新设备
  licenseData.usedDevices.push(deviceId);
  return { allowed: true };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 允许CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '方法不允许',
    });
  }

  try {
    const { licenseCode, deviceId } = req.body;

    console.log('收到验证请求 - licenseCode:', licenseCode, 'deviceId:', deviceId);

    // 验证参数
    if (!licenseCode || !deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
      });
    }

    // 清理授权码格式（移除连字符和空格）
    const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();

    console.log('清理后的授权码:', cleanCode);

    // 验证授权码长度
    if (cleanCode.length !== 16) {
      return res.status(400).json({
        success: false,
        message: '授权码格式不正确（应为16位字符）',
      });
    }

    // 验证授权码是否在有效列表中
    if (!isValidLicenseCode(cleanCode)) {
      console.log('授权码验证失败');
      return res.status(401).json({
        success: false,
        message: '授权码无效或已过期',
      });
    }

    // 检查设备限制
    const deviceCheck = checkDeviceLimit(cleanCode, deviceId);
    if (!deviceCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: deviceCheck.reason || '设备验证失败',
      });
    }

    console.log('授权码验证成功');

    // 验证成功
    return res.status(200).json({
      success: true,
      message: '授权验证成功',
      data: {
        validUntil: '2099-12-31', // 永久有效
        deviceLimit: 3,
      },
    });

  } catch (error) {
    console.error('验证授权码时出错:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试',
    });
  }
}
