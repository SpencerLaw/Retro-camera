import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - 授权码验证API
 * 
 * 授权规则：
 * - 每个授权码有效期1年
 * - 不限制设备数量
 * - 根据授权码生成时间判断是否过期
 * 
 * 授权码格式：YYYYMMDD-XXXX-XXXX-XXXX
 * 前8位是日期（生成日期），用于计算有效期
 */

// 验证频率限制（防止滥用）
const verificationLog: Map<string, number[]> = new Map();

// 从授权码中提取生成日期（前8位：YYYYMMDD）
function extractDateFromCode(code: string): Date | null {
  try {
    // 移除连字符，取前8位
    const cleanCode = code.replace(/[-\s]/g, '');
    const dateStr = cleanCode.substring(0, 8);
    
    // 解析日期 YYYYMMDD
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // 月份从0开始
    const day = parseInt(dateStr.substring(6, 8));
    
    const date = new Date(year, month, day);
    
    // 验证日期有效性
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    return null;
  }
}

// 验证授权码是否过期（1年有效期）
function isLicenseExpired(code: string): {
  expired: boolean;
  generatedDate?: string;
  expiryDate?: string;
} {
  const generatedDate = extractDateFromCode(code);
  
  if (!generatedDate) {
    return { expired: true };
  }
  
  // 计算过期日期（生成日期 + 1年）
  const expiryDate = new Date(generatedDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
  const now = new Date();
  const expired = now > expiryDate;
  
  console.log('授权码生成日期:', generatedDate.toLocaleDateString('zh-CN'));
  console.log('过期日期:', expiryDate.toLocaleDateString('zh-CN'));
  console.log('当前日期:', now.toLocaleDateString('zh-CN'));
  console.log('是否过期:', expired);
  
  return {
    expired,
    generatedDate: generatedDate.toISOString(),
    expiryDate: expiryDate.toISOString(),
  };
}

// 从环境变量加载授权码
function loadLicenseCodes(): string[] {
  const codes = process.env.LICENSE_CODES || '';
  console.log('环境变量 LICENSE_CODES:', codes ? '已设置' : '未设置');
  
  // 分割、去除空格和连字符、转大写
  const codeList = codes.split(',')
    .map(c => c.replace(/[-\s]/g, '').toUpperCase())
    .filter(c => c.length > 0);
  
  return codeList;
}

// 验证授权码是否在白名单中
function isValidLicenseCode(code: string): boolean {
  const validCodes = loadLicenseCodes();
  const upperCode = code.toUpperCase();
  
  console.log('验证授权码:', upperCode);
  console.log('是否在白名单中:', validCodes.includes(upperCode));
  
  return validCodes.includes(upperCode);
}

// 检查验证频率（防止滥用）
function checkVerificationRate(code: string): {
  allowed: boolean;
  reason?: string;
} {
  const now = Date.now();
  const key = code.toUpperCase();
  
  // 获取该授权码的验证记录
  if (!verificationLog.has(key)) {
    verificationLog.set(key, []);
  }
  
  const logs = verificationLog.get(key)!;
  
  // 清理5分钟前的记录
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const recentLogs = logs.filter(time => time > fiveMinutesAgo);
  
  // 5分钟内验证次数不能超过10次
  if (recentLogs.length >= 10) {
    return {
      allowed: false,
      reason: '验证过于频繁，请稍后再试（5分钟内最多验证10次）',
    };
  }
  
  // 记录本次验证
  recentLogs.push(now);
  verificationLog.set(key, recentLogs);
  
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
    const { licenseCode } = req.body;

    console.log('收到验证请求 - licenseCode:', licenseCode);

    // 验证参数
    if (!licenseCode) {
      return res.status(400).json({
        success: false,
        message: '缺少授权码参数',
      });
    }

    // 清理授权码格式（移除连字符和空格）
    const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();

    console.log('清理后的授权码:', cleanCode);

    // 验证授权码长度（YYYYMMDD + 8位随机 = 16位）
    if (cleanCode.length !== 16) {
      return res.status(400).json({
        success: false,
        message: '授权码格式不正确',
      });
    }

    // 验证授权码是否在白名单中
    if (!isValidLicenseCode(cleanCode)) {
      console.log('授权码不在白名单中');
      return res.status(401).json({
        success: false,
        message: '授权码无效',
      });
    }

    // 检查授权码是否过期（1年有效期）
    const expiryCheck = isLicenseExpired(cleanCode);
    if (expiryCheck.expired) {
      console.log('授权码已过期');
      return res.status(401).json({
        success: false,
        message: '授权码已过期，请重新购买',
      });
    }

    // 检查验证频率（防止滥用）
    const rateCheck = checkVerificationRate(cleanCode);
    if (!rateCheck.allowed) {
      console.log('验证频率超限');
      return res.status(429).json({
        success: false,
        message: rateCheck.reason || '验证过于频繁',
      });
    }

    console.log('授权码验证成功');

    // 验证成功
    return res.status(200).json({
      success: true,
      message: '授权验证成功',
      data: {
        generatedDate: expiryCheck.generatedDate,
        expiryDate: expiryCheck.expiryDate,
        validFor: '1年',
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
