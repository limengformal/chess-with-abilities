import { describe, it, expect } from 'vitest';
import {
  PieceInstance, PieceType, Side, AbilityInstance, Board,
} from '../../types';
import { createEmptyGrid } from '../board';
import { getLegalMoves, isCheckmate, isInCheck, simulateMove } from '../rules';
import { getAbilityById } from '../abilityDefs';

// ---- Test Helpers ----

function createTestPiece(overrides: Partial<PieceInstance> = {}): PieceInstance {
  return {
    id: 'test-piece',
    type: PieceType.Chariot,
    side: Side.Red,
    position: { col: 4, row: 4 },
    abilities: [],
    isFrozen: false,
    frozenTurnsRemaining: 0,
    fortifyTurnsStationary: 0,
    isRevealed: false,
    ...overrides,
  };
}

function createTestBoard(pieces: PieceInstance[]): Board {
  const grid = createEmptyGrid();
  for (const piece of pieces) {
    grid[piece.position.row][piece.position.col] = piece;
  }
  return { grid, treasurePoints: [], mines: [] };
}

function addAbility(piece: PieceInstance, abilityId: string, charges?: number): PieceInstance {
  const def = getAbilityById(abilityId);
  const inst: AbilityInstance = {
    abilityId,
    chargesRemaining: charges ?? def?.maxCharges ?? 1,
    isActive: false,
    metadata: {},
  };
  return { ...piece, abilities: [...piece.abilities, inst] };
}

// ---- Tests ----

