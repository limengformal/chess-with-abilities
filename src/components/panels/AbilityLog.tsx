import { useGame } from '../../state/GameContext';
import { getAbilityById } from '../../core/abilityDefs';
import './AbilityPanel.css';

export function AbilityLog() {
  const { state, t } = useGame();
  const { abilityLog } = state;

  if (abilityLog.length === 0) return null;

  // Show last 5 entries, most recent first
  const recentLogs = abilityLog.slice(-5).reverse();

  return (
    <div className="ability-panel">
      <h3 className="panel-title">Log</h3>
      <div className="ability-log">
        {recentLogs.map((entry, i) => {
          const def = getAbilityById(entry.abilityId);
          return (
            <div key={i} className="ability-log-entry">
              <span className="ability-log-icon">{def?.icon || '?'}</span>
              <span>{t(entry.messageKey)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
