/**
 * Move generation for AI.
 * Generates all possible moves for a given side, including ability activations.
 */
import { Board, PieceInstance, Position, Side, PieceType } from '../types';
import { getPiecesForSide, cloneBoard, getPieceAt } from '../core/board';
import { getLegalMoves, isInCheck, isCheckmate } from '../core/rules';
import { getActiveAbilities, getActiveAbilityTargets } from '../core/abilities';

export interface AIMove {
  type: 'move' | 'ability';
  pieceId: string;
  from: Position;
  to: Position;
  abilityId?: string;
  // For sorting/prioritization
  priority: number;
}

export function generateAllMoves(board: Board, side: Side, capturedPieces: PieceInstance[]): AIMove[] {
  const moves: AIMove[] = [];
  const pieces = getPiecesForSide(board, side);
  const inCheck = isInCheck(board, side) !== null;

  for (const piece of pieces) {
    if (piece.isFrozen) continue;

    // Regular moves (always generated — already check-filtered by getLegalMoves)
    const legalMoves = getLegalMoves(piece, board);
    for (const to of legalMoves) {
      const target = getPieceAt(board, to);
      const isCapture = target !== null;
      moves.push({
        type: 'move',
        pieceId: piece.id,
        from: piece.position,
        to,
        priority: isCapture ? 100 + getMaterialValue(target!.type) : 0,
      });
    }

    // Active abilities — skip if in check (must resolve check with a move)
    if (inCheck) continue;
    const activeAbilities = getActiveAbilities(piece);
    for (const { abilityId } of activeAbilities) {
      const targets = getActiveAbilityTargets(board, piece, abilityId!, capturedPieces);

      if (abilityId === 'double-move') {
        // Self-targeting ability (no target needed)
        moves.push({
          type: 'ability',
          pieceId: piece.id,
          from: piece.position,
          to: piece.position,
          abilityId,
          priority: 80,
        });
      } else {
        // Limit ability targets to top 5 to avoid explosion
        const limitedTargets = targets.slice(0, 5);
        for (const target of limitedTargets) {
          moves.push({
            type: 'ability',
            pieceId: piece.id,
            from: piece.position,
            to: target,
            abilityId,
            priority: getAbilityPriority(abilityId!),
          });
        }
      }
    }
  }

  // Sort by priority (captures and high-value abilities first) for better pruning
  moves.sort((a, b) => b.priority - a.priority);

  return moves;
}

function getMaterialValue(type: PieceType): number {
  switch (type) {
    case PieceType.General: return 10000;
    case PieceType.Chariot: return 900;
    case PieceType.Cannon: return 450;
    case PieceType.Horse: return 400;
    case PieceType.Elephant: return 200;
    case PieceType.Advisor: return 200;
    case PieceType.Soldier: return 100;
  }
}

function getAbilityPriority(abilityId: string): number {
  switch (abilityId) {
    case 'range-attack': return 90;
    case 'teleport': return 70;
    case 'swap': return 40;
    case 'shadow-step': return 50;
    case 'resurrect': return 85;
    default: return 30;
  }
}
