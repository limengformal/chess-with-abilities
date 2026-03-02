import { BoardCanvas } from '../board/BoardCanvas';
import { GameInfoPanel } from '../panels/GameInfoPanel';
import { MoveHistory } from '../panels/MoveHistory';
import { CapturedPieces } from '../panels/CapturedPieces';
import { AbilityPanel } from '../panels/AbilityPanel';
import { AbilityLog } from '../panels/AbilityLog';
import './PlayPhase.css';

export function PlayPhase() {
  return (
    <div className="play-phase">
      <GameInfoPanel />
      <div className="play-layout">
        <div className="play-side-panel play-side-left">
          <AbilityPanel />
          <AbilityLog />
        </div>
        <div className="play-board-area">
          <BoardCanvas />
        </div>
        <div className="play-side-panel">
          <CapturedPieces />
          <MoveHistory />
        </div>
      </div>
    </div>
  );
}
