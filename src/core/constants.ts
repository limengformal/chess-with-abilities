import { Position, PieceType, Side } from '../types';

export const BOARD_COLS = 9;
export const BOARD_ROWS = 10;
export const RIVER_ROW_RED = 4;
export const RIVER_ROW_BLACK = 5;

export const DEFAULT_BAN_COUNT = 3;
export const DEFAULT_BUDGET = 10;

export interface PieceDef {
  type: PieceType;
  side: Side;
  position: Position;
}

export const INITIAL_PIECES: PieceDef[] = [
  // Red side (rows 0-4, bottom)
  { type: PieceType.Chariot, side: Side.Red, position: { col: 0, row: 0 } },
  { type: PieceType.Horse, side: Side.Red, position: { col: 1, row: 0 } },
  { type: PieceType.Elephant, side: Side.Red, position: { col: 2, row: 0 } },
  { type: PieceType.Advisor, side: Side.Red, position: { col: 3, row: 0 } },
  { type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 } },
  { type: PieceType.Advisor, side: Side.Red, position: { col: 5, row: 0 } },
  { type: PieceType.Elephant, side: Side.Red, position: { col: 6, row: 0 } },
  { type: PieceType.Horse, side: Side.Red, position: { col: 7, row: 0 } },
  { type: PieceType.Chariot, side: Side.Red, position: { col: 8, row: 0 } },
  { type: PieceType.Cannon, side: Side.Red, position: { col: 1, row: 2 } },
  { type: PieceType.Cannon, side: Side.Red, position: { col: 7, row: 2 } },
  { type: PieceType.Soldier, side: Side.Red, position: { col: 0, row: 3 } },
  { type: PieceType.Soldier, side: Side.Red, position: { col: 2, row: 3 } },
  { type: PieceType.Soldier, side: Side.Red, position: { col: 4, row: 3 } },
  { type: PieceType.Soldier, side: Side.Red, position: { col: 6, row: 3 } },
  { type: PieceType.Soldier, side: Side.Red, position: { col: 8, row: 3 } },

  // Black side (rows 5-9, top)
  { type: PieceType.Chariot, side: Side.Black, position: { col: 0, row: 9 } },
  { type: PieceType.Horse, side: Side.Black, position: { col: 1, row: 9 } },
  { type: PieceType.Elephant, side: Side.Black, position: { col: 2, row: 9 } },
  { type: PieceType.Advisor, side: Side.Black, position: { col: 3, row: 9 } },
  { type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 } },
  { type: PieceType.Advisor, side: Side.Black, position: { col: 5, row: 9 } },
  { type: PieceType.Elephant, side: Side.Black, position: { col: 6, row: 9 } },
  { type: PieceType.Horse, side: Side.Black, position: { col: 7, row: 9 } },
  { type: PieceType.Chariot, side: Side.Black, position: { col: 8, row: 9 } },
  { type: PieceType.Cannon, side: Side.Black, position: { col: 1, row: 7 } },
  { type: PieceType.Cannon, side: Side.Black, position: { col: 7, row: 7 } },
  { type: PieceType.Soldier, side: Side.Black, position: { col: 0, row: 6 } },
  { type: PieceType.Soldier, side: Side.Black, position: { col: 2, row: 6 } },
  { type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 6 } },
  { type: PieceType.Soldier, side: Side.Black, position: { col: 6, row: 6 } },
  { type: PieceType.Soldier, side: Side.Black, position: { col: 8, row: 6 } },
];

export const TREASURE_COUNT = 6;

export const PIECE_NAMES: Record<PieceType, { red: { en: string; zh: string }; black: { en: string; zh: string } }> = {
  [PieceType.General]: { red: { en: 'General', zh: '帅' }, black: { en: 'General', zh: '将' } },
  [PieceType.Advisor]: { red: { en: 'Advisor', zh: '仕' }, black: { en: 'Advisor', zh: '士' } },
  [PieceType.Elephant]: { red: { en: 'Elephant', zh: '相' }, black: { en: 'Elephant', zh: '象' } },
  [PieceType.Horse]: { red: { en: 'Horse', zh: '马' }, black: { en: 'Horse', zh: '馬' } },
  [PieceType.Chariot]: { red: { en: 'Chariot', zh: '车' }, black: { en: 'Chariot', zh: '車' } },
  [PieceType.Cannon]: { red: { en: 'Cannon', zh: '炮' }, black: { en: 'Cannon', zh: '砲' } },
  [PieceType.Soldier]: { red: { en: 'Soldier', zh: '兵' }, black: { en: 'Soldier', zh: '卒' } },
};
