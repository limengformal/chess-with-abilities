import {
  GameState, GamePhase, MoveRecord, PieceInstance, PieceType, Side, oppositeSide,
  Position, PlayerType, AbilityId, BanPhaseState, PickPhaseState,
  PieceAbilityAssignment, createAbilityInstance, AbilityLogEntry, BoardTheme,
} from '../types';
import { createInitialBoard, cloneBoard, findPieceById, getPieceAt } from '../core/board';
import { getLegalMoves, isInCheck, isCheckmate, isStalemate } from '../core/rules';
import { ALL_ABILITIES, getAbilityById } from '../core/abilityDefs';
import {
  processCaptureAbilities,
  processPostCapture,
  processMinePlacement,
  checkMineTrigger,
  checkTreasurePoint,
  checkCaptureInheritance,
  processTurnStart,
  getActiveAbilityTargets,
  executeActiveAbility,
  getActiveAbilities,
} from '../core/abilities';

const DEFAULT_BANS = 3;
const DEFAULT_BUDGET = 10;

export type GameAction =
  | { type: 'START_GAME'; mode: 'local' | 'ai'; redName?: string; blackName?: string }
  | { type: 'SELECT_PIECE'; pieceId: string }
  | { type: 'DESELECT_PIECE' }
  | { type: 'MOVE_PIECE'; to: Position }
  | { type: 'RESET_GAME' }
  | { type: 'SKIP_TO_PLAY' }
  | { type: 'BAN_ABILITY'; abilityId: AbilityId }
  | { type: 'PICK_ABILITY'; abilityId: AbilityId; pieceId: string }
  | { type: 'UNPICK_ABILITY'; abilityId: AbilityId; pieceId: string }
  | { type: 'CONFIRM_PICKS' }
  | { type: 'ACTIVATE_ABILITY'; pieceId: string; abilityId: AbilityId }
  | { type: 'EXECUTE_PENDING_ABILITY'; target: Position }
  | { type: 'CANCEL_PENDING_ABILITY' }
  | { type: 'SELECT_RESURRECT_PIECE'; capturedPieceId: string }
  | { type: 'SURRENDER' }
  | { type: 'END_WIN_ANIMATION' }
  | { type: 'SET_BOARD_THEME'; theme: BoardTheme }
  | { type: 'PROPOSE_DRAW' }
  | { type: 'RESPOND_DRAW'; accept: boolean };

