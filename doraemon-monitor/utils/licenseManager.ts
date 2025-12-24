/**
 * 授权码管理工具
 * License Code Format: XXXX-XXXX-XXXX-XXXX
 */

const LICENSE_KEY = 'doraemon_license_code';
const DEVICE_ID_KEY = 'doraemon_device_id';
const VERIFIED_KEY = 'doraemon_verified';

// 生成设备唯一ID（更详细的信息，带容错）
export const getDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // 生成随机ID + 时间戳
      const randomPart = Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now().toString(36);
      deviceId = `${randomPart}-${timestamp}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    // 降级处理：如果在无痕模式或禁止存储，每次生成临时的
    // 注意：这意味着每次刷新页面都会消耗一个设备名额，这是一个折衷
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
};

// 获取设备信息（用于后台显示）
export const getDeviceInfo = (): string => {
  try {
    const ua = navigator.userAgent;
    let deviceName = '未知设备';
    
    // 判断设备类型
    if (/iPhone/i.test(ua)) {
      deviceName = 'iPhone';
    } else if (/iPad/i.test(ua)) {
      deviceName = 'iPad';
    } else if (/Android/i.test(ua)) {
      deviceName = 'Android';
    } else if (/Windows/i.test(ua)) {
      deviceName = 'Windows';
    } else if (/Mac/i.test(ua)) {
      deviceName = 'Mac';
    } else if (/Linux/i.test(ua)) {
      deviceName = 'Linux';
    }
    
    // 判断浏览器
    let browser = '未知浏览器';
    if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) {
      browser = 'Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = 'Safari';
    } else if (/Firefox/i.test(ua)) {
      browser = 'Firefox';
    } else if (/Edge/i.test(ua)) {
      browser = 'Edge';
    }
    
    return `${deviceName} - ${browser}`;
  } catch (e) {
    return 'Unknown Device';
  }
};

// 保存授权码到本地
export const saveLicenseCode = (code: string): void => {
  try {
    localStorage.setItem(LICENSE_KEY, code);
    localStorage.setItem(VERIFIED_KEY, 'true');
  } catch (e) {
    console.error('无法保存授权信息', e);
  }
};

// 获取已保存的授权码
export const getSavedLicenseCode = (): string | null => {
  try {
    return localStorage.getItem(LICENSE_KEY);
  } catch (e) {
    return null;
  }
};

// 检查是否已验证
export const isVerified = (): boolean => {
  try {
    const verified = localStorage.getItem(VERIFIED_KEY) === 'true';
    const code = localStorage.getItem(LICENSE_KEY);
    // 简单的本地校验，增强安全性
    return verified && !!code && code.length >= 16;
  } catch (e) {
    return false;
  }
};

// 清除授权信息
export const clearLicense = (): void => {
  try {
    localStorage.removeItem(LICENSE_KEY);
    localStorage.removeItem(VERIFIED_KEY);
  } catch (e) {}
};

// 格式化授权码（添加连字符）
export const formatLicenseCode = (code: string): string => {
  const cleaned = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const parts = cleaned.match(/.{1,4}/g) || [];
  return parts.join('-');
};

// 验证授权码格式
export const isValidFormat = (code: string): boolean => {
  const cleaned = code.replace(/[^A-Z0-9]/gi, '');
  return cleaned.length === 16;
};

// 云端验证授权码
export const verifyLicenseCode = async (code: string): Promise<{
  success: boolean;
  message: string;
  data?: {
    generatedDate?: string;
    expiryDate?: string;
    validFor?: string;
  };
}> => {
  try {
    // 检查前缀：哆啦A梦不接受 ZY 开头的码
    if (code.toUpperCase().startsWith('ZY')) {
      return {
        success: false,
        message: '此授权码仅适用于作业消消乐',
      };
    }

    const deviceId = getDeviceId();
    const deviceInfo = getDeviceInfo();
    
    console.log('正在验证:', { code, deviceId, deviceInfo }); 

    const response = await fetch('/api/verify-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseCode: code,
        deviceId: deviceId,
        deviceInfo: deviceInfo,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      saveLicenseCode(code);
    }
    
    return result;
  } catch (error) {
    console.error('验证授权码失败:', error);
    return {
      success: false,
      message: '网络错误，请检查您的网络连接',
    };
  }
};