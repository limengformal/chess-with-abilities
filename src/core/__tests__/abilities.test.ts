import { describe, it, expect } from 'vitest';
import {
  Board, PieceInstance, PieceType, Side, Position, AbilityInstance,
} from '../../types';
import { createEmptyGrid } from '../board';
import {
  executeActiveAbility,
  processCaptureAbilities,
  processPostCapture,
  processMinePlacement,
  checkMineTrigger,
  getActiveAbilityTargets,
  getActiveAbilities,
  processTurnStart,
} from '../abilities';
import { getAbilityById } from '../abilityDefs';

// ---- Test Helpers ----

function createTestPiece(overrides: Partial<PieceInstance> = {}): PieceInstance {
  return {
    id: 'test-piece-1',
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

describe('Shield', () => {
  it('blocks capture and decrements charge', () => {
    const attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    let defender = createTestPiece({ id: 'defender', side: Side.Black, position: { col: 4, row: 4 } });
    defender = addAbility(defender, 'shield');
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(false);
    expect(result.abilityLog.some(l => l.abilityId === 'shield')).toBe(true);
  });

  it('does not block with 0 charges', () => {
    const attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    let defender = createTestPiece({ id: 'defender', side: Side.Black, position: { col: 4, row: 4 } });
    defender = addAbility(defender, 'shield', 0);
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(true);
  });

  it('blocks range-attack', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 2, row: 4 } });
    attacker = addAbility(attacker, 'range-attack');
    let defender = createTestPiece({ id: 'defender', side: Side.Black, position: { col: 4, row: 4 } });
    defender = addAbility(defender, 'shield');
    const board = createTestBoard([attacker, defender]);

    const result = executeActiveAbility(board, attacker, 'range-attack', defender.position, []);
    expect(result.capturedPieces.length).toBe(0);
    expect(result.abilityLog.some(l => l.abilityId === 'shield')).toBe(true);
  });
});

describe('Teleport', () => {
  it('moves piece to target empty square', () => {
    let piece = createTestPiece({ position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'teleport');
    const board = createTestBoard([piece]);
    const target: Position = { col: 0, row: 0 };

    const result = executeActiveAbility(board, piece, 'teleport', target, []);
    expect(result.board.grid[0][0]?.id).toBe(piece.id);
    expect(result.board.grid[4][4]).toBeNull();
  });

  it('decrements charge', () => {
    let piece = createTestPiece({ position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'teleport');
    const board = createTestBoard([piece]);

    const result = executeActiveAbility(board, piece, 'teleport', { col: 0, row: 0 }, []);
    const movedPiece = result.board.grid[0][0]!;
    const teleportAbility = movedPiece.abilities.find(a => a.abilityId === 'teleport');
    expect(teleportAbility?.chargesRemaining).toBe(0);
  });
});

describe('Double-Move', () => {
  it('returns extraMove: true', () => {
    let piece = createTestPiece();
    piece = addAbility(piece, 'double-move');
    const board = createTestBoard([piece]);

    const result = executeActiveAbility(board, piece, 'double-move', piece.position, []);
    expect(result.extraMove).toBe(true);
  });

  it('decrements charge', () => {
    let piece = createTestPiece();
    piece = addAbility(piece, 'double-move');
    const board = createTestBoard([piece]);

    const result = executeActiveAbility(board, piece, 'double-move', piece.position, []);
    const updatedPiece = result.board.grid[piece.position.row][piece.position.col]!;
    const dmAbility = updatedPiece.abilities.find(a => a.abilityId === 'double-move');
    expect(dmAbility?.chargesRemaining).toBe(0);
  });
});

describe('Freeze', () => {
  it('freezes adjacent enemy after capture', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'freeze');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 4 } });
    const board = createTestBoard([attacker, enemy]);

    const result = processPostCapture(board, attacker);
    expect(result.freezeTargets.length).toBe(1);
    expect(result.freezeTargets[0].pieceId).toBe('enemy');
    const frozenPiece = result.board.grid[4][5]!;
    expect(frozenPiece.isFrozen).toBe(true);
    expect(frozenPiece.frozenTurnsRemaining).toBe(2);
  });

  it('does not freeze Iron Will piece', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'freeze');
    let enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 4 } });
    enemy = addAbility(enemy, 'iron-will');
    const board = createTestBoard([attacker, enemy]);

    const result = processPostCapture(board, attacker);
    expect(result.freezeTargets.length).toBe(0);
    const piece = result.board.grid[4][5]!;
    expect(piece.isFrozen).toBe(false);
  });

  it('decrements freeze charge', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'freeze');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 4 } });
    const board = createTestBoard([attacker, enemy]);

    const result = processPostCapture(board, attacker);
    const updatedAttacker = result.board.grid[4][4]!;
    const freezeAbility = updatedAttacker.abilities.find(a => a.abilityId === 'freeze');
    expect(freezeAbility?.chargesRemaining).toBe(1);
  });
});

