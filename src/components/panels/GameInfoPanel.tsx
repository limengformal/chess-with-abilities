import { useGame } from '../../state/GameContext';
import { Side, GamePhase, PlayerType } from '../../types';
import './GameInfoPanel.css';

export function GameInfoPanel() {
  const { state, dispatch, t } = useGame();
  const { currentTurn, turnNumber, checkState, phase, winner, drawProposal, isDraw } = state;

  if (phase === GamePhase.End) {
    return (
      <div className="game-info-panel winner-panel animate-bounce-in">
        <div className="winner-emoji">{isDraw ? '🤝' : '🎉'}</div>
        <div className="winner-text">
          {isDraw
            ? t('game.draw')
            : winner
              ? t('game.winner', { side: state.players[winner].name })
              : t('game.draw')}
        </div>
      </div>
    );
  }

  const isRed = currentTurn === Side.Red;
  const playerName = state.players[currentTurn].name;

  // Show draw proposal dialog if opponent proposed
  const showDrawDialog = drawProposal && drawProposal.proposedBy !== currentTurn
    && state.players[currentTurn].type === PlayerType.Human;

  return (
    <div className="game-info-panel">
      <div className="turn-info">
        <div
          className={`turn-indicator ${isRed ? 'turn-red' : 'turn-black'}`}
        >
          <span className="turn-dot" />
          <span className="turn-text">{playerName}</span>
        </div>
        <div className="turn-number">#{turnNumber}</div>
      </div>

      {checkState && (
        <div className="check-warning animate-bounce-in">
          ⚠️ {t('check.warning')}
        </div>
      )}

      {showDrawDialog && (
        <div className="draw-dialog animate-bounce-in">
          <span className="draw-dialog-text">
            {t('draw.proposed', { name: state.players[drawProposal!.proposedBy].name })}
          </span>
          <div className="draw-dialog-buttons">
            <button
              className="btn-draw-accept"
              onClick={() => dispatch({ type: 'RESPOND_DRAW', accept: true })}
            >
              {t('draw.accept')}
            </button>
            <button
              className="btn-draw-reject"
              onClick={() => dispatch({ type: 'RESPOND_DRAW', accept: false })}
            >
              {t('draw.reject')}
            </button>
          </div>
        </div>
      )}

      {drawProposal && drawProposal.proposedBy === currentTurn && (
        <div className="draw-pending">
          ⏳ {t('draw.proposed', { name: state.players[drawProposal.proposedBy].name })}
        </div>
      )}

      {phase === GamePhase.Play && !drawProposal && (
        <div className="action-buttons">
          <button
            className="btn-draw"
            onClick={() => dispatch({ type: 'PROPOSE_DRAW' })}
          >
            {t('draw.propose')}
          </button>
          <button
            className="btn-surrender"
            onClick={() => dispatch({ type: 'SURRENDER' })}
          >
            {t('game.surrender')}
          </button>
        </div>
      )}
    </div>
  );
}
