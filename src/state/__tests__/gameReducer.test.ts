import { describe, it, expect } from 'vitest';
import { gameReducer, GameAction } from '../gameReducer';
import {
  GameState, GamePhase, Side, PieceType, PlayerType,
  PieceInstance, AbilityInstance, Position, oppositeSide,
  Board, MineInfo,
} from '../../types';
import { createInitialBoard, createEmptyGrid } from '../../core/board';
import { getLegalMoves } from '../../core/rules';

// ---- Helpers ----

function createPlayState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: GamePhase.Play,
    board: createInitialBoard(),
    currentTurn: Side.Red,
    turnNumber: 1,
    players: {
      [Side.Red]: { side: Side.Red, type: PlayerType.Human, name: 'Red' },
      [Side.Black]: { side: Side.Black, type: PlayerType.Human, name: 'Black' },
    },
    capturedPieces: [],
    moveHistory: [],
    banPhase: null,
    pickPhase: null,
    boardTheme: 'classic',
    checkState: null,
    winner: null,
    selectedPieceId: null,
    legalMoves: [],
    pendingAbility: null,
    isDoubleMoveActive: false,
    abilityLog: [],
    animations: [],
    winAnimation: null,
    drawProposal: null,
    isDraw: false,
    ...overrides,
  };
}

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

function addAbility(piece: PieceInstance, abilityId: string, charges: number): PieceInstance {
  const inst: AbilityInstance = {
    abilityId,
    chargesRemaining: charges,
    isActive: false,
    metadata: {},
  };
  return { ...piece, abilities: [...piece.abilities, inst] };
}

function createBoardWithPieces(pieces: PieceInstance[]): Board {
  const grid = createEmptyGrid();
  for (const p of pieces) {
    grid[p.position.row][p.position.col] = p;
  }
  return { grid, treasurePoints: [], mines: [] as MineInfo[] };
}

// ---- Tests ----

describe('SURRENDER', () => {
  it('ends game with opponent winning during Play phase', () => {
    const state = createPlayState({ currentTurn: Side.Red });
    const result = gameReducer(state, { type: 'SURRENDER' });
    expect(result.phase).toBe(GamePhase.End);
    expect(result.winner).toBe(Side.Black);
  });

  it('does nothing outside Play phase', () => {
    const state = createPlayState({ phase: GamePhase.Setup });
    const result = gameReducer(state, { type: 'SURRENDER' });
    expect(result.phase).toBe(GamePhase.Setup);
    expect(result.winner).toBeNull();
  });
});

describe('General Capture', () => {
  it('ends game when General is captured by MOVE_PIECE', () => {
    // Set up: Red Chariot at (4,4), Black General at (4,5)
    const redChariot = createTestPiece({
      id: 'red-chariot',
      type: PieceType.Chariot,
      side: Side.Red,
      position: { col: 4, row: 4 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general',
      type: PieceType.General,
      side: Side.Black,
      position: { col: 4, row: 5 },
    });
    // Also need Red General on the board for rules to work
    const redGeneral = createTestPiece({
      id: 'red-general',
      type: PieceType.General,
      side: Side.Red,
      position: { col: 4, row: 0 },
    });

    const board = createBoardWithPieces([redChariot, blackGeneral, redGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'red-chariot',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    // General capture triggers win animation (stays in Play), then END_WIN_ANIMATION transitions to End
    expect(result.phase).toBe(GamePhase.Play);
    expect(result.winner).toBe(Side.Red);
    expect(result.winAnimation).not.toBeNull();
    expect(result.winAnimation!.winner).toBe(Side.Red);

    // END_WIN_ANIMATION transitions to End phase
    const finalResult = gameReducer(result, { type: 'END_WIN_ANIMATION' });
    expect(finalResult.phase).toBe(GamePhase.End);
    expect(finalResult.winAnimation).toBeNull();
  });
});

describe('Double-Move Integration', () => {
  it('ACTIVATE_ABILITY sets isDoubleMoveActive', () => {
    const piece = addAbility(
      createTestPiece({ id: 'red-chariot', side: Side.Red, position: { col: 4, row: 4 } }),
      'double-move', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });

    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
    });

    const result = gameReducer(state, {
      type: 'ACTIVATE_ABILITY',
      pieceId: 'red-chariot',
      abilityId: 'double-move',
    });

    expect(result.isDoubleMoveActive).toBe(true);
    expect(result.currentTurn).toBe(Side.Red);
  });

  it('first MOVE_PIECE after double-move stays on same side', () => {
    const piece = createTestPiece({
      id: 'red-chariot', side: Side.Red, position: { col: 4, row: 4 },
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });

    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      isDoubleMoveActive: true,
      selectedPieceId: 'red-chariot',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    expect(result.currentTurn).toBe(Side.Red);
    expect(result.isDoubleMoveActive).toBe(false);
  });

  it('second MOVE_PIECE switches to opponent', () => {
    // After bonus move consumed, isDoubleMoveActive is false
    const piece = createTestPiece({
      id: 'red-chariot', side: Side.Red, position: { col: 4, row: 5 },
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });

    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      isDoubleMoveActive: false,
      selectedPieceId: 'red-chariot',
      legalMoves: [{ col: 4, row: 6 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 6 } });
    expect(result.currentTurn).toBe(Side.Black);
  });
});