// Helper to get all banned ability IDs
function getBannedAbilityIds(state: GameState): string[] {
  if (!state.banPhase) return [];
  return [...state.banPhase.bannedAbilities[Side.Red], ...state.banPhase.bannedAbilities[Side.Black]];
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const board = createInitialBoard();
      const banPhase: BanPhaseState = {
        bannedAbilities: { [Side.Red]: [], [Side.Black]: [] },
        currentBanner: Side.Red,
        bansRemaining: { [Side.Red]: DEFAULT_BANS, [Side.Black]: DEFAULT_BANS },
      };
      return {
        ...state,
        phase: GamePhase.Ban,
        board,
        currentTurn: Side.Red,
        turnNumber: 1,
        players: {
          [Side.Red]: { side: Side.Red, type: PlayerType.Human, name: action.redName || 'Red' },
          [Side.Black]: {
            side: Side.Black,
            type: action.mode === 'ai' ? PlayerType.AI : PlayerType.Human,
            name: action.mode === 'ai' ? ['技能中', '国象棋'][Math.floor(Math.random() * 2)] : (action.blackName || 'Black'),
          },
        },
        capturedPieces: [],
        moveHistory: [],
        banPhase,
        pickPhase: null,
        checkState: null,
        winner: null,
        selectedPieceId: null,
        legalMoves: [],
        pendingAbility: null,
        isDoubleMoveActive: false,
        abilityLog: [],
        animations: [],
        winAnimation: null,
        boardTheme: state.boardTheme,
        drawProposal: null,
        isDraw: false,
      };
    }

    case 'SKIP_TO_PLAY': {
      const board = createInitialBoard();
      return {
        ...state,
        phase: GamePhase.Play,
        board,
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
        checkState: null,
        winner: null,
        selectedPieceId: null,
        legalMoves: [],
        pendingAbility: null,
        isDoubleMoveActive: false,
        abilityLog: [],
        animations: [],
        winAnimation: null,
        boardTheme: state.boardTheme,
        drawProposal: null,
        isDraw: false,
      };
    }

    case 'BAN_ABILITY': {
      if (state.phase !== GamePhase.Ban || !state.banPhase) return state;
      const { banPhase } = state;
      const side = banPhase.currentBanner;

      if (banPhase.bansRemaining[side] <= 0) return state;

      const allBanned = [...banPhase.bannedAbilities[Side.Red], ...banPhase.bannedAbilities[Side.Black]];
      if (allBanned.includes(action.abilityId)) return state;

      const newBannedAbilities = {
        ...banPhase.bannedAbilities,
        [side]: [...banPhase.bannedAbilities[side], action.abilityId],
      };
      const newBansRemaining = {
        ...banPhase.bansRemaining,
        [side]: banPhase.bansRemaining[side] - 1,
      };

      const totalBansLeft = newBansRemaining[Side.Red] + newBansRemaining[Side.Black];
      if (totalBansLeft === 0) {
        const allAbilityIds = ALL_ABILITIES.map(a => a.id);
        const bannedIds = [...newBannedAbilities[Side.Red], ...newBannedAbilities[Side.Black]];
        const available = allAbilityIds.filter(id => !bannedIds.includes(id));

        const pickPhase: PickPhaseState = {
          currentPicker: Side.Red,
          budgetRemaining: { [Side.Red]: DEFAULT_BUDGET, [Side.Black]: DEFAULT_BUDGET },
          assignments: { [Side.Red]: [], [Side.Black]: [] },
          availableAbilities: available,
        };

        return {
          ...state,
          phase: GamePhase.Pick,
          banPhase: { ...banPhase, bannedAbilities: newBannedAbilities, bansRemaining: newBansRemaining },
          pickPhase,
        };
      }

      const nextBanner = oppositeSide(side);
      return {
        ...state,
        banPhase: {
          ...banPhase,
          bannedAbilities: newBannedAbilities,
          bansRemaining: newBansRemaining,
          currentBanner: newBansRemaining[nextBanner] > 0 ? nextBanner : side,
        },
      };
    }

    case 'PICK_ABILITY': {
      if (state.phase !== GamePhase.Pick || !state.pickPhase) return state;
      const { pickPhase } = state;
      const side = pickPhase.currentPicker;

      const ability = getAbilityById(action.abilityId);
      if (!ability) return state;
      if (!pickPhase.availableAbilities.includes(action.abilityId)) return state;
      if (pickPhase.budgetRemaining[side] < ability.cost) return state;

      const piece = findPieceById(state.board, action.pieceId);
      if (!piece || piece.side !== side) return state;

      const existingAssignment = pickPhase.assignments[side].find(a => a.pieceId === action.pieceId);
      if (existingAssignment) return state;

      const newAssignment: PieceAbilityAssignment = {
        pieceId: action.pieceId,
        abilityId: action.abilityId,
      };

      return {
        ...state,
        pickPhase: {
          ...pickPhase,
          assignments: {
            ...pickPhase.assignments,
            [side]: [...pickPhase.assignments[side], newAssignment],
          },
          budgetRemaining: {
            ...pickPhase.budgetRemaining,
            [side]: pickPhase.budgetRemaining[side] - ability.cost,
          },
        },
      };
    }

    case 'UNPICK_ABILITY': {
      if (state.phase !== GamePhase.Pick || !state.pickPhase) return state;
      const { pickPhase } = state;
      const side = pickPhase.currentPicker;

      const assignment = pickPhase.assignments[side].find(
        a => a.pieceId === action.pieceId && a.abilityId === action.abilityId
      );
      if (!assignment) return state;

      const ability = getAbilityById(action.abilityId);
      if (!ability) return state;

      return {
        ...state,
        pickPhase: {
          ...pickPhase,
          assignments: {
            ...pickPhase.assignments,
            [side]: pickPhase.assignments[side].filter(
              a => !(a.pieceId === action.pieceId && a.abilityId === action.abilityId)
            ),
          },
          budgetRemaining: {
            ...pickPhase.budgetRemaining,
            [side]: pickPhase.budgetRemaining[side] + ability.cost,
          },
        },
      };
    }

    case 'CONFIRM_PICKS': {
      if (state.phase !== GamePhase.Pick || !state.pickPhase) return state;
      const { pickPhase } = state;
      const side = pickPhase.currentPicker;

      if (side === Side.Red) {
        return {
          ...state,
          pickPhase: {
            ...pickPhase,
            currentPicker: Side.Black,
          },
        };
      }

      // Both confirmed — apply abilities to pieces and start Play
      const newBoard = cloneBoard(state.board);
      for (const s of [Side.Red, Side.Black] as Side[]) {
        for (const assignment of pickPhase.assignments[s]) {
          const abilityDef = getAbilityById(assignment.abilityId);
          if (!abilityDef) continue;

          for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
              const p = newBoard.grid[row][col];
              if (p && p.id === assignment.pieceId) {
                newBoard.grid[row][col] = {
                  ...p,
                  abilities: [...p.abilities, createAbilityInstance(abilityDef)],
                };
              }
            }
          }
        }
      }

      return {
        ...state,
        phase: GamePhase.Play,
        board: newBoard,
        currentTurn: Side.Red,
      };
    }

    case 'SELECT_PIECE': {
      if (state.phase !== GamePhase.Play) return state;
      if (state.pendingAbility) return state; // Can't select during ability targeting
      const piece = findPieceById(state.board, action.pieceId);
      if (!piece) return state;
      if (piece.side !== state.currentTurn) return state;
      if (piece.isFrozen) return state; // Frozen pieces can't move

      const moves = getLegalMoves(piece, state.board);
      return {
        ...state,
        selectedPieceId: action.pieceId,
        legalMoves: moves,
      };
    }

    case 'DESELECT_PIECE': {
      if (state.pendingAbility) return state; // Can't deselect during ability targeting
      return {
        ...state,
        selectedPieceId: null,
        legalMoves: [],
      };
    }

    case 'ACTIVATE_ABILITY': {
      if (state.phase !== GamePhase.Play) return state;
      if (state.pendingAbility) return state;

      const piece = findPieceById(state.board, action.pieceId);
      if (!piece) return state;
      if (piece.side !== state.currentTurn) return state;
      if (piece.isFrozen) return state;

      const activeAbilities = getActiveAbilities(piece);
      const found = activeAbilities.find(a => a.abilityId === action.abilityId);
      if (!found) return state;

      const targets = getActiveAbilityTargets(
        state.board, piece, action.abilityId, state.capturedPieces
      );

      // For abilities that don't need targeting (double-move only)
      if (action.abilityId === 'double-move') {
        const result = executeActiveAbility(
          state.board, piece, action.abilityId, piece.position, state.capturedPieces
        );

        const newLogs: AbilityLogEntry[] = result.abilityLog.map(l => ({
          ...l, turnNumber: state.turnNumber,
        }));

        return {
          ...state,
          board: result.board,
          isDoubleMoveActive: result.extraMove || state.isDoubleMoveActive,
          abilityLog: [...state.abilityLog, ...newLogs],
          selectedPieceId: null,
          legalMoves: [],
          animations: [{ type: 'ability', data: { abilityId: action.abilityId, pieceId: piece.id }, startTime: Date.now() }],
        };
      }

      // For resurrect, we need special handling to pick which captured piece
      if (action.abilityId === 'resurrect') {
        const friendlyCaptured = state.capturedPieces.filter(p => p.side === piece.side);
        if (friendlyCaptured.length === 0) return state;
        // If only one captured piece, go directly to position targeting
        if (friendlyCaptured.length === 1) {
          return {
            ...state,
            pendingAbility: {
              pieceId: piece.id,
              abilityId: action.abilityId,
              validTargets: targets,
            },
            selectedPieceId: piece.id,
            legalMoves: [],
          };
        }
        // Multiple captured - still go to targeting (we'll resurrect the most recent)
        return {
          ...state,
          pendingAbility: {
            pieceId: piece.id,
            abilityId: action.abilityId,
            validTargets: targets,
          },
          selectedPieceId: piece.id,
          legalMoves: [],
        };
      }

      if (targets.length === 0) return state;

      return {
        ...state,
        pendingAbility: {
          pieceId: piece.id,
          abilityId: action.abilityId,
          validTargets: targets,
        },
        selectedPieceId: piece.id,
        legalMoves: [],
      };
    }

    case 'EXECUTE_PENDING_ABILITY': {
      if (!state.pendingAbility) return state;

      const { pieceId, abilityId, validTargets } = state.pendingAbility;
      const piece = findPieceById(state.board, pieceId);
      if (!piece) return state;

      // Check target is valid
      const isValidTarget = validTargets.some(
        t => t.col === action.target.col && t.row === action.target.row
      );
      if (!isValidTarget) return state;

      const result = executeActiveAbility(
        state.board, piece, abilityId, action.target, state.capturedPieces
      );

      const newLogs: AbilityLogEntry[] = result.abilityLog.map(l => ({
        ...l, turnNumber: state.turnNumber,
      }));

      // Remove restored pieces from captured list
      let newCapturedPieces = state.capturedPieces;
      if (result.restoredPieceIds.length > 0) {
        newCapturedPieces = state.capturedPieces.filter(
          p => !result.restoredPieceIds.includes(p.id)
        );
      }

      // Add newly captured pieces
      newCapturedPieces = [...newCapturedPieces, ...result.capturedPieces];

      // Check if using the ability ends the turn (unless double move is active)
      // Active abilities use the turn unless double-move is active
      const useTurn = !state.isDoubleMoveActive;
      const nextSide = useTurn ? oppositeSide(state.currentTurn) : state.currentTurn;

      // Process turn start for next side if switching
      let finalBoard = result.board;
      if (useTurn) {
        finalBoard = processTurnStart(finalBoard, nextSide);
      }

      // Check for General captured / check / checkmate
      const checkState = isInCheck(finalBoard, nextSide);
      let winner: Side | null = null;
      let isGeneralCapture = false;
      // Instant win if General was captured by ability
      if (result.capturedPieces.some(p => p.type === PieceType.General)) {
        winner = state.currentTurn;
        isGeneralCapture = true;
      } else if (isCheckmate(finalBoard, nextSide)) {
        winner = state.currentTurn;
      }

      return {
        ...state,
        phase: winner && !isGeneralCapture ? GamePhase.End : GamePhase.Play,
        board: finalBoard,
        currentTurn: nextSide,
        turnNumber: useTurn && state.currentTurn === Side.Black ? state.turnNumber + 1 : state.turnNumber,
        capturedPieces: newCapturedPieces,
        pendingAbility: null,
        isDoubleMoveActive: useTurn ? false : state.isDoubleMoveActive,
        selectedPieceId: null,
        legalMoves: [],
        checkState,
        winner,
        abilityLog: [...state.abilityLog, ...newLogs],
        animations: [{ type: 'ability', data: { abilityId, pieceId }, startTime: Date.now() }],
        winAnimation: isGeneralCapture
          ? { winner: state.currentTurn, capturePosition: action.target, startTime: Date.now() }
          : state.winAnimation,
      };
    }

    case 'CANCEL_PENDING_ABILITY': {
      return {
        ...state,
        pendingAbility: null,
        selectedPieceId: null,
        legalMoves: [],
      };
    }

    case 'MOVE_PIECE': {
      if (state.phase !== GamePhase.Play) return state;
      if (!state.selectedPieceId) return state;
      if (state.pendingAbility) return state; // Can't move during ability targeting

      const piece = findPieceById(state.board, state.selectedPieceId);
      if (!piece) return state;
      if (piece.isFrozen) return state;

      const isLegal = state.legalMoves.some(
        m => m.col === action.to.col && m.row === action.to.row
      );
      if (!isLegal) return state;

      let currentBoard = cloneBoard(state.board);
      const fromPos = piece.position;
      const { col: toCol, row: toRow } = action.to;

      const defender = currentBoard.grid[toRow][toCol];
      const abilitiesTriggered: AbilityId[] = [];
      const newAbilityLogs: AbilityLogEntry[] = [];
      let newCapturedPieces = [...state.capturedPieces];
      let extraMove = false;

      // --- Step 1: Process capture (if there's a defender) ---
      let capturedPiece: PieceInstance | null = null;
      let poisonTriggered = false;
      let movedPiece: PieceInstance = {
        ...piece,
        position: { col: toCol, row: toRow },
        fortifyTurnsStationary: 0, // Reset fortify counter on move
      };

      if (defender) {
        const captureResult = processCaptureAbilities(currentBoard, piece, defender);

        for (const log of captureResult.abilityLog) {
          newAbilityLogs.push({ ...log, turnNumber: state.turnNumber });
          abilitiesTriggered.push(log.abilityId);
        }

        if (!captureResult.captured) {
          // Defender survived (Shield or Fortify) — attacker doesn't move to that square
          // For Shield: move is blocked, turn is consumed
          // For Fortify: move is blocked, turn is consumed
          currentBoard = captureResult.board;

          // Still need to move attacker somewhere... in xiangqi the move would fail
          // Let's treat it as: the attack bounces, piece stays in place but turn ends
          // If double move is active, this bounce uses the bonus move but stays on same side
          const nextSide = state.isDoubleMoveActive ? state.currentTurn : oppositeSide(state.currentTurn);
          if (nextSide !== state.currentTurn) {
            currentBoard = processTurnStart(currentBoard, nextSide);
          }
          const checkState = isInCheck(currentBoard, nextSide);

          return {
            ...state,
            board: currentBoard,
            currentTurn: nextSide,
            turnNumber: !state.isDoubleMoveActive && state.currentTurn === Side.Black ? state.turnNumber + 1 : state.turnNumber,
            isDoubleMoveActive: false,
            selectedPieceId: null,
            legalMoves: [],
            checkState,
            abilityLog: [...state.abilityLog, ...newAbilityLogs],
            animations: [{ type: 'shield', data: { position: action.to }, startTime: Date.now() }],
          };
        }

        // Capture succeeded
        capturedPiece = defender;
        poisonTriggered = captureResult.attackerModified !== null;
        if (captureResult.attackerModified) {
          movedPiece = { ...captureResult.attackerModified, position: { col: toCol, row: toRow }, fortifyTurnsStationary: 0 };
        }
        newCapturedPieces.push(capturedPiece);
      } else {
        // No capture — increment fortify counter if piece didn't move (can't happen since we're moving)
        // fortifyTurnsStationary is reset to 0 already
      }

      // --- Step 2: Execute the move ---
      currentBoard.grid[fromPos.row][fromPos.col] = null;
      currentBoard.grid[toRow][toCol] = movedPiece;

      // --- Step 3: Mine placement (OnMove trigger) ---
      const mineResult = processMinePlacement(currentBoard, movedPiece, fromPos);
      currentBoard = mineResult.board;
      for (const log of mineResult.abilityLog) {
        newAbilityLogs.push({ ...log, turnNumber: state.turnNumber });
        abilitiesTriggered.push(log.abilityId);
      }

      // --- Step 4: Mine trigger check (did we step on a mine?) ---
      const mineTrigger = checkMineTrigger(currentBoard, movedPiece);
      currentBoard = mineTrigger.board;
      for (const log of mineTrigger.abilityLog) {
        newAbilityLogs.push({ ...log, turnNumber: state.turnNumber });
        abilitiesTriggered.push(log.abilityId);
      }

      // --- Step 5: Post-capture abilities (Berserk, Freeze) ---
      if (capturedPiece) {
        const currentAttacker = currentBoard.grid[toRow][toCol];
        if (currentAttacker) {
          const postCapture = processPostCapture(currentBoard, currentAttacker);
          currentBoard = postCapture.board;
          if (postCapture.extraMove) extraMove = true;
          for (const log of postCapture.abilityLog) {
            newAbilityLogs.push({ ...log, turnNumber: state.turnNumber });
            abilitiesTriggered.push(log.abilityId);
          }
        }

        // --- Step 6: Capture inheritance (50% chance) ---
        // Skip inheritance if poison triggered — poison permanently strips abilities
        if (!poisonTriggered) {
          const currentAttacker2 = currentBoard.grid[toRow][toCol];
          if (currentAttacker2) {
            const inheritance = checkCaptureInheritance(currentBoard, currentAttacker2, capturedPiece);
            currentBoard = inheritance.board;
            for (const log of inheritance.abilityLog) {
              newAbilityLogs.push({ ...log, turnNumber: state.turnNumber });
            }
          }
        }
      }

      // --- Step 7: Treasure point check ---
      const movedPieceOnBoard = currentBoard.grid[toRow][toCol];
      if (movedPieceOnBoard) {
        const bannedIds = getBannedAbilityIds(state);
        const treasureResult = checkTreasurePoint(currentBoard, movedPieceOnBoard, bannedIds);
        currentBoard = treasureResult.board;
        for (const log of treasureResult.abilityLog) {
          newAbilityLogs.push({ ...log, turnNumber: state.turnNumber });
        }
      }

      // --- Step 8: Increment fortify counters for stationary pieces ---
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
          const p = currentBoard.grid[row][col];
          if (p && p.side === state.currentTurn && p.id !== piece.id) {
            currentBoard.grid[row][col] = {
              ...p,
              fortifyTurnsStationary: p.fortifyTurnsStationary + 1,
            };
          }
        }
      }

      // --- Step 9: Determine next turn ---
      // isDoubleMoveActive=true means "bonus move available, stay on same side"
      const nextSide = state.isDoubleMoveActive
        ? state.currentTurn        // Double move active: this IS the bonus move, stay
        : extraMove
          ? state.currentTurn      // Berserk: stay on same side
          : oppositeSide(state.currentTurn); // Normal turn switch

      // Process turn start for next side (frozen timers, mine timers)
      if (nextSide !== state.currentTurn) {
        currentBoard = processTurnStart(currentBoard, nextSide);
      }

      // --- Step 10: Check / Checkmate / General captured ---
      const checkState = isInCheck(currentBoard, nextSide);
      let winner: Side | null = null;
      let isGeneralCapture = false;
      // Instant win if General was captured
      if (capturedPiece && capturedPiece.type === PieceType.General) {
        winner = state.currentTurn;
        isGeneralCapture = true;
      } else if (isCheckmate(currentBoard, nextSide)) {
        winner = state.currentTurn;
      } else if (isStalemate(currentBoard, nextSide)) {
        winner = state.currentTurn;
      }

      const moveRecord: MoveRecord = {
        turnNumber: state.turnNumber,
        side: piece.side,
        pieceId: piece.id,
        pieceType: piece.type,
        from: fromPos,
        to: action.to,
        captured: capturedPiece,
        abilitiesTriggered,
      };

      return {
        ...state,
        phase: winner && !isGeneralCapture ? GamePhase.End : GamePhase.Play,
        board: currentBoard,
        currentTurn: nextSide,
        turnNumber: nextSide !== state.currentTurn && state.currentTurn === Side.Black
          ? state.turnNumber + 1 : state.turnNumber,
        moveHistory: [...state.moveHistory, moveRecord],
        capturedPieces: newCapturedPieces,
        checkState,
        winner,
        selectedPieceId: null,
        legalMoves: [],
        pendingAbility: null,
        isDoubleMoveActive: extraMove && !state.isDoubleMoveActive,
        abilityLog: [...state.abilityLog, ...newAbilityLogs],
        animations: capturedPiece
          ? [{ type: 'capture', data: { position: action.to, capturedPiece }, startTime: Date.now() }]
          : [{ type: 'move', data: { from: fromPos, to: action.to }, startTime: Date.now() }],
        winAnimation: isGeneralCapture
          ? { winner: state.currentTurn, capturePosition: action.to, startTime: Date.now() }
          : state.winAnimation,
      };
    }

    case 'RESET_GAME': {
      return {
        ...state,
        phase: GamePhase.Setup,
        board: createInitialBoard(),
        currentTurn: Side.Red,
        turnNumber: 1,
        capturedPieces: [],
        moveHistory: [],
        banPhase: null,
        pickPhase: null,
        checkState: null,
        winner: null,
        selectedPieceId: null,
        legalMoves: [],
        pendingAbility: null,
        isDoubleMoveActive: false,
        abilityLog: [],
        animations: [],
        winAnimation: null,
        boardTheme: state.boardTheme,
        drawProposal: null,
        isDraw: false,
      };
    }

    case 'SURRENDER': {
      if (state.phase !== GamePhase.Play) return state;
      return {
        ...state,
        phase: GamePhase.End,
        winner: oppositeSide(state.currentTurn),
        winAnimation: null,
        isDraw: false,
      };
    }

    case 'END_WIN_ANIMATION': {
      if (!state.winAnimation) return state;
      return {
        ...state,
        phase: GamePhase.End,
        winAnimation: null,
      };
    }

    case 'SET_BOARD_THEME': {
      return { ...state, boardTheme: action.theme };
    }

    case 'PROPOSE_DRAW': {
      if (state.phase !== GamePhase.Play) return state;
      if (state.drawProposal) return state; // Already proposed
      return {
        ...state,
        drawProposal: { proposedBy: state.currentTurn, turnNumber: state.turnNumber },
      };
    }

    case 'RESPOND_DRAW': {
      if (!state.drawProposal) return state;
      if (action.accept) {
        return {
          ...state,
          phase: GamePhase.End,
          isDraw: true,
          winner: null,
          drawProposal: null,
          winAnimation: null,
        };
      }
      return { ...state, drawProposal: null };
    }

    default:
      return state;
  }
}
