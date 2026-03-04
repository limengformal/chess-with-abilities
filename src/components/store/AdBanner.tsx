import { useSettings } from '../../state/SettingsContext';
import './AdBanner.css';

interface AdBannerProps {
  variant?: 'banner' | 'leaderboard';
}

export function AdBanner({ variant = 'banner' }: AdBannerProps) {
  const { settings, openStore, t } = useSettings();

  if (settings.adsRemoved) return null;

  return (
    <div className={`ad-banner ad-banner-${variant}`}>
      <span className="ad-banner-text">{t('ad.placeholder')}</span>
      <button className="ad-banner-remove" onClick={openStore}>
        {t('ad.removeAds')}
      </button>
    </div>
  );
}
