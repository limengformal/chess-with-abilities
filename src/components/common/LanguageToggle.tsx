import { useGame } from '../../state/GameContext';
import './LanguageToggle.css';

export function LanguageToggle() {
  const { locale, toggleLocale } = useGame();

  return (
    <button className="language-toggle" onClick={toggleLocale} title="Switch language">
      <span className={`lang-option ${locale === 'en' ? 'lang-active' : ''}`}>EN</span>
      <span className="lang-divider">/</span>
      <span className={`lang-option ${locale === 'zh' ? 'lang-active' : ''}`}>中</span>
    </button>
  );
}
