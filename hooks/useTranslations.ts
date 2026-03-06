import React, { useMemo } from 'react';
import { useLanguage, GlobalLanguage } from '../contexts/LanguageContext';
// @ts-ignore
import enTranslations from '../public/locales/en.json';
// @ts-ignore
import zhCNTranslations from '../public/locales/zh-CN.json';
// @ts-ignore
import zhTWTranslations from '../public/locales/zh-TW.json';
// @ts-ignore
import jaTranslations from '../public/locales/ja.json';

const translations: Record<GlobalLanguage, any> = {
  'en': enTranslations,
  'zh-CN': zhCNTranslations,
  'zh-TW': zhTWTranslations,
  'ja': jaTranslations,
};

export const useTranslations = () => {
  const { language } = useLanguage();

  // Memoize the selected translation object
  const currentTranslations = useMemo(() =>
    translations[language] || translations['en'],
    [language]);

  // Memoize the translation function itself
  return React.useCallback((key: string): string => {
    const keys = key.split('.');
    let value: any = currentTranslations;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    return typeof value === 'string' ? value : key;
  }, [currentTranslations]);
};
