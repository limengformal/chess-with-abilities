/**
 * Ability execution engine.
 * Pure functions that compute ability effects on the board state.
 */
import {
  Board, PieceInstance, Position, Side, AbilityInstance,
  AbilityTrigger, posEqual, oppositeSide,
} from '../types';
import { getAllPieces, getPieceAt, isInBounds, cloneBoard, getPiecesForSide } from './board';
import { getAbilityById } from './abilityDefs';
import { BOARD_COLS, BOARD_ROWS } from './constants';

// ---- Helpers ----

function hasAbility(piece: PieceInstance, abilityId: string): AbilityInstance | undefined {
  return piece.abilities.find(a => a.abilityId === abilityId && (a.chargesRemaining > 0 || a.chargesRemaining === -1));
}

function hasPassiveAbility(piece: PieceInstance, abilityId: string): boolean {
  return piece.abilities.some(a => a.abilityId === abilityId);
}

function decrementCharge(piece: PieceInstance, abilityId: string): PieceInstance {
  return {
    ...piece,
    abilities: piece.abilities.map(a => {
      if (a.abilityId === abilityId && a.chargesRemaining > 0) {
        return { ...a, chargesRemaining: a.chargesRemaining - 1 };
      }
      return a;
    }),
  };
}

function removeAbility(piece: PieceInstance, abilityId: string): PieceInstance {
  return {
    ...piece,
    abilities: piece.abilities.filter(a => a.abilityId !== abilityId),
  };
}

function clearAllAbilities(piece: PieceInstance): PieceInstance {
  return { ...piece, abilities: [] };
}

function setPieceOnBoard(board: Board, piece: PieceInstance): Board {
  const newBoard = cloneBoard(board);
  newBoard.grid[piece.position.row][piece.position.col] = piece;
  return newBoard;
}

function removePieceFromBoard(board: Board, pos: Position): Board {
  const newBoard = cloneBoard(board);
  newBoard.grid[pos.row][pos.col] = null;
  return newBoard;
}

function getAdjacentPositions(pos: Position): Position[] {
  const deltas = [
    { col: -1, row: 0 }, { col: 1, row: 0 },
    { col: 0, row: -1 }, { col: 0, row: 1 },
    { col: -1, row: -1 }, { col: 1, row: -1 },
    { col: -1, row: 1 }, { col: 1, row: 1 },
  ];
  return deltas
    .map(d => ({ col: pos.col + d.col, row: pos.row + d.row }))
    .filter(isInBounds);
}

function getPositionsInRange(pos: Position, range: number): Position[] {
  const positions: Position[] = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const dist = Math.abs(row - pos.row) + Math.abs(col - pos.col);
      if (dist > 0 && dist <= range) {
        positions.push({ col, row });
      }
    }
  }
  return positions;
}

// ---- Ability Effect Results ----

export interface AbilityResult {
  board: Board;
  capturedPieces: PieceInstance[];     // newly captured pieces to add
  restoredPieceIds: string[];          // piece IDs restored from captured
  extraMove: boolean;                  // attacker gets another move
  preventCapture: boolean;             // defender survives capture
  abilityLog: { pieceId: string; abilityId: string; messageKey: string }[];
  freezeTargets: { pieceId: string; turns: number }[];
  revealedPieces: string[];            // piece IDs whose abilities are revealed
}

function emptyResult(board: Board): AbilityResult {
  return {
    board,
    capturedPieces: [],
    restoredPieceIds: [],
    extraMove: false,
    preventCapture: false,
    abilityLog: [],
    freezeTargets: [],
    revealedPieces: [],
  };
}

// ---- Get Valid Targets for Active Abilities ----

