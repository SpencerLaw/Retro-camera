/**
 * 无痕模式检测工具
 * 注意：无法100%准确检测，但可以检测大部分情况
 */

export async function detectIncognito(): Promise<{
  isIncognito: boolean;
  confidence: 'high' | 'medium' | 'low';
  method: string;
}> {
  // 方法1：检测 IndexedDB quota（最准确）
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const { quota } = await navigator.storage.estimate();
      if (quota && quota < 120000000) { // 小于120MB通常是无痕模式
        return {
          isIncognito: true,
          confidence: 'high',
          method: 'storage-quota',
        };
      }
    } catch (e) {
      // 某些浏览器会在无痕模式下抛出异常
      return {
        isIncognito: true,
        confidence: 'medium',
        method: 'storage-error',
      };
    }
  }

  // 方法2：检测 FileSystem API
  if ('webkitRequestFileSystem' in window) {
    return new Promise((resolve) => {
      const fs = (window as any).webkitRequestFileSystem;
      fs(
        0,
        0,
        () => {
          resolve({
            isIncognito: false,
            confidence: 'medium',
            method: 'filesystem',
          });
        },
        () => {
          resolve({
            isIncognito: true,
            confidence: 'high',
            method: 'filesystem',
          });
        }
      );
    });
  }

  // 方法3：检测 localStorage 持久性
  try {
    const testKey = '__incognito_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
  } catch (e) {
    return {
      isIncognito: true,
      confidence: 'medium',
      method: 'localStorage-error',
    };
  }

  // 默认假设不是无痕模式
  return {
    isIncognito: false,
    confidence: 'low',
    method: 'unknown',
  };
}

// 获取浏览器信息（用于更好的指纹识别）
export function getBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
  };
}

