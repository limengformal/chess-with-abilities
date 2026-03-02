import { useGame } from '../../state/GameContext';
import { Side } from '../../types';
import { MiniPieceIcon } from '../board/pieceArt';
import './CapturedPieces.css';

export function CapturedPieces() {
  const { state, t } = useGame();
  const { capturedPieces } = state;

  if (capturedPieces.length === 0) return null;

  const redCaptured = capturedPieces.filter(p => p.side === Side.Red);
  const blackCaptured = capturedPieces.filter(p => p.side === Side.Black);

  return (
    <div className="captured-pieces">
      <h3 className="panel-title">{t('capturedPieces.title')}</h3>
      <div className="captured-rows">
        {blackCaptured.length > 0 && (
          <div className="captured-row">
            <span className="captured-label text-black">⬛</span>
            <div className="captured-list">
              {blackCaptured.map((p, i) => (
                <span key={i} className="captured-piece animate-bounce-in">
                  <MiniPieceIcon type={p.type} side={Side.Black} size={24} />
                </span>
              ))}
            </div>
          </div>
        )}
        {redCaptured.length > 0 && (
          <div className="captured-row">
            <span className="captured-label text-red">🔴</span>
            <div className="captured-list">
              {redCaptured.map((p, i) => (
                <span key={i} className="captured-piece animate-bounce-in">
                  <MiniPieceIcon type={p.type} side={Side.Red} size={24} />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