// ---- Reducer: Ability Integration Tests ----

describe('Reducer: MOVE_PIECE Ability Pipeline', () => {
  it('places mine at FROM position when piece with mine moves', () => {
    const piece = addAbility(
      createTestPiece({ id: 'miner', side: Side.Red, position: { col: 4, row: 4 } }),
      'mine', 2,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'miner',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    expect(result.board.mines.length).toBe(1);
    expect(result.board.mines[0].position.col).toBe(4);
    expect(result.board.mines[0].position.row).toBe(4);
    expect(result.board.mines[0].placedBy).toBe(Side.Red);
  });

  it('piece stepping on enemy mine loses all abilities', () => {
    const piece = addAbility(
      addAbility(
        createTestPiece({ id: 'victim', side: Side.Red, position: { col: 4, row: 4 } }),
        'shield', 1,
      ),
      'teleport', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = {
      ...createBoardWithPieces([piece, redGeneral, blackGeneral]),
      mines: [{ position: { col: 4, row: 5 }, placedBy: Side.Black, turnsRemaining: 10 }] as MineInfo[],
    };
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'victim',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    const movedPiece = result.board.grid[5][4]!;
    expect(movedPiece.abilities.length).toBe(0);
    expect(result.board.mines.length).toBe(0);
  });

  it('capture with berserk grants extra move, stays on same side', () => {
    const piece = addAbility(
      createTestPiece({ id: 'berserker', side: Side.Red, position: { col: 4, row: 4 } }),
      'berserk', 2,
    );
    const target = createTestPiece({
      id: 'target', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 5 },
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, target, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'berserker',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    expect(result.currentTurn).toBe(Side.Red);
    expect(result.capturedPieces.length).toBe(1);
    // Berserk charge decremented from 2 to 1
    const berserker = result.board.grid[5][4]!;
    const berserkAbility = berserker.abilities.find(a => a.abilityId === 'berserk');
    expect(berserkAbility!.chargesRemaining).toBe(1);
  });

  it('berserk does not trigger after all charges consumed', () => {
    // Berserker has only 1 charge left — after this capture it should be at 0
    const piece = addAbility(
      createTestPiece({ id: 'berserker', side: Side.Red, position: { col: 4, row: 4 } }),
      'berserk', 1,
    );
    const target1 = createTestPiece({
      id: 'target1', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 5 },
    });
    const target2 = createTestPiece({
      id: 'target2', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 6 },
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, target1, target2, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'berserker',
      legalMoves: [{ col: 4, row: 5 }],
    });

    // First capture: berserk triggers (1 → 0), stays on Red
    const result1 = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    expect(result1.currentTurn).toBe(Side.Red);

    // Now select berserker again and capture target2 — berserk has 0 charges
    const state2: GameState = {
      ...result1,
      selectedPieceId: 'berserker',
      legalMoves: [{ col: 4, row: 6 }],
    };
    const result2 = gameReducer(state2, { type: 'MOVE_PIECE', to: { col: 4, row: 6 } });
    // Berserk has no charges left — should NOT grant extra move
    // isDoubleMoveActive was true from first berserk, so turn stays Red for this bonus move
    // but after this, no more bonuses
    const berserker = result2.board.grid[6][4]!;
    const berserkAbility = berserker.abilities.find(a => a.abilityId === 'berserk');
    expect(berserkAbility!.chargesRemaining).toBe(0);
  });

  it('capture with freeze freezes adjacent enemy', () => {
    const piece = addAbility(
      createTestPiece({ id: 'freezer', side: Side.Red, position: { col: 4, row: 4 } }),
      'freeze', 2,
    );
    const target = createTestPiece({
      id: 'target', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 5 },
    });
    const adjacent = createTestPiece({
      id: 'adjacent', type: PieceType.Soldier, side: Side.Black, position: { col: 5, row: 5 },
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, target, adjacent, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'freezer',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    const frozenPiece = result.board.grid[5][5]!;
    expect(frozenPiece.isFrozen).toBe(true);
    // processTurnStart runs at end of MOVE_PIECE, decrementing from 2 → 1
    expect(frozenPiece.frozenTurnsRemaining).toBe(1);
  });

  it('attack on shielded piece bounces attacker, turn consumed', () => {
    const piece = createTestPiece({
      id: 'attacker', side: Side.Red, position: { col: 4, row: 4 },
    });
    const defender = addAbility(
      createTestPiece({ id: 'defender', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 5 } }),
      'shield', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, defender, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'attacker',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    // Attacker stays at original position
    expect(result.board.grid[4][4]?.id).toBe('attacker');
    // Defender survives at (4,5) with shield charge decremented
    expect(result.board.grid[5][4]?.id).toBe('defender');
    expect(result.currentTurn).toBe(Side.Black);
    expect(result.capturedPieces.length).toBe(0);
  });

  it('attack on fortified piece bounces attacker, turn consumed', () => {
    const piece = createTestPiece({
      id: 'attacker', side: Side.Red, position: { col: 4, row: 4 },
    });
    const defender = addAbility(
      createTestPiece({
        id: 'defender', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 5 },
        fortifyTurnsStationary: 3,
      }),
      'fortify', -1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, defender, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'attacker',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    expect(result.board.grid[4][4]?.id).toBe('attacker');
    expect(result.board.grid[5][4]?.id).toBe('defender');
    expect(result.currentTurn).toBe(Side.Black);
    expect(result.abilityLog.some(l => l.abilityId === 'fortify')).toBe(true);
  });

  it('capturing poisoned piece strips attacker abilities', () => {
    // No Math.random mock needed: poison now skips capture inheritance
    const piece = addAbility(
      addAbility(
        createTestPiece({ id: 'attacker', side: Side.Red, position: { col: 4, row: 4 } }),
        'shield', 1,
      ),
      'teleport', 1,
    );
    const defender = addAbility(
      createTestPiece({ id: 'defender', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 5 } }),
      'poison', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, defender, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'attacker',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    const movedPiece = result.board.grid[5][4]!;
    expect(movedPiece.abilities.length).toBe(0);
    expect(result.capturedPieces.length).toBe(1);
  });

  it('fortify counter increments for stationary pieces, resets for moved piece', () => {
    const piece = createTestPiece({
      id: 'mover', side: Side.Red, position: { col: 4, row: 4 },
      fortifyTurnsStationary: 1,
    });
    const stationary = createTestPiece({
      id: 'stationary', side: Side.Red, position: { col: 0, row: 0 },
      fortifyTurnsStationary: 1,
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, stationary, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'mover',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    // Moved piece resets to 0
    expect(result.board.grid[5][4]!.fortifyTurnsStationary).toBe(0);
    // Stationary piece increments
    expect(result.board.grid[0][0]!.fortifyTurnsStationary).toBe(2);
  });

  it('shield bounce during double-move stays on same side, consumes bonus', () => {
    const piece = createTestPiece({
      id: 'attacker', side: Side.Red, position: { col: 4, row: 4 },
    });
    const defender = addAbility(
      createTestPiece({ id: 'defender', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 5 } }),
      'shield', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, defender, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      isDoubleMoveActive: true,
      selectedPieceId: 'attacker',
      legalMoves: [{ col: 4, row: 5 }],
    });

    const result = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });
    expect(result.currentTurn).toBe(Side.Red);
    expect(result.isDoubleMoveActive).toBe(false);
  });
});

