import { useSettings } from '../../state/SettingsContext';
import './StoreModal.css';

interface StoreModalProps {
  onClose: () => void;
}

export function StoreModal({ onClose }: StoreModalProps) {
  const { settings, t, purchaseRemoveAds, purchaseThemes, purchaseBundle } = useSettings();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="store-overlay" onClick={handleBackdropClick}>
      <div className="store-modal animate-slide-in">
        <button className="store-close" onClick={onClose}>✕</button>
        <h2 className="store-title">{t('store.title')}</h2>

        <div className="store-items">
          {/* Remove Ads */}
          <div className={`store-item ${settings.adsRemoved ? 'store-item-purchased' : ''}`}>
            <div className="store-item-icon">🚫</div>
            <div className="store-item-info">
              <h3 className="store-item-name">{t('store.removeAds')}</h3>
              <p className="store-item-desc">{t('store.removeAds.desc')}</p>
            </div>
            <div className="store-item-action">
              {settings.adsRemoved ? (
                <span className="store-purchased-badge">{t('store.purchased')}</span>
              ) : (
                <button className="btn btn-primary store-buy-btn" onClick={purchaseRemoveAds}>
                  {t('store.price.noAds')}
                </button>
              )}
            </div>
          </div>

          {/* Unlock Themes */}
          <div className={`store-item ${settings.themesUnlocked ? 'store-item-purchased' : ''}`}>
            <div className="store-item-icon">🎨</div>
            <div className="store-item-info">
              <h3 className="store-item-name">{t('store.unlockThemes')}</h3>
              <p className="store-item-desc">{t('store.unlockThemes.desc')}</p>
            </div>
            <div className="store-item-action">
              {settings.themesUnlocked ? (
                <span className="store-purchased-badge">{t('store.purchased')}</span>
              ) : (
                <button className="btn btn-primary store-buy-btn" onClick={purchaseThemes}>
                  {t('store.price.themes')}
                </button>
              )}
            </div>
          </div>

          {/* Bundle */}
          {(!settings.adsRemoved || !settings.themesUnlocked) && (
            <div className="store-item store-item-bundle">
              <div className="store-item-icon">✨</div>
              <div className="store-item-info">
                <h3 className="store-item-name">{t('store.bundle')}</h3>
                <p className="store-item-desc">{t('store.bundle.desc')}</p>
              </div>
              <div className="store-item-action">
                <button className="btn btn-accent store-buy-btn" onClick={purchaseBundle}>
                  {t('store.price.bundle')}
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="store-restore" onClick={() => {/* TODO: restore purchases */}}>
          {t('store.restore')}
        </button>
      </div>
    </div>
  );
}
