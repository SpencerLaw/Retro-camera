const LICENSE_KEY = 'xxdk_parent_license';
const DEVICE_ID_KEY = 'xxdk_device_id';
const VERIFIED_KEY = 'xxdk_verified';

export const getDeviceId = (): string => {
    try {
        let deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) {
            const randomPart = Math.random().toString(36).substring(2, 15);
            const timestamp = Date.now().toString(36);
            deviceId = `xxdk-${randomPart}-${timestamp}`;
            localStorage.setItem(DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    } catch (e) {
        return `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    }
};

export const getDeviceInfo = (): string => {
    try {
        const ua = navigator.userAgent;
        let deviceName = '未知设备';
        if (/iPhone/i.test(ua)) deviceName = 'iPhone';
        else if (/iPad/i.test(ua)) deviceName = 'iPad';
        else if (/Android/i.test(ua)) deviceName = 'Android';
        else if (/Windows/i.test(ua)) deviceName = 'Windows';
        else if (/Mac/i.test(ua)) deviceName = 'Mac';

        return deviceName;
    } catch (e) {
        return 'Unknown Device';
    }
};

export const saveLicense = (code: string) => {
    localStorage.setItem(LICENSE_KEY, code);
    localStorage.setItem(VERIFIED_KEY, 'true');
};

export const getSavedLicense = () => localStorage.getItem(LICENSE_KEY);
export const isVerified = () => localStorage.getItem(VERIFIED_KEY) === 'true';

export const getLicenseFromParentToken = (token?: string | null): string | null => {
    if (!token) return null;
    try {
        const decoded = atob(token);
        const [role, code] = decoded.split(':');
        return role === 'parent' && code ? code : null;
    } catch (e) {
        return null;
    }
};

export const recordKiddiePlanUsage = async (code?: string | null) => {
    const licenseCode = code || getSavedLicense() || getLicenseFromParentToken(localStorage.getItem('kp_parent_token'));
    if (!licenseCode) return;

    try {
        await fetch('/api/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'usage',
                licenseCode,
                deviceId: getDeviceId(),
                deviceInfo: getDeviceInfo(),
                product: 'kiddieplan'
            })
        });
    } catch (error) {
        console.debug('[License Usage] skipped', error);
    }
};

export const verifyLicense = async (code: string) => {
    const deviceId = getDeviceId();
    const deviceInfo = getDeviceInfo();

    const res = await fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            licenseCode: code,
            deviceId,
            deviceInfo,
            action: 'verify',
            product: 'kiddieplan'
        })
    });

    const result = await res.json();
    if (result.success) {
        saveLicense(code);
    }
    return result;
};
