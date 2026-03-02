import { useGame } from '../../state/GameContext';
import { Side, PieceType } from '../../types';
import { PIECE_NAMES } from '../../core/constants';
import './MoveHistory.css';

const COL_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

export function MoveHistory() {
  const { state, t, locale } = useGame();
  const { moveHistory } = state;

  if (moveHistory.length === 0) return null;

  return (
    <div className="move-history">
      <h3 className="panel-title">{t('moveHistory.title')}</h3>
      <div className="move-list">
        {moveHistory.map((move, i) => {
          const isRed = move.side === Side.Red;
          const pieceName = locale === 'zh'
            ? PIECE_NAMES[move.pieceType as PieceType]?.[isRed ? 'red' : 'black']?.zh
            : PIECE_NAMES[move.pieceType as PieceType]?.[isRed ? 'red' : 'black']?.en;
          const from = `${COL_LABELS[move.from.col]}${move.from.row}`;
          const to = `${COL_LABELS[move.to.col]}${move.to.row}`;
          const capture = move.captured ? '×' : '→';

          return (
            <div key={i} className={`move-entry ${isRed ? 'move-red' : 'move-black'}`}>
              <span className="move-number">{move.turnNumber}.</span>
              <span className={`move-piece-name ${isRed ? 'text-red' : 'text-black'}`}>
                {pieceName}
              </span>
              <span className="move-notation">
                {from} {capture} {to}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