describe('Resurrect', () => {
  it('places captured friendly at target position', () => {
    let caster = createTestPiece({ id: 'caster', side: Side.Red, position: { col: 4, row: 4 } });
    caster = addAbility(caster, 'resurrect');
    const capturedPiece = createTestPiece({ id: 'fallen', side: Side.Red, position: { col: 0, row: 0 } });
    const board = createTestBoard([caster]);
    const target: Position = { col: 2, row: 2 };

    const result = executeActiveAbility(board, caster, 'resurrect', target, [capturedPiece]);
    expect(result.restoredPieceIds).toContain('fallen');
    expect(result.board.grid[2][2]?.id).toBe('fallen');
  });

  it('picks most recently captured piece', () => {
    let caster = createTestPiece({ id: 'caster', side: Side.Red, position: { col: 4, row: 4 } });
    caster = addAbility(caster, 'resurrect');
    const first = createTestPiece({ id: 'first', side: Side.Red, position: { col: 0, row: 0 } });
    const second = createTestPiece({ id: 'second', side: Side.Red, position: { col: 1, row: 1 } });
    const board = createTestBoard([caster]);

    const result = executeActiveAbility(board, caster, 'resurrect', { col: 3, row: 3 }, [first, second]);
    expect(result.restoredPieceIds).toContain('second');
  });

  it('decrements charge', () => {
    let caster = createTestPiece({ id: 'caster', side: Side.Red, position: { col: 4, row: 4 } });
    caster = addAbility(caster, 'resurrect');
    const captured = createTestPiece({ id: 'fallen', side: Side.Red, position: { col: 0, row: 0 } });
    const board = createTestBoard([caster]);

    const result = executeActiveAbility(board, caster, 'resurrect', { col: 2, row: 2 }, [captured]);
    const updatedCaster = result.board.grid[4][4]!;
    const resAbility = updatedCaster.abilities.find(a => a.abilityId === 'resurrect');
    expect(resAbility?.chargesRemaining).toBe(0);
  });
});

describe('Range-Attack', () => {
  it('captures target enemy', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 2, row: 4 } });
    attacker = addAbility(attacker, 'range-attack');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 4, row: 4 } });
    const board = createTestBoard([attacker, enemy]);

    const result = executeActiveAbility(board, attacker, 'range-attack', enemy.position, []);
    expect(result.capturedPieces.length).toBe(1);
    expect(result.capturedPieces[0].id).toBe('enemy');
    expect(result.board.grid[4][4]).toBeNull();
  });

  it('decrements charge', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 2, row: 4 } });
    attacker = addAbility(attacker, 'range-attack');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 4, row: 4 } });
    const board = createTestBoard([attacker, enemy]);

    const result = executeActiveAbility(board, attacker, 'range-attack', enemy.position, []);
    const updated = result.board.grid[4][2]!;
    const raAbility = updated.abilities.find(a => a.abilityId === 'range-attack');
    expect(raAbility?.chargesRemaining).toBe(0);
  });

  it('poison on target strips attacker abilities', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 2, row: 4 } });
    attacker = addAbility(attacker, 'range-attack');
    attacker = addAbility(attacker, 'shield');
    let enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 4, row: 4 } });
    enemy = addAbility(enemy, 'poison');
    const board = createTestBoard([attacker, enemy]);

    const result = executeActiveAbility(board, attacker, 'range-attack', enemy.position, []);
    expect(result.capturedPieces.length).toBe(1);
    const updated = result.board.grid[4][2]!;
    expect(updated.abilities.length).toBe(0);
  });

  it('targets only enemies in range 2', () => {
    let piece = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'range-attack');
    const nearEnemy = createTestPiece({ id: 'near', side: Side.Black, position: { col: 5, row: 5 } });
    const farEnemy = createTestPiece({ id: 'far', side: Side.Black, position: { col: 7, row: 7 } });
    const board = createTestBoard([piece, nearEnemy, farEnemy]);

    const targets = getActiveAbilityTargets(board, piece, 'range-attack', []);
    expect(targets.some(t => t.col === 5 && t.row === 5)).toBe(true);
    expect(targets.some(t => t.col === 7 && t.row === 7)).toBe(false);
  });
});