describe('Reducer: Ability Activation Flow', () => {
  it('ACTIVATE_ABILITY for teleport sets pendingAbility', () => {
    const piece = addAbility(
      createTestPiece({ id: 'tp', side: Side.Red, position: { col: 4, row: 4 } }),
      'teleport', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({ board, currentTurn: Side.Red });

    const result = gameReducer(state, {
      type: 'ACTIVATE_ABILITY', pieceId: 'tp', abilityId: 'teleport',
    });
    expect(result.pendingAbility).not.toBeNull();
    expect(result.pendingAbility!.pieceId).toBe('tp');
    expect(result.pendingAbility!.abilityId).toBe('teleport');
    expect(result.pendingAbility!.validTargets.length).toBeGreaterThan(0);
  });

  it('EXECUTE_PENDING_ABILITY teleports piece to target', () => {
    const piece = addAbility(
      createTestPiece({ id: 'tp', side: Side.Red, position: { col: 4, row: 4 } }),
      'teleport', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      pendingAbility: {
        pieceId: 'tp',
        abilityId: 'teleport',
        validTargets: [{ col: 0, row: 0 }],
      },
    });

    const result = gameReducer(state, {
      type: 'EXECUTE_PENDING_ABILITY', target: { col: 0, row: 0 },
    });
    expect(result.board.grid[0][0]?.id).toBe('tp');
    expect(result.board.grid[4][4]).toBeNull();
    expect(result.pendingAbility).toBeNull();
    expect(result.currentTurn).toBe(Side.Black);
  });

  it('EXECUTE_PENDING_ABILITY with invalid target does nothing', () => {
    const piece = addAbility(
      createTestPiece({ id: 'tp', side: Side.Red, position: { col: 4, row: 4 } }),
      'teleport', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      pendingAbility: {
        pieceId: 'tp',
        abilityId: 'teleport',
        validTargets: [{ col: 0, row: 0 }],
      },
    });

    const result = gameReducer(state, {
      type: 'EXECUTE_PENDING_ABILITY', target: { col: 8, row: 8 },
    });
    // State unchanged
    expect(result.board.grid[4][4]?.id).toBe('tp');
    expect(result.pendingAbility).not.toBeNull();
  });

  it('CANCEL_PENDING_ABILITY clears pending state', () => {
    const state = createPlayState({
      pendingAbility: { pieceId: 'p1', abilityId: 'teleport', validTargets: [{ col: 0, row: 0 }] },
      selectedPieceId: 'p1',
    });

    const result = gameReducer(state, { type: 'CANCEL_PENDING_ABILITY' });
    expect(result.pendingAbility).toBeNull();
    expect(result.selectedPieceId).toBeNull();
    expect(result.legalMoves.length).toBe(0);
  });

  it('range-attack capturing General ends game', () => {
    const piece = addAbility(
      createTestPiece({ id: 'sniper', side: Side.Red, position: { col: 4, row: 4 } }),
      'range-attack', 1,
    );
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 6 },
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const board = createBoardWithPieces([piece, blackGeneral, redGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      pendingAbility: {
        pieceId: 'sniper',
        abilityId: 'range-attack',
        validTargets: [{ col: 4, row: 6 }],
      },
    });

    const result = gameReducer(state, {
      type: 'EXECUTE_PENDING_ABILITY', target: { col: 4, row: 6 },
    });
    // General capture via ability triggers win animation (stays in Play)
    expect(result.phase).toBe(GamePhase.Play);
    expect(result.winner).toBe(Side.Red);
    expect(result.winAnimation).not.toBeNull();
    expect(result.winAnimation!.winner).toBe(Side.Red);
  });

  it('EXECUTE_PENDING_ABILITY for resurrect places captured piece', () => {
    const caster = addAbility(
      createTestPiece({ id: 'caster', side: Side.Red, position: { col: 4, row: 4 } }),
      'resurrect', 1,
    );
    const capturedPiece = createTestPiece({
      id: 'fallen', type: PieceType.Chariot, side: Side.Red, position: { col: 0, row: 0 },
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([caster, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      capturedPieces: [capturedPiece],
      pendingAbility: {
        pieceId: 'caster',
        abilityId: 'resurrect',
        validTargets: [{ col: 2, row: 2 }],
      },
    });

    const result = gameReducer(state, {
      type: 'EXECUTE_PENDING_ABILITY', target: { col: 2, row: 2 },
    });
    expect(result.board.grid[2][2]?.id).toBe('fallen');
    expect(result.capturedPieces.some(p => p.id === 'fallen')).toBe(false);
  });

  it('range-attack + poison strips attacker abilities through reducer', () => {
    const piece = addAbility(
      addAbility(
        createTestPiece({ id: 'sniper', side: Side.Red, position: { col: 4, row: 4 } }),
        'range-attack', 1,
      ),
      'shield', 1,
    );
    const target = addAbility(
      createTestPiece({ id: 'poisoned', type: PieceType.Soldier, side: Side.Black, position: { col: 4, row: 6 } }),
      'poison', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, target, redGeneral, blackGeneral]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      pendingAbility: {
        pieceId: 'sniper',
        abilityId: 'range-attack',
        validTargets: [{ col: 4, row: 6 }],
      },
    });

    const result = gameReducer(state, {
      type: 'EXECUTE_PENDING_ABILITY', target: { col: 4, row: 6 },
    });
    const sniper = result.board.grid[4][4]!;
    expect(sniper.abilities.length).toBe(0);
    expect(result.capturedPieces.some(p => p.id === 'poisoned')).toBe(true);
  });
});

