import { Board, BoardGrid, Position, TreasurePoint, PieceInstance, PieceType, Side } from '../types';
import { BOARD_COLS, BOARD_ROWS, INITIAL_PIECES, TREASURE_COUNT } from './constants';

let pieceCounter = 0;

function createPieceId(side: Side, type: PieceType): string {
  pieceCounter++;
  return `${side}-${type}-${pieceCounter}`;
}

export function resetPieceCounter(): void {
  pieceCounter = 0;
}

export function createEmptyGrid(): BoardGrid {
  const grid: BoardGrid = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < BOARD_COLS; col++) {
      grid[row][col] = null;
    }
  }
  return grid;
}

export function createInitialBoard(): Board {
  resetPieceCounter();
  const grid = createEmptyGrid();

  for (const def of INITIAL_PIECES) {
    const piece: PieceInstance = {
      id: createPieceId(def.side, def.type),
      type: def.type,
      side: def.side,
      position: { col: def.position.col, row: def.position.row },
      abilities: [],
      isFrozen: false,
      frozenTurnsRemaining: 0,
      fortifyTurnsStationary: 0,
      isRevealed: false,
    };
    grid[def.position.row][def.position.col] = piece;
  }

  // Collect all empty positions and randomly place treasures
  const emptyPositions: Position[] = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (grid[row][col] === null) {
        emptyPositions.push({ col, row });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = emptyPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emptyPositions[i], emptyPositions[j]] = [emptyPositions[j], emptyPositions[i]];
  }

  const treasurePoints: TreasurePoint[] = emptyPositions.slice(0, TREASURE_COUNT).map(pos => ({
    position: pos,
    collected: false,
  }));

  return { grid, treasurePoints, mines: [] };
}

export function getPieceAt(board: Board, pos: Position): PieceInstance | null {
  if (pos.row < 0 || pos.row >= BOARD_ROWS || pos.col < 0 || pos.col >= BOARD_COLS) {
    return null;
  }
  return board.grid[pos.row][pos.col];
}

export function getAllPieces(board: Board): PieceInstance[] {
  const pieces: PieceInstance[] = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board.grid[row][col];
      if (piece) pieces.push(piece);
    }
  }
  return pieces;
}

export function getPiecesForSide(board: Board, side: Side): PieceInstance[] {
  return getAllPieces(board).filter(p => p.side === side);
}

export function findPieceById(board: Board, id: string): PieceInstance | null {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board.grid[row][col];
      if (piece && piece.id === id) return piece;
    }
  }
  return null;
}

export function isInBounds(pos: Position): boolean {
  return pos.col >= 0 && pos.col < BOARD_COLS && pos.row >= 0 && pos.row < BOARD_ROWS;
}

export function cloneBoard(board: Board): Board {
  const grid: BoardGrid = board.grid.map(row =>
    row.map(cell =>
      cell ? { ...cell, abilities: cell.abilities.map(a => ({ ...a, metadata: { ...a.metadata } })) } : null
    )
  );
  return {
    grid,
    treasurePoints: board.treasurePoints.map(tp => ({ ...tp, position: { ...tp.position } })),
    mines: board.mines.map(m => ({ ...m, position: { ...m.position } })),
  };
}