describe('Swap', () => {
  it('swaps positions with friendly piece', () => {
    let piece = createTestPiece({ id: 'piece1', side: Side.Red, position: { col: 2, row: 2 } });
    piece = addAbility(piece, 'swap');
    const friendly = createTestPiece({ id: 'piece2', side: Side.Red, position: { col: 6, row: 6 } });
    const board = createTestBoard([piece, friendly]);

    const result = executeActiveAbility(board, piece, 'swap', friendly.position, []);
    expect(result.board.grid[6][6]?.id).toBe('piece1');
    expect(result.board.grid[2][2]?.id).toBe('piece2');
  });

  it('decrements charge', () => {
    let piece = createTestPiece({ id: 'piece1', side: Side.Red, position: { col: 2, row: 2 } });
    piece = addAbility(piece, 'swap');
    const friendly = createTestPiece({ id: 'piece2', side: Side.Red, position: { col: 6, row: 6 } });
    const board = createTestBoard([piece, friendly]);

    const result = executeActiveAbility(board, piece, 'swap', friendly.position, []);
    const swapped = result.board.grid[6][6]!;
    const swapAbility = swapped.abilities.find(a => a.abilityId === 'swap');
    expect(swapAbility?.chargesRemaining).toBe(0);
  });
});

describe('Mine', () => {
  it('places mine at FROM position', () => {
    let piece = createTestPiece({ id: 'miner', side: Side.Red, position: { col: 5, row: 5 } });
    piece = addAbility(piece, 'mine');
    const board = createTestBoard([piece]);
    const fromPos: Position = { col: 4, row: 4 };

    const result = processMinePlacement(board, piece, fromPos);
    expect(result.board.mines.length).toBe(1);
    expect(result.board.mines[0].position.col).toBe(4);
    expect(result.board.mines[0].position.row).toBe(4);
    expect(result.board.mines[0].placedBy).toBe(Side.Red);
  });

  it('enemy stepping on mine loses abilities', () => {
    let enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 4, row: 4 } });
    enemy = addAbility(enemy, 'shield');
    enemy = addAbility(enemy, 'teleport');
    const board: Board = {
      grid: createEmptyGrid(),
      treasurePoints: [],
      mines: [{ position: { col: 4, row: 4 }, placedBy: Side.Red, turnsRemaining: 10 }],
    };
    board.grid[4][4] = enemy;

    const result = checkMineTrigger(board, enemy);
    expect(result.triggered).toBe(true);
    const strippedPiece = result.board.grid[4][4]!;
    expect(strippedPiece.abilities.length).toBe(0);
  });

  it('friendly piece does not trigger own mine', () => {
    const piece = createTestPiece({ id: 'miner', side: Side.Red, position: { col: 4, row: 4 } });
    const board: Board = {
      grid: createEmptyGrid(),
      treasurePoints: [],
      mines: [{ position: { col: 4, row: 4 }, placedBy: Side.Red, turnsRemaining: 10 }],
    };
    board.grid[4][4] = piece;

    const result = checkMineTrigger(board, piece);
    expect(result.triggered).toBe(false);
  });
});

describe('Scout', () => {
  it('targets enemy positions in range 2 (not self)', () => {
    let piece = createTestPiece({ id: 'scout', side: Side.Red, position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'scout');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 5 } });
    const board = createTestBoard([piece, enemy]);

    const targets = getActiveAbilityTargets(board, piece, 'scout', []);
    expect(targets.some(t => t.col === 5 && t.row === 5)).toBe(true);
    // Should NOT include self position
    expect(targets.some(t => t.col === 4 && t.row === 4)).toBe(false);
  });

  it('reveals only targeted enemy', () => {
    let piece = createTestPiece({ id: 'scout', side: Side.Red, position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'scout');
    const enemy1 = createTestPiece({ id: 'enemy1', side: Side.Black, position: { col: 5, row: 4 } });
    const enemy2 = createTestPiece({ id: 'enemy2', side: Side.Black, position: { col: 3, row: 4 } });
    const board = createTestBoard([piece, enemy1, enemy2]);

    const result = executeActiveAbility(board, piece, 'scout', enemy1.position, []);
    expect(result.revealedPieces).toContain('enemy1');
    expect(result.revealedPieces).not.toContain('enemy2');
    expect(result.board.grid[4][5]!.isRevealed).toBe(true);
    expect(result.board.grid[4][3]!.isRevealed).toBe(false);
  });

  it('decrements charge', () => {
    let piece = createTestPiece({ id: 'scout', side: Side.Red, position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'scout');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 4 } });
    const board = createTestBoard([piece, enemy]);

    const result = executeActiveAbility(board, piece, 'scout', enemy.position, []);
    const updated = result.board.grid[4][4]!;
    const scoutAbility = updated.abilities.find(a => a.abilityId === 'scout');
    expect(scoutAbility?.chargesRemaining).toBe(1);
  });
});

