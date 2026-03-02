/**
 * Board evaluation for AI.
 * Returns a score from Red's perspective (positive = good for Red).
 */
import { Board, PieceInstance, PieceType, Side, Position } from '../types';
import { getAllPieces, getPiecesForSide } from '../core/board';
import { isInCheck, isCheckmate, isStalemate } from '../core/rules';

// Material values for each piece type
const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.General]: 10000,
  [PieceType.Chariot]: 900,
  [PieceType.Cannon]: 450,
  [PieceType.Horse]: 400,
  [PieceType.Elephant]: 200,
  [PieceType.Advisor]: 200,
  [PieceType.Soldier]: 100,
};

// Positional bonuses: soldiers are worth more after crossing river
function soldierPositionBonus(piece: PieceInstance): number {
  if (piece.type !== PieceType.Soldier) return 0;
  if (piece.side === Side.Red) {
    // Red soldiers cross river at row >= 5
    if (piece.position.row >= 5) return 80; // Can move sideways
    return 0;
  } else {
    // Black soldiers cross river at row <= 4
    if (piece.position.row <= 4) return 80;
    return 0;
  }
}

// Central control bonus for chariots, cannons, horses
function mobilityBonus(piece: PieceInstance): number {
  const { col, row } = piece.position;
  // Center columns (3, 4, 5) are more valuable
  const colBonus = col >= 3 && col <= 5 ? 10 : 0;
  // Advancement bonus (pieces closer to enemy side)
  let advanceBonus = 0;
  if (piece.side === Side.Red) {
    advanceBonus = Math.min(row, 5) * 3; // More advanced = better
  } else {
    advanceBonus = Math.min(9 - row, 5) * 3;
  }
  return colBonus + advanceBonus;
}

// Ability value bonus — AI only knows its own abilities, plus scouted enemy abilities
function abilityBonus(piece: PieceInstance, aiSide: Side): number {
  // AI doesn't know enemy abilities unless the piece was scouted (isRevealed)
  if (piece.side !== aiSide && !piece.isRevealed) return 0;
  let bonus = 0;
  for (const ability of piece.abilities) {
    const charges = ability.chargesRemaining === -1 ? 3 : ability.chargesRemaining;
    if (charges <= 0) continue;

    switch (ability.abilityId) {
      case 'shield': bonus += 150; break;
      case 'teleport': bonus += 120; break;
      case 'double-move': bonus += 130; break;
      case 'freeze': bonus += 80 * charges; break;
      case 'resurrect': bonus += 200; break;
      case 'range-attack': bonus += 100; break;
      case 'swap': bonus += 60; break;
      case 'mine': bonus += 50 * charges; break;
      case 'scout': bonus += 30 * charges; break;
      case 'berserk': bonus += 150; break;
      case 'fortify': bonus += piece.fortifyTurnsStationary >= 2 ? 200 : 50; break;
      case 'poison': bonus += 100; break;
      case 'shadow-step': bonus += 70 * charges; break;
      case 'iron-will': bonus += 30; break;
    }
  }
  return bonus;
}

export function evaluateBoard(board: Board, currentTurn: Side): number {
  // Check for terminal states
  if (isCheckmate(board, Side.Red)) return -99999;
  if (isCheckmate(board, Side.Black)) return 99999;
  if (isStalemate(board, currentTurn)) return 0;

  let score = 0;
  const allPieces = getAllPieces(board);

  for (const piece of allPieces) {
    const sign = piece.side === Side.Red ? 1 : -1;

    // Material
    score += sign * PIECE_VALUES[piece.type];

    // Position
    score += sign * soldierPositionBonus(piece);
    score += sign * mobilityBonus(piece);

    // Abilities (AI only evaluates its own + scouted enemy abilities)
    score += sign * abilityBonus(piece, Side.Black);

    // Frozen penalty
    if (piece.isFrozen) {
      score -= sign * 50;
    }
  }

  // Check bonus
  const checkRed = isInCheck(board, Side.Red);
  const checkBlack = isInCheck(board, Side.Black);
  if (checkRed) score -= 30;
  if (checkBlack) score += 30;

  return score;
}
