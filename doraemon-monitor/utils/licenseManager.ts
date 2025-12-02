/**
 * 授权码管理工具
 * License Code Format: XXXX-XXXX-XXXX-XXXX
 */

const LICENSE_KEY = 'doraemon_license_code';
const DEVICE_ID_KEY = 'doraemon_device_id';
const VERIFIED_KEY = 'doraemon_verified';

// 生成设备唯一ID
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // 基于浏览器指纹生成设备ID
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.width + 'x' + screen.height,
      screen.colorDepth,
    ].join('|');
    
    deviceId = btoa(fingerprint).substring(0, 32);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};

// 保存授权码到本地
export const saveLicenseCode = (code: string): void => {
  localStorage.setItem(LICENSE_KEY, code);
  localStorage.setItem(VERIFIED_KEY, 'true');
};

// 获取已保存的授权码
export const getSavedLicenseCode = (): string | null => {
  return localStorage.getItem(LICENSE_KEY);
};

// 检查是否已验证
export const isVerified = (): boolean => {
  return localStorage.getItem(VERIFIED_KEY) === 'true';
};

// 清除授权信息
export const clearLicense = (): void => {
  localStorage.removeItem(LICENSE_KEY);
  localStorage.removeItem(VERIFIED_KEY);
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
    validUntil?: string;
    deviceLimit?: number;
  };
}> => {
  try {
    const deviceId = getDeviceId();
    
    const response = await fetch('/api/verify-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseCode: code,
        deviceId: deviceId,
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