describe('Berserk', () => {
  it('grants extra move after capture', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'berserk');
    const board = createTestBoard([attacker]);

    const result = processPostCapture(board, attacker);
    expect(result.extraMove).toBe(true);
  });

  it('decrements charge', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'berserk', 3);
    const board = createTestBoard([attacker]);

    const result = processPostCapture(board, attacker);
    const updated = result.board.grid[4][4]!;
    const berserkAbility = updated.abilities.find(a => a.abilityId === 'berserk');
    expect(berserkAbility?.chargesRemaining).toBe(2);
  });

  it('does not trigger with 0 charges', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'berserk', 0);
    const board = createTestBoard([attacker]);

    const result = processPostCapture(board, attacker);
    expect(result.extraMove).toBe(false);
  });
});

describe('Fortify', () => {
  it('blocks capture after 2 turns stationary and consumes charge', () => {
    const attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    let defender = createTestPiece({
      id: 'defender', side: Side.Black, position: { col: 4, row: 4 },
      fortifyTurnsStationary: 2,
    });
    defender = addAbility(defender, 'fortify');
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(false);
    expect(result.abilityLog.some(l => l.abilityId === 'fortify')).toBe(true);
    // Charge should be consumed after blocking
    const defenderAfter = result.board.grid[4][4];
    expect(defenderAfter).not.toBeNull();
    const fortifyAbility = defenderAfter!.abilities.find(a => a.abilityId === 'fortify');
    expect(fortifyAbility!.chargesRemaining).toBe(0);
  });

  it('does not block with fewer than 2 turns stationary', () => {
    const attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    let defender = createTestPiece({
      id: 'defender', side: Side.Black, position: { col: 4, row: 4 },
      fortifyTurnsStationary: 1,
    });
    defender = addAbility(defender, 'fortify');
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(true);
  });

  it('does not block a second time after charge is consumed', () => {
    const attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    let defender = createTestPiece({
      id: 'defender', side: Side.Black, position: { col: 4, row: 4 },
      fortifyTurnsStationary: 2,
    });
    defender = addAbility(defender, 'fortify');
    const board = createTestBoard([attacker, defender]);

    // First capture attempt — blocked
    const result1 = processCaptureAbilities(board, attacker, defender);
    expect(result1.captured).toBe(false);

    // Second capture attempt with same defender (charge consumed, still stationary)
    const defenderAfter = result1.board.grid[4][4]!;
    const result2 = processCaptureAbilities(result1.board, attacker, defenderAfter);
    expect(result2.captured).toBe(true);
  });
});

describe('Poison', () => {
  it('capture succeeds and attacker loses all abilities', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    attacker = addAbility(attacker, 'shield');
    attacker = addAbility(attacker, 'teleport');
    let defender = createTestPiece({ id: 'defender', side: Side.Black, position: { col: 4, row: 4 } });
    defender = addAbility(defender, 'poison');
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(true);
    expect(result.attackerModified).not.toBeNull();
    expect(result.attackerModified!.abilities.length).toBe(0);
  });
});

describe('Shadow-Step', () => {
  it('moves piece to target and resets fortify counter', () => {
    let piece = createTestPiece({
      id: 'stepper', side: Side.Red, position: { col: 2, row: 2 },
      fortifyTurnsStationary: 3,
    });
    piece = addAbility(piece, 'shadow-step');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 5 } });
    const board = createTestBoard([piece, enemy]);
    const target: Position = { col: 5, row: 4 }; // adjacent to enemy

    const result = executeActiveAbility(board, piece, 'shadow-step', target, []);
    expect(result.board.grid[4][5]?.id).toBe('stepper');
    expect(result.board.grid[2][2]).toBeNull();
    expect(result.board.grid[4][5]!.fortifyTurnsStationary).toBe(0);
  });

  it('decrements charge', () => {
    let piece = createTestPiece({ id: 'stepper', side: Side.Red, position: { col: 2, row: 2 } });
    piece = addAbility(piece, 'shadow-step');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 5 } });
    const board = createTestBoard([piece, enemy]);

    const result = executeActiveAbility(board, piece, 'shadow-step', { col: 5, row: 4 }, []);
    const moved = result.board.grid[4][5]!;
    const ssAbility = moved.abilities.find(a => a.abilityId === 'shadow-step');
    expect(ssAbility?.chargesRemaining).toBe(1);
  });
});

