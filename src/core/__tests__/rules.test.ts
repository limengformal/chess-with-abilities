import { describe, it, expect } from 'vitest';
import {
  PieceInstance, PieceType, Side, AbilityInstance, Board,
} from '../../types';
import { createEmptyGrid } from '../board';
import { getLegalMoves, isCheckmate } from '../rules';
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

describe('Fortify-aware check logic', () => {
  it('other pieces have legal moves when General has active Fortify and is in check', () => {
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
    // Red Chariot at (0,0) — should still have moves despite the check
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 0, row: 0 },
    });
    // Black General needed for valid board
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 3, row: 9 },
    });

    const board = createTestBoard([redGeneral, blackChariot, redChariot, blackGeneral]);
    const moves = getLegalMoves(redChariot, board);
    // Red Chariot should have legal moves (along row 0 and col 0)
    expect(moves.length).toBeGreaterThan(0);
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
    // Without Fortify awareness this would be checkmate
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
    // Only moves that block the check should be allowed (e.g., moving to col 4 between generals)
    // All moves should be on col 4 (blocking the check) or none at all
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
    // Moving the General resets fortifyTurnsStationary, so Fortify bypass doesn't apply
    const movesToCol3 = moves.filter(m => m.col === 3);
    expect(movesToCol3.length).toBe(0);
  });
});
