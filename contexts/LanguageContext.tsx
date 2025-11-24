import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type GlobalLanguage = 'en' | 'zh-CN' | 'zh-TW' | 'ja';

interface LanguageContextType {
  language: GlobalLanguage;
  setLanguage: (lang: GlobalLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<GlobalLanguage>(() => {
    const saved = localStorage.getItem('global-language');
    return (saved as GlobalLanguage) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('global-language', language);
  }, [language]);

  const setLanguage = (lang: GlobalLanguage) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

