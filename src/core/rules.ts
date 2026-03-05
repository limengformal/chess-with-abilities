import { Board, Position, PieceInstance, PieceType, Side, oppositeSide, CheckInfo } from '../types';
import { cloneBoard, getAllPieces, getPieceAt, getPiecesForSide } from './board';
import { getRawMoves, isGeneralsFacing } from './moves';

/**
 * Simulate a move on a cloned board (without any ability logic).
 */
export function simulateMove(board: Board, piece: PieceInstance, to: Position): Board {
  const newBoard = cloneBoard(board);
  const { col: fromCol, row: fromRow } = piece.position;
  const { col: toCol, row: toRow } = to;

  const movingPiece = newBoard.grid[fromRow][fromCol]!;
  newBoard.grid[fromRow][fromCol] = null;
  newBoard.grid[toRow][toCol] = {
    ...movingPiece,
    position: { col: toCol, row: toRow },
  };

  return newBoard;
}

/**
 * Find the general for a given side.
 */
export function findGeneral(board: Board, side: Side): PieceInstance | null {
  const pieces = getAllPieces(board);
  return pieces.find(p => p.type === PieceType.General && p.side === side) ?? null;
}

/**
 * Check if a piece has active Fortify (charges available AND stationary 2+ turns).
 * Inlined to avoid importing from abilities.ts (circular dependency risk).
 */
export function hasActiveFortify(piece: PieceInstance): boolean {
  const fortify = piece.abilities.find(
    a => a.abilityId === 'fortify' && (a.chargesRemaining > 0 || a.chargesRemaining === -1)
  );
  return !!fortify && piece.fortifyTurnsStationary >= 2;
}

/**
 * Check if a side's general is in check.
 */
export function isInCheck(board: Board, side: Side): CheckInfo | null {
  const general = findGeneral(board, side);
  if (!general) return null;

  const enemy = oppositeSide(side);
  const enemyPieces = getPiecesForSide(board, enemy);
  const checkers: string[] = [];

  for (const piece of enemyPieces) {
    const moves = getRawMoves(piece, board);
    if (moves.some(m => m.col === general.position.col && m.row === general.position.row)) {
      checkers.push(piece.id);
    }
  }

  // Also check "flying general" rule
  if (isGeneralsFacing(board)) {
    const enemyGeneral = findGeneral(board, enemy);
    if (enemyGeneral) {
      checkers.push(enemyGeneral.id);
    }
  }

  if (checkers.length > 0) {
    return { side, checkedBy: checkers };
  }

  return null;
}

/**
 * Get all legal moves for a piece, filtering out moves that would leave
 * the player's own general in check or violate the flying general rule.
 */
export function getLegalMoves(piece: PieceInstance, board: Board): Position[] {
  if (piece.isFrozen) return [];

  const rawMoves = getRawMoves(piece, board);
  const legalMoves: Position[] = [];

  for (const move of rawMoves) {
    const newBoard = simulateMove(board, piece, move);

    // After this move, our general must not be in check
    const check = isInCheck(newBoard, piece.side);
    if (check) continue;

    // Flying general rule must not be violated
    if (isGeneralsFacing(newBoard)) continue;

    legalMoves.push(move);
  }

  return legalMoves;
}

/**
 * Check if a side is in checkmate (in check with no legal moves).
 * Exception: if the general has active Fortify, it can survive the capture,
 * so it's not true checkmate — the game continues.
 */
export function isCheckmate(board: Board, side: Side): boolean {
  const check = isInCheck(board, side);
  if (!check) return false;

  if (hasAnyLegalMove(board, side)) return false;

  // No legal moves — but Fortify can save the general from capture
  const general = findGeneral(board, side);
  if (general && hasActiveFortify(general)) return false;

  return true;
}

/**
 * Check if a side is in stalemate (not in check but no legal moves).
 */
export function isStalemate(board: Board, side: Side): boolean {
  const check = isInCheck(board, side);
  if (check) return false;

  return !hasAnyLegalMove(board, side);
}

/**
 * Check if a side has any legal move available.
 */
export function hasAnyLegalMove(board: Board, side: Side): boolean {
  const pieces = getPiecesForSide(board, side);
  for (const piece of pieces) {
    const moves = getLegalMoves(piece, board);
    if (moves.length > 0) return true;
  }
  return false;
}
