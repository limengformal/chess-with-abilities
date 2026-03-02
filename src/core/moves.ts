import { Board, Position, PieceInstance, PieceType, Side } from '../types';
import { BOARD_COLS, BOARD_ROWS } from './constants';
import { getPieceAt, isInBounds } from './board';

function isInPalace(pos: Position, side: Side): boolean {
  const colOk = pos.col >= 3 && pos.col <= 5;
  if (side === Side.Red) {
    return colOk && pos.row >= 0 && pos.row <= 2;
  }
  return colOk && pos.row >= 7 && pos.row <= 9;
}

function hasCrossedRiver(piece: PieceInstance): boolean {
  if (piece.side === Side.Red) {
    return piece.position.row >= 5;
  }
  return piece.position.row <= 4;
}

function getGeneralMoves(piece: PieceInstance, board: Board): Position[] {
  const moves: Position[] = [];
  const directions = [
    { col: 0, row: 1 },
    { col: 0, row: -1 },
    { col: 1, row: 0 },
    { col: -1, row: 0 },
  ];

  for (const dir of directions) {
    const pos: Position = {
      col: piece.position.col + dir.col,
      row: piece.position.row + dir.row,
    };
    if (!isInPalace(pos, piece.side)) continue;
    const target = getPieceAt(board, pos);
    if (!target || target.side !== piece.side) {
      moves.push(pos);
    }
  }

  return moves;
}

function getAdvisorMoves(piece: PieceInstance, board: Board): Position[] {
  const moves: Position[] = [];
  const directions = [
    { col: 1, row: 1 },
    { col: 1, row: -1 },
    { col: -1, row: 1 },
    { col: -1, row: -1 },
  ];

  for (const dir of directions) {
    const pos: Position = {
      col: piece.position.col + dir.col,
      row: piece.position.row + dir.row,
    };
    if (!isInPalace(pos, piece.side)) continue;
    const target = getPieceAt(board, pos);
    if (!target || target.side !== piece.side) {
      moves.push(pos);
    }
  }

  return moves;
}

function getElephantMoves(piece: PieceInstance, board: Board): Position[] {
  const moves: Position[] = [];
  const directions = [
    { col: 2, row: 2, blockCol: 1, blockRow: 1 },
    { col: 2, row: -2, blockCol: 1, blockRow: -1 },
    { col: -2, row: 2, blockCol: -1, blockRow: 1 },
    { col: -2, row: -2, blockCol: -1, blockRow: -1 },
  ];

  for (const dir of directions) {
    const pos: Position = {
      col: piece.position.col + dir.col,
      row: piece.position.row + dir.row,
    };
    if (!isInBounds(pos)) continue;

    // Elephants cannot cross the river
    if (piece.side === Side.Red && pos.row >= 5) continue;
    if (piece.side === Side.Black && pos.row <= 4) continue;

    // Check blocking point (elephant eye)
    const blockPos: Position = {
      col: piece.position.col + dir.blockCol,
      row: piece.position.row + dir.blockRow,
    };
    if (getPieceAt(board, blockPos)) continue;

    const target = getPieceAt(board, pos);
    if (!target || target.side !== piece.side) {
      moves.push(pos);
    }
  }

  return moves;
}

function getHorseMoves(piece: PieceInstance, board: Board): Position[] {
  const moves: Position[] = [];
  const steps = [
    { dx: 0, dy: 1, moves: [{ col: -1, row: 2 }, { col: 1, row: 2 }] },
    { dx: 0, dy: -1, moves: [{ col: -1, row: -2 }, { col: 1, row: -2 }] },
    { dx: 1, dy: 0, moves: [{ col: 2, row: -1 }, { col: 2, row: 1 }] },
    { dx: -1, dy: 0, moves: [{ col: -2, row: -1 }, { col: -2, row: 1 }] },
  ];

  for (const step of steps) {
    // Check blocking point (horse leg)
    const blockPos: Position = {
      col: piece.position.col + step.dx,
      row: piece.position.row + step.dy,
    };
    if (!isInBounds(blockPos) || getPieceAt(board, blockPos)) continue;

    for (const move of step.moves) {
      const pos: Position = {
        col: piece.position.col + move.col,
        row: piece.position.row + move.row,
      };
      if (!isInBounds(pos)) continue;
      const target = getPieceAt(board, pos);
      if (!target || target.side !== piece.side) {
        moves.push(pos);
      }
    }
  }

  return moves;
}

