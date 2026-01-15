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

// Helper to extract prefix (first 8 chars of a clean GB license)
export const getLicensePrefix = (license: string): string => {
    const clean = license.replace(/[-\s]/g, '').toUpperCase();
    if (clean.startsWith('GB')) {
        return clean.substring(0, 8);
    }
    return '';
};

export const verifyLicense = async (code: string): Promise<{ success: boolean; message?: string }> => {
    const cleanCode = code.replace(/[-\s]/g, '').toUpperCase();

    // Only allow GB prefix for Broadcast Assistant
    if (!cleanCode.startsWith('GB')) {
        return { success: false, message: 'Invalid Broadcast License (Must start with GB)' };
    }

    try {
        const response = await fetch('/api/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: cleanCode }),
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem(BC_LICENSE_KEY, cleanCode);
            return { success: true };
        }
        return { success: false, message: data.message || 'Verification Failed' };
    } catch (error) {
        return { success: false, message: 'Network Error' };
    }
};
