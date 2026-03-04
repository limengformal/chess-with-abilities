import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Locale, createTranslator } from '../i18n/i18n';

interface Settings {
  adsRemoved: boolean;
  themesUnlocked: boolean;
  locale: Locale;
}

interface SettingsContextType {
  settings: Settings;
  locale: Locale;
  t: (key: string, params?: Record<string, string>) => string;
  toggleLocale: () => void;
  purchaseRemoveAds: () => void;
  purchaseThemes: () => void;
  purchaseBundle: () => void;
  isStoreOpen: boolean;
  openStore: () => void;
  closeStore: () => void;
}

const SettingsContext = createContext<SettingsContextType>(null!);

const DEFAULT_SETTINGS: Settings = {
  adsRemoved: false,
  themesUnlocked: false,
  locale: 'en',
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useLocalStorage<Settings>('chess_settings', DEFAULT_SETTINGS);
  const [isStoreOpen, setStoreOpen] = useState(false);

  const t = useMemo(() => createTranslator(settings.locale), [settings.locale]);

  const toggleLocale = useCallback(() => {
    setSettings(prev => ({ ...prev, locale: prev.locale === 'en' ? 'zh' : 'en' }));
  }, [setSettings]);

  // Stub purchase functions — toggle localStorage directly.
  // Wire to Stripe/Paddle/RevenueCat when ready.
  const purchaseRemoveAds = useCallback(() => {
    setSettings(prev => ({ ...prev, adsRemoved: true }));
  }, [setSettings]);

  const purchaseThemes = useCallback(() => {
    setSettings(prev => ({ ...prev, themesUnlocked: true }));
  }, [setSettings]);

  const purchaseBundle = useCallback(() => {
    setSettings(prev => ({ ...prev, adsRemoved: true, themesUnlocked: true }));
  }, [setSettings]);

  const openStore = useCallback(() => setStoreOpen(true), [setStoreOpen]);
  const closeStore = useCallback(() => setStoreOpen(false), [setStoreOpen]);

  const value = useMemo(() => ({
    settings,
    locale: settings.locale,
    t,
    toggleLocale,
    purchaseRemoveAds,
    purchaseThemes,
    purchaseBundle,
    isStoreOpen,
    openStore,
    closeStore,
  }), [settings, t, toggleLocale, purchaseRemoveAds, purchaseThemes, purchaseBundle, isStoreOpen, openStore, closeStore]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
