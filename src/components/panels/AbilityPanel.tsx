import { useGame } from '../../state/GameContext';
import { AbilityTrigger } from '../../types';
import { getAbilityById } from '../../core/abilityDefs';
import { getActiveAbilities, getActiveAbilityTargets } from '../../core/abilities';
import { findPieceById } from '../../core/board';
import './AbilityPanel.css';

export function AbilityPanel() {
  const { state, dispatch, t } = useGame();
  const { selectedPieceId, board, pendingAbility, isDoubleMoveActive, currentTurn } = state;

  const selectedPiece = selectedPieceId ? findPieceById(board, selectedPieceId) : null;

  // Show pending ability targeting info
  if (pendingAbility) {
    const def = getAbilityById(pendingAbility.abilityId);
    return (
      <div className="ability-panel">
        <h3 className="panel-title">{t('abilityPanel.title')}</h3>
        <div className="ability-targeting-info">
          <div className="ability-targeting-icon">{def?.icon}</div>
          <div className="ability-targeting-text">
            <span className="ability-targeting-name">{def ? t(def.nameKey) : ''}</span>
            <span className="ability-targeting-hint">{t('abilityPanel.selectTarget')}</span>
          </div>
          <button
            className="btn-cancel-ability"
            onClick={() => dispatch({ type: 'CANCEL_PENDING_ABILITY' })}
          >
            {t('abilityPanel.cancel')}
          </button>
        </div>
      </div>
    );
  }

  // Show double move banner
  if (isDoubleMoveActive) {
    return (
      <div className="ability-panel">
        <h3 className="panel-title">{t('abilityPanel.title')}</h3>
        <div className="double-move-banner">
          <span className="double-move-icon">⚡</span>
          <span>{t('abilityPanel.doubleMoveActive')}</span>
        </div>
      </div>
    );
  }

  // No piece selected
  if (!selectedPiece || selectedPiece.side !== currentTurn) {
    return (
      <div className="ability-panel">
        <h3 className="panel-title">{t('abilityPanel.title')}</h3>
        <div className="ability-empty">{t('abilityPanel.noAbilities')}</div>
      </div>
    );
  }

  // Show piece's frozen status
  if (selectedPiece.isFrozen) {
    return (
      <div className="ability-panel">
        <h3 className="panel-title">{t('abilityPanel.title')}</h3>
        <div className="ability-frozen-banner">
          <span>❄️</span>
          <span>{t('abilityPanel.frozen')}</span>
        </div>
      </div>
    );
  }

  // Show piece's abilities
  const abilities = selectedPiece.abilities;
  if (abilities.length === 0) {
    return (
      <div className="ability-panel">
        <h3 className="panel-title">{t('abilityPanel.title')}</h3>
        <div className="ability-empty">{t('abilityPanel.noAbilities')}</div>
      </div>
    );
  }

  const activeAbilities = getActiveAbilities(selectedPiece);

  return (
    <div className="ability-panel">
      <h3 className="panel-title">{t('abilityPanel.title')}</h3>
      <div className="ability-list">
        {abilities.map((inst, i) => {
          const def = getAbilityById(inst.abilityId);
          if (!def) return null;

          const isActive = def.triggerType === AbilityTrigger.Active;
          const isPassive = def.triggerType === AbilityTrigger.Passive;
          const hasCharges = inst.chargesRemaining > 0 || inst.chargesRemaining === -1;
          const canActivate = isActive && hasCharges && activeAbilities.some(a => a.abilityId === inst.abilityId);
          // Check if targeted ability has valid targets
          const targets = canActivate
            ? getActiveAbilityTargets(board, selectedPiece, inst.abilityId, state.capturedPieces)
            : [];
          const hasTargets = targets.length > 0;

          return (
            <div key={`${inst.abilityId}-${i}`} className={`ability-panel-card ${!hasCharges ? 'ability-depleted' : ''}`}>
              <div className="ability-panel-icon">{def.icon}</div>
              <div className="ability-panel-info">
                <span className="ability-panel-name">{t(def.nameKey)}</span>
                <span className="ability-panel-desc">{t(def.descriptionKey)}</span>
                <span className="ability-panel-charges">
                  {isPassive
                    ? t('abilityPanel.passive')
                    : inst.chargesRemaining === -1
                      ? t('abilityPanel.unlimited')
                      : t('abilityPanel.charges', { charges: String(inst.chargesRemaining) })}
                </span>
              </div>
              {canActivate && hasTargets && (
                <button
                  className="btn-activate-ability"
                  onClick={() => dispatch({
                    type: 'ACTIVATE_ABILITY',
                    pieceId: selectedPiece.id,
                    abilityId: inst.abilityId,
                  })}
                >
                  {t('abilityPanel.activate')}
                </button>
              )}
              {canActivate && !hasTargets && (
                <span className="ability-no-targets">{t('abilityPanel.noTargets')}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