export function getActiveAbilityTargets(
  board: Board,
  piece: PieceInstance,
  abilityId: string,
  capturedPieces: PieceInstance[],
): Position[] {
  const def = getAbilityById(abilityId);
  if (!def) return [];

  const ability = hasAbility(piece, abilityId);
  if (!ability) return [];
  if (def.triggerType !== AbilityTrigger.Active) return [];

  switch (abilityId) {
    case 'teleport': {
      // Any empty square on the board
      const targets: Position[] = [];
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          if (!board.grid[row][col]) {
            targets.push({ col, row });
          }
        }
      }
      return targets;
    }

    case 'double-move': {
      // No targeting needed - targets self (returns piece's own position as marker)
      return [piece.position];
    }

    case 'resurrect': {
      // Targets a captured friendly piece - returns empty squares adjacent to friendly pieces
      const friendlyCaptured = capturedPieces.filter(p => p.side === piece.side);
      if (friendlyCaptured.length === 0) return [];
      // Return all empty squares as potential resurrection points
      const targets: Position[] = [];
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          if (!board.grid[row][col]) {
            targets.push({ col, row });
          }
        }
      }
      return targets;
    }

    case 'range-attack': {
      // Enemy pieces within range 2
      const positions = getPositionsInRange(piece.position, 2);
      return positions.filter(pos => {
        const target = getPieceAt(board, pos);
        return target && target.side !== piece.side;
      });
    }

    case 'swap': {
      // Any friendly piece
      const friendlies = getPiecesForSide(board, piece.side);
      return friendlies
        .filter(p => p.id !== piece.id)
        .map(p => p.position);
    }

    case 'scout': {
      // Target a specific enemy within 2 squares to reveal their abilities
      const positions = getPositionsInRange(piece.position, 2);
      return positions.filter(pos => {
        const target = getPieceAt(board, pos);
        return target && target.side !== piece.side;
      });
    }

    case 'shadow-step': {
      // Move to an empty square adjacent to any enemy piece
      const enemies = getAllPieces(board).filter(p => p.side !== piece.side);
      const targetSet = new Set<string>();
      const targets: Position[] = [];
      for (const enemy of enemies) {
        for (const adj of getAdjacentPositions(enemy.position)) {
          const key = `${adj.col},${adj.row}`;
          if (!targetSet.has(key) && !board.grid[adj.row][adj.col] && !posEqual(adj, piece.position)) {
            targetSet.add(key);
            targets.push(adj);
          }
        }
      }
      return targets;
    }

    default:
      return [];
  }
}

// ---- Execute Active Ability ----