describe('Iron Will', () => {
  it('prevents freeze from affecting the piece', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'freeze');
    let enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 4 } });
    enemy = addAbility(enemy, 'iron-will');
    const board = createTestBoard([attacker, enemy]);

    const result = processPostCapture(board, attacker);
    expect(result.freezeTargets.length).toBe(0);
    expect(result.board.grid[4][5]!.isFrozen).toBe(false);
    expect(result.abilityLog.some(l => l.abilityId === 'iron-will')).toBe(true);
  });
});

describe('Turn Start Processing', () => {
  it('decrements frozen turns', () => {
    const piece = createTestPiece({
      id: 'frozen', side: Side.Red, position: { col: 4, row: 4 },
      isFrozen: true, frozenTurnsRemaining: 2,
    });
    const board = createTestBoard([piece]);

    const result = processTurnStart(board, Side.Red);
    const updated = result.grid[4][4]!;
    expect(updated.frozenTurnsRemaining).toBe(1);
    expect(updated.isFrozen).toBe(true);
  });

  it('unfreezes when turns reach 0', () => {
    const piece = createTestPiece({
      id: 'frozen', side: Side.Red, position: { col: 4, row: 4 },
      isFrozen: true, frozenTurnsRemaining: 1,
    });
    const board = createTestBoard([piece]);

    const result = processTurnStart(board, Side.Red);
    const updated = result.grid[4][4]!;
    expect(updated.frozenTurnsRemaining).toBe(0);
    expect(updated.isFrozen).toBe(false);
  });
});

describe('getActiveAbilities', () => {
  it('returns active abilities with charges', () => {
    let piece = createTestPiece();
    piece = addAbility(piece, 'teleport', 1);
    piece = addAbility(piece, 'shield', 1); // OnBeingCaptured, not Active

    const active = getActiveAbilities(piece);
    expect(active.length).toBe(1);
    expect(active[0].abilityId).toBe('teleport');
  });

  it('excludes abilities with 0 charges', () => {
    let piece = createTestPiece();
    piece = addAbility(piece, 'teleport', 0);

    const active = getActiveAbilities(piece);
    expect(active.length).toBe(0);
  });
});

// ---- Ability Interaction Tests ----

