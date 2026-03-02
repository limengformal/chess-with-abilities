import { useGame } from '../../state/GameContext';
import { Side } from '../../types';
import { ALL_ABILITIES } from '../../core/abilityDefs';
import { AbilityCard } from '../abilities/AbilityCard';
import './BanPhase.css';

export function BanPhase() {
  const { state, dispatch, t } = useGame();
  const { banPhase } = state;

  if (!banPhase) return null;

  const currentSide = banPhase.currentBanner;
  const isRed = currentSide === Side.Red;
  const remaining = banPhase.bansRemaining[currentSide];
  const allBanned = [...banPhase.bannedAbilities[Side.Red], ...banPhase.bannedAbilities[Side.Black]];

  return (
    <div className="ban-phase animate-slide-in">
      <div className="ban-header">
        <h2 className="phase-title">{t('phase.ban')}</h2>
        <div className={`ban-turn ${isRed ? 'ban-turn-red' : 'ban-turn-black'}`}>
          <span className="ban-turn-dot" />
          {t(`side.${currentSide}`)} — {t('ban.instruction', { remaining: String(remaining) })}
        </div>
      </div>

      <div className="ban-scoreboard">
        <div className="ban-score ban-score-red">
          <span className="ban-score-label">{t('side.red')}</span>
          <div className="ban-score-bans">
            {banPhase.bannedAbilities[Side.Red].map(id => {
              const a = ALL_ABILITIES.find(ab => ab.id === id);
              return a ? <span key={id} className="ban-chip">{a.icon} {t(a.nameKey)}</span> : null;
            })}
            {Array.from({ length: banPhase.bansRemaining[Side.Red] }, (_, i) => (
              <span key={`empty-${i}`} className="ban-chip ban-chip-empty">?</span>
            ))}
          </div>
        </div>
        <div className="ban-score ban-score-black">
          <span className="ban-score-label">{t('side.black')}</span>
          <div className="ban-score-bans">
            {banPhase.bannedAbilities[Side.Black].map(id => {
              const a = ALL_ABILITIES.find(ab => ab.id === id);
              return a ? <span key={id} className="ban-chip">{a.icon} {t(a.nameKey)}</span> : null;
            })}
            {Array.from({ length: banPhase.bansRemaining[Side.Black] }, (_, i) => (
              <span key={`empty-${i}`} className="ban-chip ban-chip-empty">?</span>
            ))}
          </div>
        </div>
      </div>

      <div className="ban-ability-grid">
        {ALL_ABILITIES.map(ability => (
          <AbilityCard
            key={ability.id}
            ability={ability}
            banned={allBanned.includes(ability.id)}
            onClick={() => dispatch({ type: 'BAN_ABILITY', abilityId: ability.id })}
          />
        ))}
      </div>
    </div>
  );
}
