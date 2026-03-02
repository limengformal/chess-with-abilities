import { useEffect, useState } from 'react';
import { useGame } from '../../state/GameContext';
import { Side, PieceType } from '../../types';
import { PIECE_NAMES } from '../../core/constants';
import { getAbilityById } from '../../core/abilityDefs';
import { BoardCanvas } from '../board/BoardCanvas';
import './EndScreen.css';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  duration: number;
}

function generateConfetti(count: number): ConfettiPiece[] {
  const colors = ['#E8556D', '#FFD166', '#7EC8B8', '#B088F9', '#FF9A8B', '#88D8B0', '#FFC75F'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 2,
    size: 6 + Math.random() * 8,
    duration: 2.5 + Math.random() * 2,
  }));
}

const COL_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

export function EndScreen() {
  const { state, dispatch, t, locale } = useGame();
  const [confetti] = useState(() => generateConfetti(50));
  const [showBanner, setShowBanner] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const isDraw = state.isDraw;
  const isRedWinner = state.winner === Side.Red;
  const winnerName = isDraw
    ? t('game.draw')
    : state.winner
      ? state.players[state.winner].name
      : t('game.draw');

  useEffect(() => {
    const t1 = setTimeout(() => setShowBanner(true), 300);
    const t2 = setTimeout(() => setShowBoard(true), 800);
    const t3 = setTimeout(() => setShowLog(true), 1100);
    const t4 = setTimeout(() => setShowButton(true), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="end-screen">
      {/* Confetti rain (skip for draws) */}
      {!isDraw && (
        <div className="confetti-container" aria-hidden="true">
          {confetti.map(c => (
            <div
              key={c.id}
              className="confetti-piece"
              style={{
                left: `${c.x}%`,
                backgroundColor: c.color,
                width: c.size,
                height: c.size * 1.4,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Victory / Draw banner */}
      {showBanner && (
        isDraw ? (
          <div className="victory-banner victory-draw">
            <div className="victory-emoji">🤝</div>
            <h1 className="victory-title">{t('game.draw')}</h1>
          </div>
        ) : (
          <div className={`victory-banner ${isRedWinner ? 'victory-red' : 'victory-black'}`}>
            <div className="victory-emoji">
              {isRedWinner ? '🎉' : '🎊'}
            </div>
            <h1 className="victory-title">
              {t('game.winner', { side: winnerName })}
            </h1>
            <div className="victory-emoji">
              🏆
            </div>
          </div>
        )
      )}

      {/* Final board state */}
      {showBoard && (
        <div className="end-board-wrapper">
          <BoardCanvas />
        </div>
      )}

      {/* Game log */}
      {showLog && (
        <div className="end-game-log">
          <h2 className="end-log-title">{t('endScreen.gameLog')}</h2>
          <div className="end-log-columns">
            {/* Move history */}
            <div className="end-log-section">
              <h3 className="end-log-section-title">{t('endScreen.moves')}</h3>
              <div className="end-log-scroll">
                {state.moveHistory.map((move, i) => {
                  const isRed = move.side === Side.Red;
                  const pieceName = locale === 'zh'
                    ? PIECE_NAMES[move.pieceType as PieceType]?.[isRed ? 'red' : 'black']?.zh
                    : PIECE_NAMES[move.pieceType as PieceType]?.[isRed ? 'red' : 'black']?.en;
                  const from = `${COL_LABELS[move.from.col]}${move.from.row}`;
                  const to = `${COL_LABELS[move.to.col]}${move.to.row}`;
                  const capture = move.captured ? '×' : '\u2192';
                  return (
                    <div key={i} className={`end-move-entry ${isRed ? 'end-entry-red' : 'end-entry-black'}`}>
                      <span className="end-move-num">{move.turnNumber}.</span>
                      <span className={`end-move-piece ${isRed ? 'text-red' : 'text-black'}`}>{pieceName}</span>
                      <span className="end-move-notation">{from} {capture} {to}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ability events */}
            <div className="end-log-section">
              <h3 className="end-log-section-title">{t('endScreen.abilities')}</h3>
              <div className="end-log-scroll">
                {state.abilityLog.length === 0 ? (
                  <div className="end-log-empty">-</div>
                ) : (
                  state.abilityLog.map((entry, i) => {
                    const abilityDef = getAbilityById(entry.abilityId);
                    const icon = abilityDef?.icon || '✨';
                    return (
                      <div key={i} className="end-ability-entry">
                        <span className="end-ability-turn">{entry.turnNumber}.</span>
                        <span className="end-ability-icon">{icon}</span>
                        <span className="end-ability-msg">{t(entry.messageKey)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rematch button */}
      {showButton && (
        <div className="end-actions">
          <button
            className="btn btn-primary btn-rematch"
            onClick={() => dispatch({ type: 'RESET_GAME' })}
          >
            {t('button.rematch')}
          </button>
        </div>
      )}
    </div>
  );
}
