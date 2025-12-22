/**
 * 授权码管理工具
 * License Code Format: XXXX-XXXX-XXXX-XXXX
 */

const LICENSE_KEY = 'doraemon_license_code';
const DEVICE_ID_KEY = 'doraemon_device_id';
const VERIFIED_KEY = 'doraemon_verified';

// 生成设备唯一ID（更详细的信息）
export const getDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      const randomPart = Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now().toString(36);
      deviceId = `${randomPart}-${timestamp}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    // 降级处理：如果在无痕模式或禁止存储，每次生成临时的
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
};

// ... existing code ...

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
    const deviceId = getDeviceId();
    const deviceInfo = getDeviceInfo();
    
    console.log('正在验证:', { code, deviceId, deviceInfo }); // Debug log

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

