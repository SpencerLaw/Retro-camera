import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 授权码管理后台 API
 * 
 * 功能：
 * - 查看授权码使用情况
 * - 清理设备绑定记录
 * - 统计数据
 * 
 * 安全：需要管理员密码
 */

interface DeviceInfo {
  id: string;
  name: string;
  addedAt: string;
}

interface LicenseData {
  code: string;
  deviceLimit: number;
  usedDevices: DeviceInfo[];
  createdAt?: string;
}

// 模拟数据库（与 verify-license.ts 共享）
const licenseDatabase: Map<string, LicenseData> = new Map();

// 管理员密码（固定为 spencer）
const ADMIN_PASSWORD = 'spencer';

// 验证管理员密码
function verifyAdmin(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 允许CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 验证管理员密码
    const authHeader = req.headers.authorization;
    const password = authHeader?.replace('Bearer ', '');

    if (!password || !verifyAdmin(password)) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限',
      });
    }

    // GET: 查看所有授权码使用情况
    if (req.method === 'GET') {
      const licenses = Array.from(licenseDatabase.entries()).map(([code, data]) => ({
        code,
        usedDevices: data.usedDevices.length,
        deviceLimit: data.deviceLimit,
        devices: data.usedDevices.map(device => ({
          id: device.id,
          name: device.name,
          addedAt: device.addedAt,
        })),
      }));

      return res.status(200).json({
        success: true,
        data: {
          total: licenses.length,
          licenses,
        },
      });
    }

    // POST: 清理特定授权码的设备记录
    if (req.method === 'POST') {
      const { action, licenseCode, deviceId } = req.body;

      if (action === 'clear-all') {
        // 清理所有授权码的设备记录
        licenseDatabase.clear();
        return res.status(200).json({
          success: true,
          message: '已清理所有授权码的设备记录',
        });
      }

      if (action === 'clear-license') {
        // 清理特定授权码的所有设备
        const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();
        
        if (licenseDatabase.has(cleanCode)) {
          licenseDatabase.delete(cleanCode);
          return res.status(200).json({
            success: true,
            message: `授权码 ${licenseCode} 的设备记录已清理`,
          });
        } else {
          return res.status(404).json({
            success: false,
            message: '授权码不存在或未使用',
          });
        }
      }

      if (action === 'remove-device') {
        // 移除特定授权码的某个设备
        const cleanCode = licenseCode.replace(/[-\s]/g, '').toUpperCase();
        
        if (licenseDatabase.has(cleanCode)) {
          const data = licenseDatabase.get(cleanCode)!;
          const beforeCount = data.usedDevices.length;
          data.usedDevices = data.usedDevices.filter(d => d.id !== deviceId);
          const afterCount = data.usedDevices.length;
          
          if (beforeCount === afterCount) {
            return res.status(404).json({
              success: false,
              message: '设备ID不存在',
            });
          }
          
          return res.status(200).json({
            success: true,
            message: '设备已移除，用户可在新设备上使用',
            data: {
              remainingDevices: data.usedDevices.length,
            },
          });
        } else {
          return res.status(404).json({
            success: false,
            message: '授权码不存在',
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: '未知操作',
      });
    }

    return res.status(405).json({
      success: false,
      message: '方法不允许',
    });

  } catch (error) {
    console.error('管理API错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
}

