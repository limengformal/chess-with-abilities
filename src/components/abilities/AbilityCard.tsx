import { AbilityDef } from '../../types';
import { useGame } from '../../state/GameContext';
import './AbilityCard.css';

interface AbilityCardProps {
  ability: AbilityDef;
  onClick?: () => void;
  disabled?: boolean;
  banned?: boolean;
  selected?: boolean;
  compact?: boolean;
}

export function AbilityCard({ ability, onClick, disabled, banned, selected, compact }: AbilityCardProps) {
  const { t } = useGame();

  const costStars = Array.from({ length: ability.cost }, (_, i) => (
    <span key={i} className="cost-star">★</span>
  ));

  return (
    <button
      className={`ability-card ${banned ? 'ability-banned' : ''} ${selected ? 'ability-selected' : ''} ${disabled ? 'ability-disabled' : ''} ${compact ? 'ability-compact' : ''}`}
      onClick={onClick}
      disabled={disabled || banned}
    >
      <div className="ability-icon">{ability.icon}</div>
      <div className="ability-info">
        <div className="ability-name">{t(ability.nameKey)}</div>
        {!compact && (
          <div className="ability-desc">{t(ability.descriptionKey)}</div>
        )}
      </div>
      <div className="ability-cost">{costStars}</div>
      {banned && <div className="ability-ban-overlay">✕</div>}
    </button>
  );
}
