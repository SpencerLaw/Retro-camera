const PRODUCT_CONFIGS = {
  math: {
    subjectMode: 'math',
    title: '数学拔河',
    licensePrefix: 'SX',
    storagePrefix: 'sx',
    deviceInfo: 'Tug of War Math',
  },
  word: {
    subjectMode: 'word',
    title: '英语单词拔河',
    licensePrefix: 'YW',
    storagePrefix: 'yw',
    deviceInfo: 'Tug of War Words',
  },
};

export const getTugOfWarProductConfig = (variant = 'math') =>
  PRODUCT_CONFIGS[variant] || PRODUCT_CONFIGS.math;
