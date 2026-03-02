import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { Side, PieceType, AbilityId } from '../../types';
import { ALL_ABILITIES, getAbilityById } from '../../core/abilityDefs';
import { getPiecesForSide } from '../../core/board';
import { PIECE_NAMES } from '../../core/constants';
import { AbilityCard } from '../abilities/AbilityCard';
import { MiniPieceIcon } from '../board/pieceArt';
import './PickPhase.css';

export function PickPhase() {
  const { state, dispatch, t, locale } = useGame();
  const { pickPhase, board } = state;
  const [selectedAbilityId, setSelectedAbilityId] = useState<AbilityId | null>(null);

  if (!pickPhase) return null;

  const side = pickPhase.currentPicker;
  const isRed = side === Side.Red;
  const budget = pickPhase.budgetRemaining[side];
  const pieces = getPiecesForSide(board, side);
  const assignments = pickPhase.assignments[side];

  const allBannedIds = state.banPhase
    ? [...state.banPhase.bannedAbilities[Side.Red], ...state.banPhase.bannedAbilities[Side.Black]]
    : [];

  const availableAbilities = ALL_ABILITIES.filter(
    a => pickPhase.availableAbilities.includes(a.id)
  );

  const handleAbilityClick = (abilityId: AbilityId) => {
    if (selectedAbilityId === abilityId) {
      setSelectedAbilityId(null);
    } else {
      setSelectedAbilityId(abilityId);
    }
  };

  const handlePieceClick = (pieceId: string) => {
    if (!selectedAbilityId) return;

    // Check if piece already has an assignment
    const existing = assignments.find(a => a.pieceId === pieceId);
    if (existing) return;

    dispatch({ type: 'PICK_ABILITY', abilityId: selectedAbilityId, pieceId });
    setSelectedAbilityId(null);
  };

  const handleRemoveAssignment = (pieceId: string, abilityId: AbilityId) => {
    dispatch({ type: 'UNPICK_ABILITY', abilityId, pieceId });
  };

  return (
    <div className="pick-phase animate-slide-in">
      <div className="pick-header">
        <h2 className="phase-title">{t('phase.pick')}</h2>
        <div className={`pick-turn ${isRed ? 'pick-turn-red' : 'pick-turn-black'}`}>
          <span className="pick-turn-dot" />
          {t(`side.${side}`)} — {t('pick.instruction', { budget: String(budget) })}
        </div>
        <p className="pick-hint">{t('pick.drag')}</p>
      </div>

      <div className="pick-layout">
        {/* Left: Ability pool */}
        <div className="pick-abilities">
          <h3 className="pick-section-title">{t('abilityPanel.title')}</h3>
          <div className="pick-ability-list">
            {availableAbilities.map(ability => {
              const isAssigned = assignments.some(a => a.abilityId === ability.id);
              return (
                <AbilityCard
                  key={ability.id}
                  ability={ability}
                  compact
                  selected={selectedAbilityId === ability.id}
                  disabled={ability.cost > budget || isAssigned}
                  onClick={() => handleAbilityClick(ability.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Right: Piece list */}
        <div className="pick-pieces">
          <h3 className="pick-section-title">
            {isRed ? t('side.red') : t('side.black')}
          </h3>
          <div className="pick-piece-list">
            {pieces.map(piece => {
              const assignment = assignments.find(a => a.pieceId === piece.id);
              const assignedAbility = assignment ? getAbilityById(assignment.abilityId) : null;
              const sideKey = isRed ? 'red' : 'black';
              const name = locale === 'zh'
                ? PIECE_NAMES[piece.type][sideKey].zh
                : PIECE_NAMES[piece.type][sideKey].en;

              return (
                <div
                  key={piece.id}
                  className={`pick-piece-card ${selectedAbilityId && !assignment ? 'pick-piece-targetable' : ''} ${assignment ? 'pick-piece-assigned' : ''}`}
                  onClick={() => handlePieceClick(piece.id)}
                >
                  <div className="pick-piece-icon">
                    <MiniPieceIcon type={piece.type} side={side} size={32} />
                  </div>
                  <div className="pick-piece-info">
                    <span className="pick-piece-name">{name}</span>
                    {assignedAbility && (
                      <span className="pick-piece-ability">
                        {assignedAbility.icon} {t(assignedAbility.nameKey)}
                        <button
                          className="pick-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAssignment(piece.id, assignedAbility.id);
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary pick-confirm-btn"
        onClick={() => {
          dispatch({ type: 'CONFIRM_PICKS' });
          setSelectedAbilityId(null);
        }}
      >
        {t('button.confirm')} ({isRed ? t('side.red') : t('side.black')})
      </button>
    </div>
  );
}
