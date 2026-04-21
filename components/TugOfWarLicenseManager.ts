/**
 * 拔河类应用授权管理
 */
type TugLicenseProductConfig = {
    licensePrefix: string;
    storagePrefix: string;
    deviceInfo?: string;
};

const normalizePrefix = (prefix: string) => prefix.toLowerCase();

const getLicenseKey = (prefix: string) => `${normalizePrefix(prefix)}_license_code`;
const getVerifiedKey = (prefix: string) => `${normalizePrefix(prefix)}_verified`;
const getDeviceIdKey = (prefix: string) => `${normalizePrefix(prefix)}_device_id`;

// 生成或获取持久化的设备唯一ID
export const getTugLicenseDeviceId = (config: TugLicenseProductConfig): string => {
    const storagePrefix = normalizePrefix(config.storagePrefix || config.licensePrefix);
    const deviceIdKey = getDeviceIdKey(storagePrefix);
    try {
        let deviceId = localStorage.getItem(deviceIdKey);
        if (!deviceId) {
            const randomPart = Math.random().toString(36).substring(2, 11);
            const timestamp = Date.now().toString(36);
            deviceId = `${storagePrefix}-${randomPart}-${timestamp}`;
            localStorage.setItem(deviceIdKey, deviceId);
        }
        return deviceId;
    } catch (e) {
        return `${storagePrefix}-temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
};

// 获取设备描述信息
export const getTugLicenseDeviceInfo = (fallback = 'Tug of War'): string => {
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
        return fallback;
    }
};

export const saveTugLicense = (config: TugLicenseProductConfig, code: string) => {
    const storagePrefix = config.storagePrefix || config.licensePrefix;
    localStorage.setItem(getLicenseKey(storagePrefix), code.toUpperCase().replace(/\s/g, ''));
    localStorage.setItem(getVerifiedKey(storagePrefix), 'true');
};

export const getTugLicense = (config: TugLicenseProductConfig) =>
    localStorage.getItem(getLicenseKey(config.storagePrefix || config.licensePrefix));

export const isTugLicenseVerified = (config: TugLicenseProductConfig) => {
    const storagePrefix = config.storagePrefix || config.licensePrefix;
    const verified = localStorage.getItem(getVerifiedKey(storagePrefix)) === 'true';
    const code = getTugLicense(config);
    return verified && !!code;
};

export const clearTugLicense = (config: TugLicenseProductConfig) => {
    const storagePrefix = config.storagePrefix || config.licensePrefix;
    localStorage.removeItem(getLicenseKey(storagePrefix));
    localStorage.removeItem(getVerifiedKey(storagePrefix));
};

export const verifyTugLicense = async (config: TugLicenseProductConfig, code: string): Promise<{ success: boolean; message?: string }> => {
    const cleanCode = code.replace(/[-\s]/g, '').toUpperCase();
    const licensePrefix = config.licensePrefix.toUpperCase();

    if (!cleanCode.startsWith(licensePrefix)) {
        return { success: false, message: `无效的授权码 (必须以 ${licensePrefix} 开头)` };
    }

    try {
        const response = await fetch('/api/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licenseCode: cleanCode,
                deviceId: getTugLicenseDeviceId(config),
                deviceInfo: getTugLicenseDeviceInfo(config.deviceInfo)
            }),
        });
        const data = await response.json();
        if (data.success) {
            saveTugLicense(config, cleanCode);
            return { success: true };
        }
        return { success: false, message: data.message || '验证失败' };
    } catch (error) {
        return { success: false, message: '网络请求失败，请检查网络连接' };
    }
};

const SX_CONFIG = { licensePrefix: 'SX', storagePrefix: 'sx', deviceInfo: 'Tug of War Math' };

export const getSXDeviceId = (): string => getTugLicenseDeviceId(SX_CONFIG);
export const getSXDeviceInfo = (): string => getTugLicenseDeviceInfo(SX_CONFIG.deviceInfo);
export const saveSXLicense = (code: string) => saveTugLicense(SX_CONFIG, code);
export const getSXLicense = () => getTugLicense(SX_CONFIG);
export const isSXVerified = () => isTugLicenseVerified(SX_CONFIG);
export const clearSXLicense = () => clearTugLicense(SX_CONFIG);
export const verifySXLicense = (code: string) => verifyTugLicense(SX_CONFIG, code);
