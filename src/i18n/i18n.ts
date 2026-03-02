import en from './en.json';
import zh from './zh.json';

export type Locale = 'en' | 'zh';

const translations: Record<Locale, Record<string, string>> = { en, zh };

export function createTranslator(locale: Locale) {
  return function t(key: string, params?: Record<string, string>): string {
    let str = translations[locale][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{{${k}}}`, v);
      }
    }
    return str;
  };
}