describe('Ability Interactions', () => {
  it('fortify is checked before shield (fortified piece does not consume shield charge)', () => {
    const attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    let defender = createTestPiece({
      id: 'defender', side: Side.Black, position: { col: 4, row: 4 },
      fortifyTurnsStationary: 2,
    });
    defender = addAbility(defender, 'fortify');
    defender = addAbility(defender, 'shield');
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(false);
    expect(result.abilityLog.some(l => l.abilityId === 'fortify')).toBe(true);
    expect(result.abilityLog.some(l => l.abilityId === 'shield')).toBe(false);
  });

  it('fortify blocks capture so poison does not trigger', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    attacker = addAbility(attacker, 'shield');
    let defender = createTestPiece({
      id: 'defender', side: Side.Black, position: { col: 4, row: 4 },
      fortifyTurnsStationary: 2,
    });
    defender = addAbility(defender, 'fortify');
    defender = addAbility(defender, 'poison');
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(false);
    expect(result.attackerModified).toBeNull();
    expect(result.abilityLog.some(l => l.abilityId === 'fortify')).toBe(true);
    expect(result.abilityLog.some(l => l.abilityId === 'poison')).toBe(false);
  });

  it('shield blocks capture so poison does not trigger', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    attacker = addAbility(attacker, 'teleport');
    let defender = createTestPiece({ id: 'defender', side: Side.Black, position: { col: 4, row: 4 } });
    defender = addAbility(defender, 'shield');
    defender = addAbility(defender, 'poison');
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(false);
    expect(result.attackerModified).toBeNull();
    expect(result.abilityLog.some(l => l.abilityId === 'shield')).toBe(true);
    expect(result.abilityLog.some(l => l.abilityId === 'poison')).toBe(false);
  });

  it('berserk and freeze both trigger when same piece has both', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'berserk', 3);
    attacker = addAbility(attacker, 'freeze', 2);
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 4 } });
    const board = createTestBoard([attacker, enemy]);

    const result = processPostCapture(board, attacker);
    expect(result.extraMove).toBe(true);
    expect(result.freezeTargets.length).toBe(1);
    expect(result.freezeTargets[0].pieceId).toBe('enemy');
    const updatedAttacker = result.board.grid[4][4]!;
    expect(updatedAttacker.abilities.find(a => a.abilityId === 'berserk')?.chargesRemaining).toBe(2);
    expect(updatedAttacker.abilities.find(a => a.abilityId === 'freeze')?.chargesRemaining).toBe(1);
  });

  it('range-attack is blocked by fortify (defender survives, both charges consumed)', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 2, row: 4 } });
    attacker = addAbility(attacker, 'range-attack');
    let defender = createTestPiece({
      id: 'defender', side: Side.Black, position: { col: 4, row: 4 },
      fortifyTurnsStationary: 5,
    });
    defender = addAbility(defender, 'fortify');
    const board = createTestBoard([attacker, defender]);

    const result = executeActiveAbility(board, attacker, 'range-attack', defender.position, []);
    // Fortify blocks the capture — defender survives
    expect(result.capturedPieces.length).toBe(0);
    // Defender is still on the board, fortify charge consumed
    const updatedDefender = result.board.grid[4][4]!;
    expect(updatedDefender.id).toBe('defender');
    expect(updatedDefender.abilities.find(a => a.abilityId === 'fortify')?.chargesRemaining).toBe(0);
    // Attacker's range-attack charge is also consumed
    const updatedAttacker = result.board.grid[4][2]!;
    expect(updatedAttacker.abilities.find(a => a.abilityId === 'range-attack')?.chargesRemaining).toBe(0);
    // Fortify log entry present
    expect(result.abilityLog.some(l => l.abilityId === 'fortify')).toBe(true);
  });

  it('range-attack ignores fortify if defender has not been stationary long enough', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 2, row: 4 } });
    attacker = addAbility(attacker, 'range-attack');
    let defender = createTestPiece({
      id: 'defender', side: Side.Black, position: { col: 4, row: 4 },
      fortifyTurnsStationary: 1,
    });
    defender = addAbility(defender, 'fortify');
    const board = createTestBoard([attacker, defender]);

    const result = executeActiveAbility(board, attacker, 'range-attack', defender.position, []);
    // Fortify not active (only 1 turn stationary, needs 2) — capture succeeds
    expect(result.capturedPieces.length).toBe(1);
    expect(result.capturedPieces[0].id).toBe('defender');
  });

  it('range-attack shield blocks so poison does not trigger', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 2, row: 4 } });
    attacker = addAbility(attacker, 'range-attack');
    attacker = addAbility(attacker, 'teleport');
    let defender = createTestPiece({ id: 'defender', side: Side.Black, position: { col: 4, row: 4 } });
    defender = addAbility(defender, 'shield');
    defender = addAbility(defender, 'poison');
    const board = createTestBoard([attacker, defender]);

    const result = executeActiveAbility(board, attacker, 'range-attack', defender.position, []);
    expect(result.capturedPieces.length).toBe(0);
    const updated = result.board.grid[4][2]!;
    expect(updated.abilities.some(a => a.abilityId === 'teleport')).toBe(true);
    expect(result.abilityLog.some(l => l.abilityId === 'shield')).toBe(true);
  });

  it('piece with multiple abilities retains unused ones after using one', () => {
    let piece = createTestPiece({ id: 'multi', side: Side.Red, position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'teleport');
    piece = addAbility(piece, 'shield');
    const board = createTestBoard([piece]);

    const result = executeActiveAbility(board, piece, 'teleport', { col: 0, row: 0 }, []);
    const moved = result.board.grid[0][0]!;
    expect(moved.abilities.find(a => a.abilityId === 'teleport')?.chargesRemaining).toBe(0);
    expect(moved.abilities.find(a => a.abilityId === 'shield')?.chargesRemaining).toBe(1);
  });
});

// ---- Targeting Validation Tests ----