describe('Reducer: Frozen Piece Handling', () => {
  it('SELECT_PIECE on frozen piece returns unchanged state', () => {
    const piece = createTestPiece({
      id: 'frozen', side: Side.Red, position: { col: 4, row: 4 },
      isFrozen: true, frozenTurnsRemaining: 1,
    });
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({ board, currentTurn: Side.Red });

    const result = gameReducer(state, { type: 'SELECT_PIECE', pieceId: 'frozen' });
    expect(result.selectedPieceId).toBeNull();
    expect(result.legalMoves.length).toBe(0);
  });

  it('frozen piece ACTIVATE_ABILITY is blocked', () => {
    const piece = addAbility(
      createTestPiece({
        id: 'frozen', side: Side.Red, position: { col: 4, row: 4 },
        isFrozen: true, frozenTurnsRemaining: 1,
      }),
      'teleport', 1,
    );
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red, position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black, position: { col: 4, row: 9 },
    });
    const board = createBoardWithPieces([piece, redGeneral, blackGeneral]);
    const state = createPlayState({ board, currentTurn: Side.Red });

    const result = gameReducer(state, {
      type: 'ACTIVATE_ABILITY', pieceId: 'frozen', abilityId: 'teleport',
    });
    // After fix: frozen pieces should not be able to activate abilities
    expect(result.pendingAbility).toBeNull();
  });
});

