/**
 * 数学拔河专用授权管理
 */
const BH_LICENSE_KEY = 'bh_license_code';
const BH_VERIFIED_KEY = 'bh_verified';
const BH_DEVICE_ID_KEY = 'bh_device_id';

// 生成或获取持久化的设备唯一ID
export const getBHDeviceId = (): string => {
    try {
        let deviceId = localStorage.getItem(BH_DEVICE_ID_KEY);
        if (!deviceId) {
            const randomPart = Math.random().toString(36).substring(2, 11);
            const timestamp = Date.now().toString(36);
            deviceId = `bh-${randomPart}-${timestamp}`;
            localStorage.setItem(BH_DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    } catch (e) {
        return `bh-temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
};

// 获取设备描述信息
export const getBHDeviceInfo = (): string => {
    try {
        const ua = navigator.userAgent;
        let os = 'Unknown OS';
        if (/Windows/i.test(ua)) os = 'Windows';
        else if (/Mac/i.test(ua)) os = 'Mac';
        else if (/iPhone/i.test(ua)) os = 'iPhone';
        else if (/iPad/i.test(ua)) os = 'iPad';
        else if (/Android/i.test(ua)) os = 'Android';
        else if (/Linux/i.test(ua)) os = 'Linux';

        let browser = 'Unknown Browser';
        if (/Edg/i.test(ua)) browser = 'Edge';
        else if (/Chrome/i.test(ua)) browser = 'Chrome';
        else if (/Firefox/i.test(ua)) browser = 'Firefox';
        else if (/Safari/i.test(ua)) browser = 'Safari';

        return `${os} - ${browser}`;
    } catch (e) {
        return 'Tug of War Math';
    }
};

export const saveBHLicense = (code: string) => {
    localStorage.setItem(BH_LICENSE_KEY, code.toUpperCase().replace(/\s/g, ''));
    localStorage.setItem(BH_VERIFIED_KEY, 'true');
};

export const getBHLicense = () => localStorage.getItem(BH_LICENSE_KEY);

export const isBHVerified = () => {
    const verified = localStorage.getItem(BH_VERIFIED_KEY) === 'true';
    const code = getBHLicense();
    return verified && !!code;
};

export const clearBHLicense = () => {
    localStorage.removeItem(BH_LICENSE_KEY);
    localStorage.removeItem(BH_VERIFIED_KEY);
};

export const verifyBHLicense = async (code: string): Promise<{ success: boolean; message?: string }> => {
    const cleanCode = code.replace(/[-\s]/g, '').toUpperCase();

    if (!cleanCode.startsWith('BH')) {
        return { success: false, message: '无效的授权码 (必须以 BH 开头)' };
    }

    try {
        const response = await fetch('/api/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licenseCode: cleanCode,
                deviceId: getBHDeviceId(),
                deviceInfo: getBHDeviceInfo()
            }),
        });
        const data = await response.json();
        if (data.success) {
            saveBHLicense(cleanCode);
            return { success: true };
        }
        return { success: false, message: data.message || '验证失败' };
    } catch (error) {
        return { success: false, message: '网络请求失败，请检查网络连接' };
    }
};