describe('Targeting', () => {
  it('teleport returns all empty squares on board', () => {
    let piece = createTestPiece({ id: 'tp', side: Side.Red, position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'teleport');
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 0, row: 0 } });
    const board = createTestBoard([piece, enemy]);

    const targets = getActiveAbilityTargets(board, piece, 'teleport', []);
    // 9 cols * 10 rows = 90 total, minus 2 occupied = 88
    expect(targets.length).toBe(88);
    expect(targets.some(t => t.col === 4 && t.row === 4)).toBe(false);
    expect(targets.some(t => t.col === 0 && t.row === 0)).toBe(false);
  });

  it('swap targets only friendly pieces excluding self', () => {
    let piece = createTestPiece({ id: 'swapper', side: Side.Red, position: { col: 2, row: 2 } });
    piece = addAbility(piece, 'swap');
    const friendly1 = createTestPiece({ id: 'f1', side: Side.Red, position: { col: 4, row: 4 } });
    const friendly2 = createTestPiece({ id: 'f2', side: Side.Red, position: { col: 6, row: 6 } });
    const enemy = createTestPiece({ id: 'e1', side: Side.Black, position: { col: 8, row: 8 } });
    const board = createTestBoard([piece, friendly1, friendly2, enemy]);

    const targets = getActiveAbilityTargets(board, piece, 'swap', []);
    expect(targets.length).toBe(2);
    expect(targets.some(t => t.col === 4 && t.row === 4)).toBe(true);
    expect(targets.some(t => t.col === 6 && t.row === 6)).toBe(true);
    expect(targets.some(t => t.col === 2 && t.row === 2)).toBe(false);
    expect(targets.some(t => t.col === 8 && t.row === 8)).toBe(false);
  });

  it('resurrect returns empty targets when no friendly captures exist', () => {
    let caster = createTestPiece({ id: 'caster', side: Side.Red, position: { col: 4, row: 4 } });
    caster = addAbility(caster, 'resurrect');
    const board = createTestBoard([caster]);

    const targets = getActiveAbilityTargets(board, caster, 'resurrect', []);
    expect(targets.length).toBe(0);
  });

  it('resurrect returns empty targets when only enemy pieces are captured', () => {
    let caster = createTestPiece({ id: 'caster', side: Side.Red, position: { col: 4, row: 4 } });
    caster = addAbility(caster, 'resurrect');
    const blackPiece = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 0, row: 0 } });
    const board = createTestBoard([caster]);

    const targets = getActiveAbilityTargets(board, caster, 'resurrect', [blackPiece]);
    expect(targets.length).toBe(0);
  });

  it('shadow-step targets empty squares adjacent to any enemy piece', () => {
    let piece = createTestPiece({ id: 'stepper', side: Side.Red, position: { col: 0, row: 0 } });
    piece = addAbility(piece, 'shadow-step');
    const enemy1 = createTestPiece({ id: 'e1', side: Side.Black, position: { col: 4, row: 4 } });
    const enemy2 = createTestPiece({ id: 'e2', side: Side.Black, position: { col: 7, row: 7 } });
    const board = createTestBoard([piece, enemy1, enemy2]);

    const targets = getActiveAbilityTargets(board, piece, 'shadow-step', []);
    // Should include empty squares around both enemies
    expect(targets.some(t => t.col === 3 && t.row === 4)).toBe(true);
    expect(targets.some(t => t.col === 5 && t.row === 4)).toBe(true);
    expect(targets.some(t => t.col === 6 && t.row === 7)).toBe(true);
    expect(targets.some(t => t.col === 8 && t.row === 7)).toBe(true);
    // Should NOT include occupied or self positions
    expect(targets.some(t => t.col === 4 && t.row === 4)).toBe(false);
    expect(targets.some(t => t.col === 7 && t.row === 7)).toBe(false);
    expect(targets.some(t => t.col === 0 && t.row === 0)).toBe(false);
  });

  it('shadow-step excludes own position even if adjacent to enemy', () => {
    let piece = createTestPiece({ id: 'stepper', side: Side.Red, position: { col: 4, row: 3 } });
    piece = addAbility(piece, 'shadow-step');
    const enemy = createTestPiece({ id: 'e1', side: Side.Black, position: { col: 4, row: 4 } });
    const board = createTestBoard([piece, enemy]);

    const targets = getActiveAbilityTargets(board, piece, 'shadow-step', []);
    expect(targets.some(t => t.col === 4 && t.row === 3)).toBe(false);
  });

  it('range-attack does not target friendly pieces', () => {
    let piece = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    piece = addAbility(piece, 'range-attack');
    const friendly = createTestPiece({ id: 'f1', side: Side.Red, position: { col: 5, row: 4 } });
    const enemy = createTestPiece({ id: 'e1', side: Side.Black, position: { col: 4, row: 5 } });
    const board = createTestBoard([piece, friendly, enemy]);

    const targets = getActiveAbilityTargets(board, piece, 'range-attack', []);
    expect(targets.some(t => t.col === 4 && t.row === 5)).toBe(true);
    expect(targets.some(t => t.col === 5 && t.row === 4)).toBe(false);
  });
});

// ---- Additional Edge Case Tests ----

