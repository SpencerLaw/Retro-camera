import { useLanguage, GlobalLanguage } from '../contexts/LanguageContext';
// @ts-ignore
import enTranslations from '../locales/en.json';
// @ts-ignore
import zhCNTranslations from '../locales/zh-CN.json';
// @ts-ignore
import zhTWTranslations from '../locales/zh-TW.json';
// @ts-ignore
import jaTranslations from '../locales/ja.json';

const translations: Record<GlobalLanguage, any> = {
  'en': enTranslations,
  'zh-CN': zhCNTranslations,
  'zh-TW': zhTWTranslations,
  'ja': jaTranslations,
};

export const useTranslations = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'];
  
  return (key: string): string => {
    const keys = key.split('.');
    let value: any = t;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    return typeof value === 'string' ? value : key;
  };
};