export function executeActiveAbility(
  board: Board,
  piece: PieceInstance,
  abilityId: string,
  target: Position,
  capturedPieces: PieceInstance[],
): AbilityResult {
  const result = emptyResult(board);

  switch (abilityId) {
    case 'teleport': {
      // Move piece to target empty square
      let newBoard = removePieceFromBoard(board, piece.position);
      const movedPiece = decrementCharge({ ...piece, position: target }, abilityId);
      newBoard = setPieceOnBoard(newBoard, movedPiece);
      result.board = newBoard;
      result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.teleport' });
      return result;
    }

    case 'double-move': {
      // Flag extra move, don't change board
      const updatedPiece = decrementCharge(piece, abilityId);
      result.board = setPieceOnBoard(board, updatedPiece);
      result.extraMove = true;
      result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.doubleMove' });
      return result;
    }

    case 'resurrect': {
      // Find first captured friendly piece and place at target
      const friendlyCaptured = capturedPieces.filter(p => p.side === piece.side);
      if (friendlyCaptured.length === 0) return result;
      const toRestore = friendlyCaptured[friendlyCaptured.length - 1]; // most recently captured
      const restoredPiece: PieceInstance = {
        ...toRestore,
        position: target,
        abilities: toRestore.abilities,
        isFrozen: false,
        frozenTurnsRemaining: 0,
      };
      const updatedCaster = decrementCharge(piece, abilityId);
      let newBoard = setPieceOnBoard(board, updatedCaster);
      newBoard = setPieceOnBoard(newBoard, restoredPiece);
      result.board = newBoard;
      result.restoredPieceIds.push(toRestore.id);
      result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.resurrect' });
      return result;
    }

    case 'range-attack': {
      // Capture target enemy at range
      const targetPiece = getPieceAt(board, target);
      if (!targetPiece || targetPiece.side === piece.side) return result;

      // Check if target has Fortify (passive: immune after standing still 2+ turns)
      if (hasAbility(targetPiece, 'fortify') && targetPiece.fortifyTurnsStationary >= 2) {
        const fortifiedPiece = decrementCharge(targetPiece, 'fortify');
        const updatedAttacker = decrementCharge(piece, abilityId);
        let newBoard = setPieceOnBoard(board, updatedAttacker);
        newBoard = setPieceOnBoard(newBoard, fortifiedPiece);
        result.board = newBoard;
        result.abilityLog.push({ pieceId: targetPiece.id, abilityId: 'fortify', messageKey: 'abilityLog.fortify' });
        result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.rangeAttack' });
        return result;
      }

      // Check if target has Shield
      const shieldAbility = hasAbility(targetPiece, 'shield');
      if (shieldAbility) {
        const shieldedPiece = decrementCharge(targetPiece, 'shield');
        const updatedAttacker = decrementCharge(piece, abilityId);
        let newBoard = setPieceOnBoard(board, updatedAttacker);
        newBoard = setPieceOnBoard(newBoard, shieldedPiece);
        result.board = newBoard;
        result.abilityLog.push({ pieceId: targetPiece.id, abilityId: 'shield', messageKey: 'abilityLog.shield' });
        result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.rangeAttack' });
        return result;
      }

      // Check if target has Poison
      const poisonAbility = hasAbility(targetPiece, 'poison');

      let newBoard = removePieceFromBoard(board, target);
      let updatedAttacker = decrementCharge(piece, abilityId);

      if (poisonAbility) {
        updatedAttacker = clearAllAbilities(updatedAttacker);
        result.abilityLog.push({ pieceId: targetPiece.id, abilityId: 'poison', messageKey: 'abilityLog.poison' });
      }

      newBoard = setPieceOnBoard(newBoard, updatedAttacker);
      result.board = newBoard;
      result.capturedPieces.push(targetPiece);
      result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.rangeAttack' });
      return result;
    }

    case 'swap': {
      // Swap positions with target friendly piece
      const targetPiece = getPieceAt(board, target);
      if (!targetPiece || targetPiece.side !== piece.side) return result;

      const pos1 = piece.position;
      const pos2 = targetPiece.position;

      const updatedPiece = decrementCharge({ ...piece, position: pos2 }, abilityId);
      const updatedTarget: PieceInstance = { ...targetPiece, position: pos1 };

      let newBoard = cloneBoard(board);
      newBoard.grid[pos1.row][pos1.col] = updatedTarget;
      newBoard.grid[pos2.row][pos2.col] = updatedPiece;

      result.board = newBoard;
      result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.swap' });
      return result;
    }

    case 'scout': {
      // Reveal only the targeted enemy's abilities
      const updatedPiece = decrementCharge(piece, abilityId);
      let newBoard = setPieceOnBoard(board, updatedPiece);

      const targetPiece = getPieceAt(newBoard, target);
      if (targetPiece && targetPiece.side !== piece.side) {
        const revealed: PieceInstance = { ...targetPiece, isRevealed: true };
        newBoard = setPieceOnBoard(newBoard, revealed);
        result.revealedPieces.push(targetPiece.id);
      }

      result.board = newBoard;
      result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.scout' });
      return result;
    }

    case 'shadow-step': {
      // Move to target empty square (adjacent to an enemy)
      let newBoard = removePieceFromBoard(board, piece.position);
      const movedPiece = decrementCharge({ ...piece, position: target, fortifyTurnsStationary: 0 }, abilityId);
      newBoard = setPieceOnBoard(newBoard, movedPiece);
      result.board = newBoard;
      result.abilityLog.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.shadowStep' });
      return result;
    }

    default:
      return result;
  }
}

// ---- Process Capture: defender reactive abilities (Shield, Poison) ----

export interface CaptureResult {
  captured: boolean;          // was the piece actually captured?
  board: Board;
  capturedPiece: PieceInstance | null;
  abilityLog: { pieceId: string; abilityId: string; messageKey: string }[];
  attackerModified: PieceInstance | null; // if attacker was modified by poison etc.
}