describe('Check enforcement', () => {
  it('non-resolving moves are filtered when in check', () => {
    // Red General at (4,0) in check from Black Chariot at (4,9)
    const redGeneral = createTestPiece({
      id: 'red-general',
      type: PieceType.General,
      side: Side.Red,
      position: { col: 4, row: 0 },
    });
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 4, row: 9 },
    });
    // Red Chariot at (0,0) — cannot block/capture, should have 0 moves
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 0, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, redChariot, blackGeneral]);
    // Verify check is detected
    const check = isInCheck(board, Side.Red);
    expect(check).not.toBeNull();
    // Red Chariot at (0,0) can't block or capture — 0 legal moves
    const moves = getLegalMoves(redChariot, board);
    expect(moves.length).toBe(0);
  });

  it('blocking move is allowed when in check', () => {
    // Red General at (4,0) in check from Black Chariot at (4,9)
    const redGeneral = createTestPiece({
      id: 'red-general',
      type: PieceType.General,
      side: Side.Red,
      position: { col: 4, row: 0 },
    });
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 4, row: 9 },
    });
    // Red Chariot at (0,3) — can move to (4,3) to block
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 0, row: 3 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, redChariot, blackGeneral]);
    const moves = getLegalMoves(redChariot, board);
    // Should be able to block by moving to col 4 between rows 1 and 8
    const blockingMoves = moves.filter(m => m.col === 4);
    expect(blockingMoves.length).toBeGreaterThan(0);
    // All legal moves must be on col 4 (blocking the check)
    for (const move of moves) {
      expect(move.col).toBe(4);
    }
  });

  it('capturing the checker is allowed', () => {
    // Red General at (4,0) in check from Black Chariot at (4,3)
    const redGeneral = createTestPiece({
      id: 'red-general',
      type: PieceType.General,
      side: Side.Red,
      position: { col: 4, row: 0 },
    });
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 4, row: 3 },
    });
    // Red Chariot at (0,3) — can capture Black Chariot at (4,3)
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 0, row: 3 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, redChariot, blackGeneral]);
    const moves = getLegalMoves(redChariot, board);
    // Should include capture at (4,3)
    const captureMove = moves.find(m => m.col === 4 && m.row === 3);
    expect(captureMove).toBeDefined();
  });

  it('general can escape to safe squares', () => {
    // Red General at (4,0) in check from Black Chariot at (4,5)
    const redGeneral = createTestPiece({
      id: 'red-general',
      type: PieceType.General,
      side: Side.Red,
      position: { col: 4, row: 0 },
    });
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 4, row: 5 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, blackGeneral]);
    const moves = getLegalMoves(redGeneral, board);
    // General should be able to move to (3,0), (5,0), or (4,1)
    // But (4,1) is still on col 4, still in check from chariot → filtered
    // (3,0) is safe, (5,0) is safe
    // Also check flying general: (3,0) - Black general is at (3,9), same col 3.
    // Is there anything between them? Nothing on col 3 between rows 0 and 9.
    // So flying general rule would apply at (3,0) → filtered!
    // (5,0) is in palace? Palace is col 3-5, row 0-2 for Red. (5,0) is in palace.
    // Black general at (3,9), Red general at (5,0) → different columns → no flying general → safe
    expect(moves).toEqual(expect.arrayContaining([{ col: 5, row: 0 }]));
    // (4,1) should NOT be in moves (still in check from chariot at col 4)
    expect(moves.find(m => m.col === 4 && m.row === 1)).toBeUndefined();
  });

  it('cannon check restricts to check-resolving moves', () => {
    // Red General at (4,0) in check from Black Cannon at (4,9) with screen at (4,5)
    const redGeneral = createTestPiece({
      id: 'red-general',
      type: PieceType.General,
      side: Side.Red,
      position: { col: 4, row: 0 },
    });
    const blackCannon = createTestPiece({
      id: 'black-cannon',
      type: PieceType.Cannon,
      side: Side.Black,
      position: { col: 4, row: 9 },
    });
    // Screen piece between cannon and general
    const redSoldier = createTestPiece({
      id: 'red-soldier',
      type: PieceType.Soldier,
      side: Side.Red,
      position: { col: 4, row: 5 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });
    // Red Horse at (2,1) far from action
    const redHorse = createTestPiece({
      id: 'red-horse',
      type: PieceType.Horse,
      side: Side.Red,
      position: { col: 2, row: 1 },
    });

    const board = createTestBoard([redGeneral, blackCannon, redSoldier, blackGeneral, redHorse]);
    // Verify check
    const check = isInCheck(board, Side.Red);
    expect(check).not.toBeNull();

    // The soldier at (4,5) is the screen — if it moves away, cannon loses check!
    // Moving the soldier off column 4 removes the screen → resolves check
    const soldierMoves = getLegalMoves(redSoldier, board);
    // Soldier at (4,5) has crossed river (Red, row>=5), can move forward or sideways
    // Forward: (4,6) — still on col 4, still a screen → check persists
    // Sideways: (3,5) or (5,5) — removes screen, cannon can't check → resolves check!
    expect(soldierMoves.length).toBeGreaterThan(0);

    // Horse should only have check-resolving moves (or none)
    const horseMoves = getLegalMoves(redHorse, board);
    // Horse at (2,1): can move to various positions
    // Any move that resolves check is valid; others are not
    for (const move of horseMoves) {
      // Verify each move actually resolves check
      // simulateMove imported at top of file
      const newBoard = simulateMove(board, redHorse, move);
      expect(isInCheck(newBoard, Side.Red)).toBeNull();
    }
  });

  it('double check only allows general moves', () => {
    // Red General at (4,0) checked by two pieces simultaneously
    const redGeneral = createTestPiece({
      id: 'red-general',
      type: PieceType.General,
      side: Side.Red,
      position: { col: 4, row: 0 },
    });
    // Black Chariot checking along column 4
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 4, row: 5 },
    });
    // Black Horse also checking (from (3,2) → attacks (4,0) via L-shape)
    const blackHorse = createTestPiece({
      id: 'black-horse',
      type: PieceType.Horse,
      side: Side.Black,
      position: { col: 3, row: 2 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 5, row: 9 },
    });
    // Red Chariot — in double check, only general moves can help
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 0, row: 0 },
    });

    const board = createTestBoard([redGeneral, blackChariot, blackHorse, blackGeneral, redChariot]);

    // Verify double check
    const check = isInCheck(board, Side.Red);
    expect(check).not.toBeNull();
    expect(check!.checkedBy.length).toBe(2);

    // Red Chariot should have 0 legal moves (can't block two checkers at once)
    const chariotMoves = getLegalMoves(redChariot, board);
    expect(chariotMoves.length).toBe(0);

    // General should still have some escape moves
    const generalMoves = getLegalMoves(redGeneral, board);
    // All moves must escape BOTH checks
    for (const move of generalMoves) {
      // simulateMove imported at top of file
      const newBoard = simulateMove(board, redGeneral, move);
      expect(isInCheck(newBoard, Side.Red)).toBeNull();
    }
  });
});

