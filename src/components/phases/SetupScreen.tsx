import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { BoardTheme } from '../../types';
import './SetupScreen.css';

const THEMES: { id: BoardTheme; emoji: string }[] = [
  { id: 'classic', emoji: '🏛️' },
  { id: 'desert', emoji: '🏜️' },
  { id: 'grassland', emoji: '🌿' },
  { id: 'night', emoji: '🌙' },
];

export function SetupScreen() {
  const { dispatch, t } = useGame();
  const [redName, setRedName] = useState('');
  const [blackName, setBlackName] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<BoardTheme>('classic');

  const handleStart = (mode: 'local' | 'ai') => {
    dispatch({ type: 'SET_BOARD_THEME', theme: selectedTheme });
    dispatch({
      type: 'START_GAME',
      mode,
      redName: redName.trim() || undefined,
      blackName: blackName.trim() || undefined,
    });
  };

  return (
    <div className="setup-screen animate-bounce-in">
      <div className="setup-logo">
        <span className="setup-emoji">♟️</span>
        <h1 className="setup-title">{t('game.title')}</h1>
        <p className="setup-subtitle">{t('game.subtitle')}</p>
      </div>

      <div className="setup-names">
        <div className="name-input-group">
          <label className="name-label">{t('setup.redName')}</label>
          <input
            type="text"
            className="name-input name-input-red"
            placeholder="Red"
            value={redName}
            onChange={e => setRedName(e.target.value)}
            maxLength={12}
          />
        </div>
        <div className="name-input-group">
          <label className="name-label">{t('setup.blackName')}</label>
          <input
            type="text"
            className="name-input name-input-black"
            placeholder="Black"
            value={blackName}
            onChange={e => setBlackName(e.target.value)}
            maxLength={12}
          />
        </div>
      </div>

      <div className="setup-theme">
        <label className="theme-label">{t('setup.theme')}</label>
        <div className="theme-cards">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              className={`theme-card ${selectedTheme === theme.id ? 'theme-card-active' : ''}`}
              onClick={() => setSelectedTheme(theme.id)}
            >
              <span className="theme-emoji">{theme.emoji}</span>
              <span className="theme-name">{t(`theme.${theme.id}`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="setup-modes">
        <button
          className="mode-card"
          onClick={() => handleStart('local')}
        >
          <span className="mode-icon">👥</span>
          <span className="mode-label">{t('setup.mode.local')}</span>
        </button>

        <button
          className="mode-card"
          onClick={() => handleStart('ai')}
        >
          <span className="mode-icon">🤖</span>
          <span className="mode-label">{t('setup.mode.ai')}</span>
        </button>
      </div>
    </div>
  );
}