export function processCaptureAbilities(
  board: Board,
  attacker: PieceInstance,
  defender: PieceInstance,
): CaptureResult {
  const log: { pieceId: string; abilityId: string; messageKey: string }[] = [];

  // Check Fortify (passive: immune after standing still 2+ turns, one-time use)
  if (hasAbility(defender, 'fortify') && defender.fortifyTurnsStationary >= 2) {
    // Fortified piece survives capture — consume the charge
    const fortifiedDefender = decrementCharge(defender, 'fortify');
    const newBoard = setPieceOnBoard(board, fortifiedDefender);
    log.push({ pieceId: defender.id, abilityId: 'fortify', messageKey: 'abilityLog.fortify' });
    return {
      captured: false,
      board: newBoard,
      capturedPiece: null,
      abilityLog: log,
      attackerModified: null,
    };
  }

  // Check Shield
  const shieldAbility = hasAbility(defender, 'shield');
  if (shieldAbility) {
    const shieldedDefender = decrementCharge(defender, 'shield');
    const newBoard = setPieceOnBoard(board, shieldedDefender);
    log.push({ pieceId: defender.id, abilityId: 'shield', messageKey: 'abilityLog.shield' });
    return {
      captured: false,
      board: newBoard,
      capturedPiece: null,
      abilityLog: log,
      attackerModified: null,
    };
  }

  // Capture proceeds - check Poison
  let modifiedAttacker = attacker;
  const poisonAbility = hasAbility(defender, 'poison');
  if (poisonAbility) {
    modifiedAttacker = clearAllAbilities(attacker);
    log.push({ pieceId: defender.id, abilityId: 'poison', messageKey: 'abilityLog.poison' });
  }

  return {
    captured: true,
    board,
    capturedPiece: defender,
    abilityLog: log,
    attackerModified: modifiedAttacker !== attacker ? modifiedAttacker : null,
  };
}

// ---- Process Post-Capture abilities (Berserk, Freeze) ----

export interface PostCaptureResult {
  board: Board;
  extraMove: boolean;
  abilityLog: { pieceId: string; abilityId: string; messageKey: string }[];
  freezeTargets: { pieceId: string; turns: number }[];
}

export function processPostCapture(
  board: Board,
  attacker: PieceInstance,
): PostCaptureResult {
  const log: { pieceId: string; abilityId: string; messageKey: string }[] = [];
  let currentBoard = board;
  let extraMove = false;
  const freezeTargets: { pieceId: string; turns: number }[] = [];

  // Berserk: extra move after capture (limited charges)
  const berserkAbility = hasAbility(attacker, 'berserk');
  if (berserkAbility) {
    extraMove = true;
    const updatedAttacker = decrementCharge(
      currentBoard.grid[attacker.position.row][attacker.position.col] || attacker,
      'berserk'
    );
    currentBoard = setPieceOnBoard(currentBoard, updatedAttacker);
    log.push({ pieceId: attacker.id, abilityId: 'berserk', messageKey: 'abilityLog.berserk' });
  }

  // Freeze: freeze adjacent enemy after capture
  const freezeAbility = hasAbility(attacker, 'freeze');
  if (freezeAbility) {
    const adjacent = getAdjacentPositions(attacker.position);
    for (const pos of adjacent) {
      const target = getPieceAt(currentBoard, pos);
      if (target && target.side !== attacker.side) {
        // Check Iron Will (immune to freeze)
        if (hasPassiveAbility(target, 'iron-will')) {
          log.push({ pieceId: target.id, abilityId: 'iron-will', messageKey: 'abilityLog.ironWill' });
          continue;
        }
        const frozenTarget: PieceInstance = {
          ...target,
          isFrozen: true,
          frozenTurnsRemaining: 2,
        };
        currentBoard = setPieceOnBoard(currentBoard, frozenTarget);
        freezeTargets.push({ pieceId: target.id, turns: 2 });
        break; // Only freeze one enemy per charge
      }
    }
    if (freezeTargets.length > 0) {
      const updatedAttacker = decrementCharge(
        currentBoard.grid[attacker.position.row][attacker.position.col] || attacker,
        'freeze'
      );
      currentBoard = setPieceOnBoard(currentBoard, updatedAttacker);
      log.push({ pieceId: attacker.id, abilityId: 'freeze', messageKey: 'abilityLog.freeze' });
    }
  }

  return { board: currentBoard, extraMove, abilityLog: log, freezeTargets };
}