function getChariotMoves(piece: PieceInstance, board: Board): Position[] {
  const moves: Position[] = [];
  const directions = [
    { col: 0, row: 1 },
    { col: 0, row: -1 },
    { col: 1, row: 0 },
    { col: -1, row: 0 },
  ];

  for (const dir of directions) {
    for (let i = 1; i < Math.max(BOARD_COLS, BOARD_ROWS); i++) {
      const pos: Position = {
        col: piece.position.col + dir.col * i,
        row: piece.position.row + dir.row * i,
      };
      if (!isInBounds(pos)) break;
      const target = getPieceAt(board, pos);
      if (!target) {
        moves.push(pos);
      } else {
        if (target.side !== piece.side) {
          moves.push(pos);
        }
        break;
      }
    }
  }

  return moves;
}

function getCannonMoves(piece: PieceInstance, board: Board): Position[] {
  const moves: Position[] = [];
  const directions = [
    { col: 0, row: 1 },
    { col: 0, row: -1 },
    { col: 1, row: 0 },
    { col: -1, row: 0 },
  ];

  for (const dir of directions) {
    let foundPlatform = false;
    for (let i = 1; i < Math.max(BOARD_COLS, BOARD_ROWS); i++) {
      const pos: Position = {
        col: piece.position.col + dir.col * i,
        row: piece.position.row + dir.row * i,
      };
      if (!isInBounds(pos)) break;
      const target = getPieceAt(board, pos);

      if (!foundPlatform) {
        if (!target) {
          moves.push(pos); // Can move to empty square
        } else {
          foundPlatform = true; // Found the platform piece
        }
      } else {
        // After platform, can only capture the next piece
        if (target) {
          if (target.side !== piece.side) {
            moves.push(pos);
          }
          break;
        }
      }
    }
  }

  return moves;
}

function getSoldierMoves(piece: PieceInstance, board: Board): Position[] {
  const moves: Position[] = [];
  const forward = piece.side === Side.Red ? 1 : -1;
  const crossed = hasCrossedRiver(piece);

  // Forward move
  const forwardPos: Position = {
    col: piece.position.col,
    row: piece.position.row + forward,
  };
  if (isInBounds(forwardPos)) {
    const target = getPieceAt(board, forwardPos);
    if (!target || target.side !== piece.side) {
      moves.push(forwardPos);
    }
  }

  // Sideways moves (only after crossing river)
  if (crossed) {
    for (const dx of [-1, 1]) {
      const sidePos: Position = {
        col: piece.position.col + dx,
        row: piece.position.row,
      };
      if (!isInBounds(sidePos)) continue;
      const target = getPieceAt(board, sidePos);
      if (!target || target.side !== piece.side) {
        moves.push(sidePos);
      }
    }
  }

  return moves;
}

export function getRawMoves(piece: PieceInstance, board: Board): Position[] {
  switch (piece.type) {
    case PieceType.General: return getGeneralMoves(piece, board);
    case PieceType.Advisor: return getAdvisorMoves(piece, board);
    case PieceType.Elephant: return getElephantMoves(piece, board);
    case PieceType.Horse: return getHorseMoves(piece, board);
    case PieceType.Chariot: return getChariotMoves(piece, board);
    case PieceType.Cannon: return getCannonMoves(piece, board);
    case PieceType.Soldier: return getSoldierMoves(piece, board);
  }
}

/**
 * Check if the "flying general" rule is violated:
 * The two generals cannot face each other on the same column with no pieces between them.
 */
export function isGeneralsFacing(board: Board): boolean {
  let redGeneral: Position | null = null;
  let blackGeneral: Position | null = null;

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board.grid[row][col];
      if (piece?.type === PieceType.General) {
        if (piece.side === Side.Red) redGeneral = piece.position;
        else blackGeneral = piece.position;
      }
    }
  }

  if (!redGeneral || !blackGeneral) return false;
  if (redGeneral.col !== blackGeneral.col) return false;

  // Check if there are any pieces between them
  const minRow = Math.min(redGeneral.row, blackGeneral.row);
  const maxRow = Math.max(redGeneral.row, blackGeneral.row);
  for (let row = minRow + 1; row < maxRow; row++) {
    if (board.grid[row][redGeneral.col]) return false;
  }

  return true;
}
