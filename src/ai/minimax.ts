/**
 * Minimax with alpha-beta pruning for AI opponent.
 * Operates on pure board state (no React dependency).
 */
import { Board, Side, PieceInstance, oppositeSide, Position } from '../types';
import { cloneBoard, findPieceById, getPieceAt } from '../core/board';
import { isCheckmate, isStalemate } from '../core/rules';
import {
  processCaptureAbilities,
  processPostCapture,
  processMinePlacement,
  checkMineTrigger,
  executeActiveAbility,
  processTurnStart,
} from '../core/abilities';
import { evaluateBoard } from './evaluate';
import { generateAllMoves, AIMove } from './moveGeneration';

const MAX_DEPTH = 3;
const QUIESCENCE_DEPTH = 2;

interface SearchResult {
  score: number;
  move: AIMove | null;
}

/**
 * Apply a move to the board and return the resulting board state.
 * Simplified version of the reducer's MOVE_PIECE logic.
 */
function applyMove(board: Board, move: AIMove, capturedPieces: PieceInstance[]): {
  board: Board;
  capturedPiece: PieceInstance | null;
  extraMove: boolean;
} {
  if (move.type === 'ability' && move.abilityId) {
    const piece = findPieceById(board, move.pieceId);
    if (!piece) return { board, capturedPiece: null, extraMove: false };

    const result = executeActiveAbility(board, piece, move.abilityId, move.to, capturedPieces);
    return {
      board: result.board,
      capturedPiece: result.capturedPieces.length > 0 ? result.capturedPieces[0] : null,
      extraMove: result.extraMove,
    };
  }

  // Regular move
  let currentBoard = cloneBoard(board);
  const piece = findPieceById(currentBoard, move.pieceId);
  if (!piece) return { board: currentBoard, capturedPiece: null, extraMove: false };

  const defender = getPieceAt(currentBoard, move.to);
  let capturedPiece: PieceInstance | null = null;
  let extraMove = false;

  let movedPiece: PieceInstance = {
    ...piece,
    position: move.to,
    fortifyTurnsStationary: 0,
  };

  if (defender) {
    const captureResult = processCaptureAbilities(currentBoard, piece, defender);
    if (!captureResult.captured) {
      // Shield/Fortify blocked — turn wasted
      return { board: captureResult.board, capturedPiece: null, extraMove: false };
    }
    capturedPiece = defender;
    if (captureResult.attackerModified) {
      movedPiece = { ...captureResult.attackerModified, position: move.to, fortifyTurnsStationary: 0 };
    }
  }

  // Execute the move
  currentBoard.grid[piece.position.row][piece.position.col] = null;
  currentBoard.grid[move.to.row][move.to.col] = movedPiece;

  // Mine placement
  const mineResult = processMinePlacement(currentBoard, movedPiece, piece.position);
  currentBoard = mineResult.board;

  // Mine trigger
  const mineTrigger = checkMineTrigger(currentBoard, movedPiece);
  currentBoard = mineTrigger.board;

  // Post-capture abilities
  if (capturedPiece) {
    const currentAttacker = currentBoard.grid[move.to.row][move.to.col];
    if (currentAttacker) {
      const postCapture = processPostCapture(currentBoard, currentAttacker);
      currentBoard = postCapture.board;
      if (postCapture.extraMove) extraMove = true;
    }
  }

  return { board: currentBoard, capturedPiece, extraMove };
}

function minimax(
  board: Board,
  side: Side,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  capturedPieces: PieceInstance[],
): SearchResult {
  // Terminal conditions
  if (isCheckmate(board, side)) {
    return { score: maximizing ? -99999 + (MAX_DEPTH - depth) : 99999 - (MAX_DEPTH - depth), move: null };
  }
  if (isStalemate(board, side)) {
    return { score: 0, move: null };
  }
  if (depth <= 0) {
    return { score: evaluateBoard(board, side), move: null };
  }

  const moves = generateAllMoves(board, side, capturedPieces);
  if (moves.length === 0) {
    return { score: evaluateBoard(board, side), move: null };
  }

  let bestMove: AIMove | null = null;

  if (maximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const result = applyMove(board, move, capturedPieces);
      const newCaptured = result.capturedPiece
        ? [...capturedPieces, result.capturedPiece]
        : capturedPieces;

      const nextSide = result.extraMove ? side : oppositeSide(side);
      const nextMaximizing = nextSide === Side.Red;

      // Process turn start if switching sides
      let nextBoard = result.board;
      if (nextSide !== side) {
        nextBoard = processTurnStart(nextBoard, nextSide);
      }

      const { score } = minimax(nextBoard, nextSide, depth - 1, alpha, beta, nextMaximizing, newCaptured);

      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const result = applyMove(board, move, capturedPieces);
      const newCaptured = result.capturedPiece
        ? [...capturedPieces, result.capturedPiece]
        : capturedPieces;

      const nextSide = result.extraMove ? side : oppositeSide(side);
      const nextMaximizing = nextSide === Side.Red;

      let nextBoard = result.board;
      if (nextSide !== side) {
        nextBoard = processTurnStart(nextBoard, nextSide);
      }

      const { score } = minimax(nextBoard, nextSide, depth - 1, alpha, beta, nextMaximizing, newCaptured);

      if (score < minScore) {
        minScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

/**
 * Find the best move for the given side.
 */
export function findBestMove(
  board: Board,
  side: Side,
  capturedPieces: PieceInstance[],
  depth: number = MAX_DEPTH,
): AIMove | null {
  const maximizing = side === Side.Red;
  const result = minimax(board, side, depth, -Infinity, Infinity, maximizing, capturedPieces);
  return result.move;
}