// ---- Process Mine (on move trigger) ----

export interface MineResult {
  board: Board;
  abilityLog: { pieceId: string; abilityId: string; messageKey: string }[];
}

export function processMinePlacement(
  board: Board,
  piece: PieceInstance,
  fromPos: Position,
): MineResult {
  const log: { pieceId: string; abilityId: string; messageKey: string }[] = [];
  const mineAbility = hasAbility(piece, 'mine');
  if (!mineAbility) return { board, abilityLog: log };

  // Place a mine at the position the piece moved FROM
  const updatedPiece = decrementCharge(
    board.grid[piece.position.row][piece.position.col] || piece,
    'mine'
  );
  let newBoard = setPieceOnBoard(board, updatedPiece);

  newBoard = {
    ...newBoard,
    mines: [
      ...newBoard.mines,
      { position: fromPos, placedBy: piece.side, turnsRemaining: 10 },
    ],
  };

  log.push({ pieceId: piece.id, abilityId: 'mine', messageKey: 'abilityLog.mine' });
  return { board: newBoard, abilityLog: log };
}

// ---- Check Mine triggers ----

export interface MineTriggerResult {
  board: Board;
  triggered: boolean;
  abilityLog: { pieceId: string; abilityId: string; messageKey: string }[];
}

export function checkMineTrigger(
  board: Board,
  piece: PieceInstance,
): MineTriggerResult {
  const log: { pieceId: string; abilityId: string; messageKey: string }[] = [];

  const mineIndex = board.mines.findIndex(
    m => posEqual(m.position, piece.position) && m.placedBy !== piece.side
  );

  if (mineIndex === -1) return { board, triggered: false, abilityLog: log };

  // Mine triggered! Remove all abilities from the piece
  const strippedPiece = clearAllAbilities(piece);
  let newBoard = setPieceOnBoard(board, strippedPiece);

  // Remove the mine
  newBoard = {
    ...newBoard,
    mines: newBoard.mines.filter((_, i) => i !== mineIndex),
  };

  log.push({ pieceId: piece.id, abilityId: 'mine', messageKey: 'abilityLog.mineTriggered' });
  return { board: newBoard, triggered: true, abilityLog: log };
}

// ---- Treasure Point Check ----

export interface TreasureResult {
  board: Board;
  abilityGained: string | null;
  abilityLog: { pieceId: string; abilityId: string; messageKey: string }[];
}

export function checkTreasurePoint(
  board: Board,
  piece: PieceInstance,
  bannedAbilities: string[],
): TreasureResult {
  const log: { pieceId: string; abilityId: string; messageKey: string }[] = [];

  const tpIndex = board.treasurePoints.findIndex(
    tp => !tp.collected && posEqual(tp.position, piece.position)
  );

  if (tpIndex === -1) return { board, abilityGained: null, abilityLog: log };

  // Treasure collected! Grant random ability from banned pool
  if (bannedAbilities.length === 0) {
    // Just mark collected, no ability to give
    const newBoard = {
      ...board,
      treasurePoints: board.treasurePoints.map((tp, i) =>
        i === tpIndex ? { ...tp, collected: true } : tp
      ),
    };
    return { board: newBoard, abilityGained: null, abilityLog: log };
  }

  // Pick random banned ability
  const randomIndex = Math.floor(Math.random() * bannedAbilities.length);
  const abilityId = bannedAbilities[randomIndex];
  const def = getAbilityById(abilityId);

  if (!def) return { board, abilityGained: null, abilityLog: log };

  // Add ability to piece if it doesn't already have it
  const alreadyHas = piece.abilities.some(a => a.abilityId === abilityId);
  let updatedPiece = piece;
  if (!alreadyHas) {
    updatedPiece = {
      ...piece,
      abilities: [...piece.abilities, {
        abilityId: def.id,
        chargesRemaining: def.maxCharges,
        isActive: false,
        metadata: {},
      }],
    };
  }

  let newBoard = setPieceOnBoard(board, updatedPiece);
  newBoard = {
    ...newBoard,
    treasurePoints: newBoard.treasurePoints.map((tp, i) =>
      i === tpIndex ? { ...tp, collected: true } : tp
    ),
  };

  log.push({ pieceId: piece.id, abilityId, messageKey: 'abilityLog.treasure' });
  return { board: newBoard, abilityGained: abilityId, abilityLog: log };
}

