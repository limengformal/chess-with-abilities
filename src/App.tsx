import { GameProvider, useGame } from './state/GameContext';
import { SettingsProvider, useSettings } from './state/SettingsContext';
import { GamePhase } from './types';
import { SetupScreen } from './components/phases/SetupScreen';
import { BanPhase } from './components/phases/BanPhase';
import { PickPhase } from './components/phases/PickPhase';
import { PlayPhase } from './components/phases/PlayPhase';
import { EndScreen } from './components/phases/EndScreen';
import { LanguageToggle } from './components/common/LanguageToggle';
import { StoreModal } from './components/store/StoreModal';
import './styles/global.css';
import './App.css';

function GameRouter() {
  const { state } = useGame();

  switch (state.phase) {
    case GamePhase.Setup:
      return <SetupScreen />;
    case GamePhase.Ban:
      return <BanPhase />;
    case GamePhase.Pick:
      return <PickPhase />;
    case GamePhase.Play:
      return <PlayPhase />;
    case GamePhase.End:
      return <EndScreen />;
    default:
      return <SetupScreen />;
  }
}

function AppContent() {
  const { state, t } = useGame();
  const { settings, openStore, isStoreOpen, closeStore } = useSettings();
  const showUpgrade = !settings.adsRemoved || !settings.themesUnlocked;

  return (
    <div className={`app theme-${state.boardTheme}`}>
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">♟️</span>
          <span className="header-title">{t('game.title')}</span>
        </div>
        <div className="header-right">
          {showUpgrade && (
            <button className="header-upgrade-btn" onClick={openStore} title={t('store.title')}>
              ⭐ {t('store.title')}
            </button>
          )}
          <LanguageToggle />
        </div>
      </header>
      <main className="app-main">
        <GameRouter />
      </main>
      {isStoreOpen && <StoreModal onClose={closeStore} />}
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </SettingsProvider>
  );
}

export default App;