describe('Mine (edge cases)', () => {
  it('decrements mine charge on placement', () => {
    let piece = createTestPiece({ id: 'miner', side: Side.Red, position: { col: 5, row: 5 } });
    piece = addAbility(piece, 'mine');
    const board = createTestBoard([piece]);

    const result = processMinePlacement(board, piece, { col: 4, row: 4 });
    const updatedPiece = result.board.grid[5][5]!;
    expect(updatedPiece.abilities.find(a => a.abilityId === 'mine')?.chargesRemaining).toBe(1);
  });

  it('does not place mine with 0 charges', () => {
    let piece = createTestPiece({ id: 'miner', side: Side.Red, position: { col: 5, row: 5 } });
    piece = addAbility(piece, 'mine', 0);
    const board = createTestBoard([piece]);

    const result = processMinePlacement(board, piece, { col: 4, row: 4 });
    expect(result.board.mines.length).toBe(0);
    expect(result.abilityLog.length).toBe(0);
  });
});

describe('Turn Start Processing (edge cases)', () => {
  it('removes mines when turnsRemaining reaches 0', () => {
    const board: Board = {
      grid: createEmptyGrid(),
      treasurePoints: [],
      mines: [
        { position: { col: 3, row: 3 }, placedBy: Side.Red, turnsRemaining: 1 },
        { position: { col: 5, row: 5 }, placedBy: Side.Black, turnsRemaining: 5 },
      ],
    };

    const result = processTurnStart(board, Side.Red);
    expect(result.mines.length).toBe(1);
    expect(result.mines[0].position.col).toBe(5);
    expect(result.mines[0].turnsRemaining).toBe(4);
  });

  it('only decrements frozen turns for the specified side', () => {
    const redPiece = createTestPiece({
      id: 'red-frozen', side: Side.Red, position: { col: 2, row: 2 },
      isFrozen: true, frozenTurnsRemaining: 2,
    });
    const blackPiece = createTestPiece({
      id: 'black-frozen', side: Side.Black, position: { col: 7, row: 7 },
      isFrozen: true, frozenTurnsRemaining: 2,
    });
    const board = createTestBoard([redPiece, blackPiece]);

    const result = processTurnStart(board, Side.Red);
    expect(result.grid[2][2]!.frozenTurnsRemaining).toBe(1);
    expect(result.grid[2][2]!.isFrozen).toBe(true);
    expect(result.grid[7][7]!.frozenTurnsRemaining).toBe(2);
    expect(result.grid[7][7]!.isFrozen).toBe(true);
  });
});

describe('Freeze (edge cases)', () => {
  it('does not freeze with 0 charges', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'freeze', 0);
    const enemy = createTestPiece({ id: 'enemy', side: Side.Black, position: { col: 5, row: 4 } });
    const board = createTestBoard([attacker, enemy]);

    const result = processPostCapture(board, attacker);
    expect(result.freezeTargets.length).toBe(0);
    expect(result.board.grid[4][5]!.isFrozen).toBe(false);
  });

  it('freezes only one adjacent enemy per capture', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } });
    attacker = addAbility(attacker, 'freeze', 2);
    const enemy1 = createTestPiece({ id: 'enemy1', side: Side.Black, position: { col: 5, row: 4 } });
    const enemy2 = createTestPiece({ id: 'enemy2', side: Side.Black, position: { col: 3, row: 4 } });
    const board = createTestBoard([attacker, enemy1, enemy2]);

    const result = processPostCapture(board, attacker);
    expect(result.freezeTargets.length).toBe(1);
  });
});

describe('Poison (edge cases)', () => {
  it('does not strip attacker abilities when poison has 0 charges', () => {
    let attacker = createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 3, row: 4 } });
    attacker = addAbility(attacker, 'shield');
    let defender = createTestPiece({ id: 'defender', side: Side.Black, position: { col: 4, row: 4 } });
    defender = addAbility(defender, 'poison', 0);
    const board = createTestBoard([attacker, defender]);

    const result = processCaptureAbilities(board, attacker, defender);
    expect(result.captured).toBe(true);
    expect(result.attackerModified).toBeNull();
  });
});

describe('Resurrect (edge cases)', () => {
  it('returns no-op when no friendly captured pieces', () => {
    let caster = createTestPiece({ id: 'caster', side: Side.Red, position: { col: 4, row: 4 } });
    caster = addAbility(caster, 'resurrect');
    const board = createTestBoard([caster]);

    const result = executeActiveAbility(board, caster, 'resurrect', { col: 2, row: 2 }, []);
    expect(result.restoredPieceIds.length).toBe(0);
    expect(result.board.grid[2][2]).toBeNull();
  });
});
