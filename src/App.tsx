import { GameProvider, useGame } from './state/GameContext';
import { GamePhase } from './types';
import { SetupScreen } from './components/phases/SetupScreen';
import { BanPhase } from './components/phases/BanPhase';
import { PickPhase } from './components/phases/PickPhase';
import { PlayPhase } from './components/phases/PlayPhase';
import { EndScreen } from './components/phases/EndScreen';
import { LanguageToggle } from './components/common/LanguageToggle';
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

  return (
    <div className={`app theme-${state.boardTheme}`}>
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">♟️</span>
          <span className="header-title">{t('game.title')}</span>
        </div>
        <LanguageToggle />
      </header>
      <main className="app-main">
        <GameRouter />
      </main>
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