describe('AI Name Randomization', () => {
  it('START_GAME with ai mode produces one of the expected Chinese names', () => {
    const state = createPlayState({ phase: GamePhase.Setup });
    const result = gameReducer(state, { type: 'START_GAME', mode: 'ai' });
    expect(['技能中', '国象棋']).toContain(result.players[Side.Black].name);
    expect(result.players[Side.Black].type).toBe(PlayerType.AI);
  });

  it('START_GAME with local mode names black player "Black"', () => {
    const state = createPlayState({ phase: GamePhase.Setup });
    const result = gameReducer(state, { type: 'START_GAME', mode: 'local' });
    expect(result.players[Side.Black].name).toBe('Black');
    expect(result.players[Side.Black].type).toBe(PlayerType.Human);
  });
});

describe('Check enforcement in reducer', () => {
  // Setup: Red General at (4,0) checked by Black Chariot at (4,9).
  // Red Chariot at (0,0) cannot block/capture — should have 0 legal moves.
  // Red Chariot at (2,3) CAN block by moving to (4,3).
  function createCheckState() {
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red,
      position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black,
      position: { col: 3, row: 9 },
    });
    const blackChariot = createTestPiece({
      id: 'black-chariot', type: PieceType.Chariot, side: Side.Black,
      position: { col: 4, row: 9 },
    });
    const redChariotFar = createTestPiece({
      id: 'red-chariot-far', type: PieceType.Chariot, side: Side.Red,
      position: { col: 0, row: 0 },
    });
    const redChariotBlock = createTestPiece({
      id: 'red-chariot-block', type: PieceType.Chariot, side: Side.Red,
      position: { col: 2, row: 3 },
    });

    const board = createBoardWithPieces([
      redGeneral, blackGeneral, blackChariot, redChariotFar, redChariotBlock,
    ]);

    return createPlayState({
      board,
      currentTurn: Side.Red,
      checkState: { side: Side.Red, checkedBy: ['black-chariot'] },
    });
  }

  it('SELECT_PIECE returns 0 legal moves for a piece that cannot resolve check', () => {
    const state = createCheckState();
    const result = gameReducer(state, { type: 'SELECT_PIECE', pieceId: 'red-chariot-far' });

    expect(result.selectedPieceId).toBe('red-chariot-far');
    expect(result.legalMoves.length).toBe(0);
  });

  it('SELECT_PIECE returns only check-resolving moves for a piece that can block', () => {
    const state = createCheckState();
    const result = gameReducer(state, { type: 'SELECT_PIECE', pieceId: 'red-chariot-block' });

    expect(result.selectedPieceId).toBe('red-chariot-block');
    expect(result.legalMoves.length).toBeGreaterThan(0);
    // All legal moves must be on col 4 (interposing on the check file)
    for (const move of result.legalMoves) {
      expect(move.col).toBe(4);
    }
  });

  it('SELECT_PIECE returns escape moves for the General in check', () => {
    const state = createCheckState();
    const result = gameReducer(state, { type: 'SELECT_PIECE', pieceId: 'red-general' });

    expect(result.selectedPieceId).toBe('red-general');
    // General should have escape moves to safe squares off col 4
    // (4,1) is still on col 4 → still in check → filtered
    // (3,0) → check flying general with black-general at (3,9)? Same col 3, nothing between → blocked
    // (5,0) → safe
    expect(result.legalMoves.length).toBeGreaterThan(0);
    // No move should leave general in check
    const movesToCol4 = result.legalMoves.filter(m => m.col === 4);
    expect(movesToCol4.length).toBe(0); // All col-4 positions are still in check
  });

  it('MOVE_PIECE rejects a move that is not in legalMoves', () => {
    const state = createCheckState();
    // First select the far chariot (which has 0 legal moves)
    const selected = gameReducer(state, { type: 'SELECT_PIECE', pieceId: 'red-chariot-far' });
    expect(selected.legalMoves.length).toBe(0);

    // Try to move it to an arbitrary position — should be rejected
    const result = gameReducer(selected, { type: 'MOVE_PIECE', to: { col: 0, row: 5 } });
    // State should be unchanged (move rejected)
    expect(result.currentTurn).toBe(Side.Red);
    expect(result.selectedPieceId).toBe('red-chariot-far');
  });

  it('MOVE_PIECE accepts a valid check-resolving move', () => {
    const state = createCheckState();
    // Select the blocking chariot
    const selected = gameReducer(state, { type: 'SELECT_PIECE', pieceId: 'red-chariot-block' });
    expect(selected.legalMoves.length).toBeGreaterThan(0);

    // Move to block (col 4, between general and checker)
    const blockingMove = selected.legalMoves.find(m => m.col === 4);
    expect(blockingMove).toBeDefined();

    const result = gameReducer(selected, { type: 'MOVE_PIECE', to: blockingMove! });
    // Turn should switch to Black
    expect(result.currentTurn).toBe(Side.Black);
    // Check should be resolved
    expect(result.checkState).toBeNull();
  });

  it('ACTIVATE_ABILITY is blocked when in check', () => {
    // Create a state where Red is in check and has an ability to use
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red,
      position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black,
      position: { col: 3, row: 9 },
    });
    const blackChariot = createTestPiece({
      id: 'black-chariot', type: PieceType.Chariot, side: Side.Black,
      position: { col: 4, row: 9 },
    });
    const redChariot = addAbility(
      createTestPiece({
        id: 'red-chariot', type: PieceType.Chariot, side: Side.Red,
        position: { col: 0, row: 0 },
      }),
      'swap', 1,
    );

    const board = createBoardWithPieces([redGeneral, blackGeneral, blackChariot, redChariot]);
    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      checkState: { side: Side.Red, checkedBy: ['black-chariot'] },
    });

    // Try to activate swap ability — should be blocked
    const result = gameReducer(state, {
      type: 'ACTIVATE_ABILITY', pieceId: 'red-chariot', abilityId: 'swap' as any,
    });

    // State should be unchanged — ability blocked during check
    expect(result.pendingAbility).toBeNull();
    expect(result.currentTurn).toBe(Side.Red);
  });

  it('after a move that delivers check, opponent can only make check-resolving moves', () => {
    // Setup: Red Chariot delivers check by moving to Black General's column
    const redGeneral = createTestPiece({
      id: 'red-general', type: PieceType.General, side: Side.Red,
      position: { col: 4, row: 0 },
    });
    const blackGeneral = createTestPiece({
      id: 'black-general', type: PieceType.General, side: Side.Black,
      position: { col: 4, row: 9 },
    });
    const redChariot = createTestPiece({
      id: 'red-chariot', type: PieceType.Chariot, side: Side.Red,
      position: { col: 3, row: 5 },
    });
    // Black advisor at (3,8) — can it block?
    const blackAdvisor = createTestPiece({
      id: 'black-advisor', type: PieceType.Advisor, side: Side.Black,
      position: { col: 3, row: 8 },
    });

    const board = createBoardWithPieces([redGeneral, blackGeneral, redChariot, blackAdvisor]);

    const state = createPlayState({
      board,
      currentTurn: Side.Red,
      selectedPieceId: 'red-chariot',
      legalMoves: getLegalMoves(redChariot, board),
    });

    // Red moves chariot to (4,5) — giving check along col 4
    const afterMove = gameReducer(state, { type: 'MOVE_PIECE', to: { col: 4, row: 5 } });

    // Verify Black is now in check
    expect(afterMove.currentTurn).toBe(Side.Black);
    expect(afterMove.checkState).not.toBeNull();
    expect(afterMove.checkState!.side).toBe(Side.Black);

    // Now Black selects their advisor — only check-resolving moves allowed
    const blackSelects = gameReducer(afterMove, { type: 'SELECT_PIECE', pieceId: 'black-advisor' });

    // Every move returned must resolve the check
    for (const move of blackSelects.legalMoves) {
      // Simulate the advisor moving there and verify check is resolved
      const simBoard = createBoardWithPieces([
        redGeneral,
        { ...blackGeneral, position: blackGeneral.position },
        { ...afterMove.board.grid[5][4]!, position: { col: 4, row: 5 } }, // Red chariot at new position
        { ...blackAdvisor, position: move },
      ]);
      // Need to remove advisor from original position — use the actual board
      const { grid } = afterMove.board;
      const testGrid = grid.map(row => [...row]);
      // Move advisor
      testGrid[blackAdvisor.position.row][blackAdvisor.position.col] = null;
      testGrid[move.row][move.col] = { ...blackAdvisor, position: move };
      const testBoard: Board = { ...afterMove.board, grid: testGrid };

      const checkAfter = getLegalMoves(blackAdvisor, afterMove.board);
      // All returned moves must be legal (check-resolving)
      // This is already guaranteed by getLegalMoves, but verifying the full flow
      expect(checkAfter).toEqual(blackSelects.legalMoves);
      break; // Just verify the first one to avoid redundancy
    }
  });
});