// ---- Capture Inheritance ----

export interface InheritanceResult {
  board: Board;
  inherited: boolean;
  abilityId: string | null;
  abilityLog: { pieceId: string; abilityId: string; messageKey: string }[];
}

export function checkCaptureInheritance(
  board: Board,
  attacker: PieceInstance,
  capturedPiece: PieceInstance,
): InheritanceResult {
  const log: { pieceId: string; abilityId: string; messageKey: string }[] = [];

  if (capturedPiece.abilities.length === 0) {
    return { board, inherited: false, abilityId: null, abilityLog: log };
  }

  // 50% chance to inherit
  if (Math.random() >= 0.5) {
    return { board, inherited: false, abilityId: null, abilityLog: log };
  }

  // Pick the first ability from captured piece
  const inheritedAbility = capturedPiece.abilities[0];
  const currentAttacker = board.grid[attacker.position.row][attacker.position.col];
  if (!currentAttacker) return { board, inherited: false, abilityId: null, abilityLog: log };

  // Check if attacker already has this ability
  if (currentAttacker.abilities.some(a => a.abilityId === inheritedAbility.abilityId)) {
    return { board, inherited: false, abilityId: null, abilityLog: log };
  }

  const def = getAbilityById(inheritedAbility.abilityId);
  if (!def) return { board, inherited: false, abilityId: null, abilityLog: log };

  const updatedAttacker: PieceInstance = {
    ...currentAttacker,
    abilities: [...currentAttacker.abilities, {
      abilityId: def.id,
      chargesRemaining: def.maxCharges,
      isActive: false,
      metadata: {},
    }],
  };

  const newBoard = setPieceOnBoard(board, updatedAttacker);
  log.push({ pieceId: attacker.id, abilityId: inheritedAbility.abilityId, messageKey: 'abilityLog.inherit' });

  return { board: newBoard, inherited: true, abilityId: inheritedAbility.abilityId, abilityLog: log };
}

// ---- Turn Start Processing (frozen timers, fortify counters) ----

export function processTurnStart(board: Board, side: Side): Board {
  let newBoard = cloneBoard(board);

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = newBoard.grid[row][col];
      if (!piece || piece.side !== side) continue;

      let updated = piece;

      // Decrement frozen timer
      if (updated.isFrozen) {
        const remaining = updated.frozenTurnsRemaining - 1;
        updated = {
          ...updated,
          frozenTurnsRemaining: remaining,
          isFrozen: remaining > 0,
        };
      }

      // Increment fortify counter (stationary turns)
      // This will be reset to 0 when the piece moves
      // Already at this value from previous state

      if (updated !== piece) {
        newBoard.grid[row][col] = updated;
      }
    }
  }

  // Decrement mine timers
  newBoard = {
    ...newBoard,
    mines: newBoard.mines
      .map(m => ({ ...m, turnsRemaining: m.turnsRemaining - 1 }))
      .filter(m => m.turnsRemaining > 0),
  };

  return newBoard;
}

// ---- Get Active Abilities for a Piece ----

export function getActiveAbilities(piece: PieceInstance): { abilityId: string; def: ReturnType<typeof getAbilityById> }[] {
  return piece.abilities
    .filter(a => {
      const def = getAbilityById(a.abilityId);
      return def && def.triggerType === AbilityTrigger.Active && (a.chargesRemaining > 0 || a.chargesRemaining === -1);
    })
    .map(a => ({ abilityId: a.abilityId, def: getAbilityById(a.abilityId) }));
}
