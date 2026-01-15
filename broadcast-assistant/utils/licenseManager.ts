/**
 * 广播助手专用授权管理
 */
const BC_LICENSE_KEY = 'bc_license_code';
const BC_VERIFIED_KEY = 'bc_verified';

export const saveBCLicense = (code: string) => {
    localStorage.setItem(BC_LICENSE_KEY, code.toUpperCase().replace(/\s/g, ''));
    localStorage.setItem(BC_VERIFIED_KEY, 'true');
};

export const getBCLicense = () => localStorage.getItem(BC_LICENSE_KEY);

export const isBCVerified = () => {
    const verified = localStorage.getItem(BC_VERIFIED_KEY) === 'true';
    const code = getBCLicense();
    return verified && !!code;
};

export const clearBCLicense = () => {
    localStorage.removeItem(BC_LICENSE_KEY);
    localStorage.removeItem(BC_VERIFIED_KEY);
};

export const verifyLicense = async (code: string) => {
    try {
        const response = await fetch('/api/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licenseCode: code,
                deviceId: 'bc-device-' + Math.random().toString(36).substring(2), // 广播端简单处理
            }),
        });
        const result = await response.json();
        if (result.success) {
            saveBCLicense(code);
        }
        return result;
    } catch (e) {
        return { success: false, message: '网络请求失败' };
    }
};