describe('Fortify-aware check logic', () => {
  it('Fortify does NOT bypass check filtering for other pieces', () => {
    // Red General at (4,0) with Fortify active, stationary 3 turns
    const redGeneral = addAbility(
      createTestPiece({
        id: 'red-general',
        type: PieceType.General,
        side: Side.Red,
        position: { col: 4, row: 0 },
        fortifyTurnsStationary: 3,
      }),
      'fortify', 1,
    );
    // Black Chariot at (4,9) giving check along the file
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 4, row: 9 },
    });
    // Red Chariot at (0,0) — cannot block or capture, even with Fortify on general
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 0, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, redChariot, blackGeneral]);
    const moves = getLegalMoves(redChariot, board);
    // Red Chariot should have 0 legal moves — Fortify does NOT bypass check
    expect(moves.length).toBe(0);
  });

  it('isCheckmate returns false when General has active Fortify', () => {
    // Red General trapped in corner with Fortify active, in check, no escape moves
    const redGeneral = addAbility(
      createTestPiece({
        id: 'red-general',
        type: PieceType.General,
        side: Side.Red,
        position: { col: 3, row: 0 },
        fortifyTurnsStationary: 2,
      }),
      'fortify', 1,
    );
    // Black Chariot checking the General
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 3, row: 5 },
    });
    // Black pieces blocking General escape
    const blackSoldier1 = createTestPiece({
      id: 'black-soldier1',
      type: PieceType.Soldier,
      side: Side.Black,
      position: { col: 4, row: 0 },
    });
    // Red has a piece that can't block the check
    const redSoldier = createTestPiece({
      id: 'red-soldier',
      type: PieceType.Soldier,
      side: Side.Red,
      position: { col: 0, row: 3 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 4, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, blackSoldier1, redSoldier, blackGeneral]);
    // Fortify saves — not checkmate
    expect(isCheckmate(board, Side.Red)).toBe(false);
  });

  it('normal check filtering applies when Fortify has 0 charges', () => {
    // Red General with Fortify but 0 charges — Fortify is depleted
    const redGeneral = addAbility(
      createTestPiece({
        id: 'red-general',
        type: PieceType.General,
        side: Side.Red,
        position: { col: 4, row: 0 },
        fortifyTurnsStationary: 3,
      }),
      'fortify', 0,
    );
    // Black Chariot giving check
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 4, row: 9 },
    });
    // Red Chariot at (0,0) — moves that don't resolve check should be filtered
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 0, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, redChariot, blackGeneral]);
    const moves = getLegalMoves(redChariot, board);
    // Only moves that block the check should be allowed
    for (const move of moves) {
      expect(move.col).toBe(4); // Must interpose on the check file
    }
  });

  it('normal check filtering applies when fortifyTurnsStationary < 2', () => {
    // Red General with Fortify and charges, but only stationary 1 turn — not active yet
    const redGeneral = addAbility(
      createTestPiece({
        id: 'red-general',
        type: PieceType.General,
        side: Side.Red,
        position: { col: 4, row: 0 },
        fortifyTurnsStationary: 1,
      }),
      'fortify', 1,
    );
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 4, row: 9 },
    });
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 0, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, redChariot, blackGeneral]);
    const moves = getLegalMoves(redChariot, board);
    // Only check-resolving moves allowed (blocking on col 4)
    for (const move of moves) {
      expect(move.col).toBe(4);
    }
  });

  it('General itself cannot move into check even with active Fortify', () => {
    // Red General with active Fortify
    const redGeneral = addAbility(
      createTestPiece({
        id: 'red-general',
        type: PieceType.General,
        side: Side.Red,
        position: { col: 4, row: 0 },
        fortifyTurnsStationary: 5,
      }),
      'fortify', 1,
    );
    // Black Chariot controlling col 3
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 5, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, blackGeneral]);
    const moves = getLegalMoves(redGeneral, board);
    // General should NOT be able to move to (3,0) because that's in check on col 3
    const movesToCol3 = moves.filter(m => m.col === 3);
    expect(movesToCol3.length).toBe(0);
  });

  it('without Fortify it IS checkmate when no legal moves', () => {
    // Same position as Fortify test but WITHOUT Fortify
    const redGeneral = createTestPiece({
      id: 'red-general',
      type: PieceType.General,
      side: Side.Red,
      position: { col: 3, row: 0 },
    });
    const blackChariot = createTestPiece({
      id: 'black-chariot',
      type: PieceType.Chariot,
      side: Side.Black,
      position: { col: 3, row: 5 },
    });
    const blackSoldier1 = createTestPiece({
      id: 'black-soldier1',
      type: PieceType.Soldier,
      side: Side.Black,
      position: { col: 4, row: 0 },
    });
    const redSoldier = createTestPiece({
      id: 'red-soldier',
      type: PieceType.Soldier,
      side: Side.Red,
      position: { col: 0, row: 3 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 4, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, blackSoldier1, redSoldier, blackGeneral]);
    // Without Fortify, this IS checkmate
    expect(isCheckmate(board, Side.Red)).toBe(true);
  });
});
