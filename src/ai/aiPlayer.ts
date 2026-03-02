/**
 * AI Player - interfaces with the game state to make decisions.
 * Handles ban phase, pick phase, and play phase decisions.
 */
import { GameState, Side, AbilityId, PieceType } from '../types';
import { ALL_ABILITIES, getAbilityById } from '../core/abilityDefs';
import { getPiecesForSide } from '../core/board';
import { findBestMove } from './minimax';
import { AIMove } from './moveGeneration';
import { GameAction } from '../state/gameReducer';

// --- Ban Phase AI ---

// Rank abilities by how dangerous they are (higher = ban first)
const ABILITY_BAN_PRIORITY: Record<string, number> = {
  'shield': 8,
  'teleport': 7,
  'double-move': 9,
  'freeze': 6,
  'resurrect': 10,
  'berserk': 8,
  'range-attack': 5,
  'swap': 3,
  'mine': 4,
  'scout': 2,
  'fortify': 5,
  'poison': 7,
  'shadow-step': 4,
  'iron-will': 1,
};

export function getAIBanAction(state: GameState): GameAction | null {
  if (!state.banPhase) return null;
  const allBanned = [
    ...state.banPhase.bannedAbilities[Side.Red],
    ...state.banPhase.bannedAbilities[Side.Black],
  ];

  // Find highest-priority unbanned ability
  const available = ALL_ABILITIES
    .filter(a => !allBanned.includes(a.id))
    .sort((a, b) => (ABILITY_BAN_PRIORITY[b.id] || 0) - (ABILITY_BAN_PRIORITY[a.id] || 0));

  if (available.length === 0) return null;
  return { type: 'BAN_ABILITY', abilityId: available[0].id };
}

// --- Pick Phase AI ---

// Piece importance for ability assignment
const PIECE_ABILITY_SYNERGY: Record<string, PieceType[]> = {
  'shield': [PieceType.General, PieceType.Chariot],
  'teleport': [PieceType.Chariot, PieceType.Cannon],
  'double-move': [PieceType.Chariot, PieceType.Horse],
  'freeze': [PieceType.Horse, PieceType.Chariot],
  'resurrect': [PieceType.General, PieceType.Advisor],
  'range-attack': [PieceType.Cannon, PieceType.Chariot],
  'swap': [PieceType.General, PieceType.Advisor],
  'mine': [PieceType.Soldier, PieceType.Horse],
  'scout': [PieceType.Horse, PieceType.Soldier],
  'berserk': [PieceType.Chariot, PieceType.Horse],
  'fortify': [PieceType.General, PieceType.Advisor],
  'poison': [PieceType.Soldier, PieceType.Advisor],
  'shadow-step': [PieceType.Horse, PieceType.Chariot],
  'iron-will': [PieceType.Chariot, PieceType.General],
};

const ABILITY_VALUE: Record<string, number> = {
  'shield': 9,
  'teleport': 8,
  'double-move': 9,
  'freeze': 7,
  'resurrect': 10,
  'berserk': 9,
  'range-attack': 7,
  'swap': 5,
  'mine': 5,
  'scout': 3,
  'fortify': 6,
  'poison': 7,
  'shadow-step': 6,
  'iron-will': 3,
};

export function getAIPickActions(state: GameState): GameAction[] {
  if (!state.pickPhase) return [];
  const side = state.pickPhase.currentPicker;
  if (side !== Side.Black) return []; // Only AI picks for Black

  const budget = state.pickPhase.budgetRemaining[side];
  const available = state.pickPhase.availableAbilities;
  const pieces = getPiecesForSide(state.board, side);
  const assigned = new Set(state.pickPhase.assignments[side].map(a => a.pieceId));

  // Greedy knapsack: pick best value/cost ability for best synergy piece
  const actions: GameAction[] = [];
  let remainingBudget = budget;

  // Sort abilities by value/cost ratio
  const sortedAbilities = available
    .map(id => ({ id, def: getAbilityById(id)! }))
    .filter(a => a.def && a.def.cost <= remainingBudget)
    .sort((a, b) => {
      const valA = (ABILITY_VALUE[a.id] || 5) / a.def.cost;
      const valB = (ABILITY_VALUE[b.id] || 5) / b.def.cost;
      return valB - valA;
    });

  const usedAbilities = new Set<string>();

  for (const ability of sortedAbilities) {
    if (remainingBudget < ability.def.cost) continue;
    if (usedAbilities.has(ability.id)) continue;

    // Find best unassigned piece for this ability
    const synergy = PIECE_ABILITY_SYNERGY[ability.id] || [];
    const candidates = pieces
      .filter(p => !assigned.has(p.id))
      .sort((a, b) => {
        const aIdx = synergy.indexOf(a.type);
        const bIdx = synergy.indexOf(b.type);
        const aPri = aIdx === -1 ? 99 : aIdx;
        const bPri = bIdx === -1 ? 99 : bIdx;
        return aPri - bPri;
      });

    if (candidates.length === 0) break;

    const targetPiece = candidates[0];
    actions.push({
      type: 'PICK_ABILITY',
      abilityId: ability.id,
      pieceId: targetPiece.id,
    });
    assigned.add(targetPiece.id);
    usedAbilities.add(ability.id);
    remainingBudget -= ability.def.cost;
  }

  actions.push({ type: 'CONFIRM_PICKS' });
  return actions;
}

// --- Play Phase AI ---

export function getAIPlayAction(state: GameState): GameAction | null {
  const move = findBestMove(state.board, Side.Black, state.capturedPieces, 3);
  if (!move) return null;

  if (move.type === 'ability' && move.abilityId) {
    // For self-targeting abilities (double-move only)
    if (move.abilityId === 'double-move') {
      return {
        type: 'ACTIVATE_ABILITY',
        pieceId: move.pieceId,
        abilityId: move.abilityId,
      };
    }

    // Two-step: first activate, which sets pendingAbility
    // The caller will need to dispatch ACTIVATE_ABILITY then EXECUTE_PENDING_ABILITY
    return {
      type: 'ACTIVATE_ABILITY',
      pieceId: move.pieceId,
      abilityId: move.abilityId,
    };
  }

  // Regular move: need to SELECT_PIECE then MOVE_PIECE
  return {
    type: 'SELECT_PIECE',
    pieceId: move.pieceId,
  };
}

/**
 * Get the complete sequence of actions for AI's turn.
 * Returns an array of actions to dispatch sequentially.
 */
export function getAITurnActions(state: GameState): GameAction[] {
  const move = findBestMove(state.board, Side.Black, state.capturedPieces, 3);
  if (!move) return [];

  if (move.type === 'ability' && move.abilityId) {
    if (move.abilityId === 'double-move') {
      return [{ type: 'ACTIVATE_ABILITY', pieceId: move.pieceId, abilityId: move.abilityId }];
    }
    return [
      { type: 'ACTIVATE_ABILITY', pieceId: move.pieceId, abilityId: move.abilityId },
      { type: 'EXECUTE_PENDING_ABILITY', target: move.to },
    ];
  }

  // Regular move
  return [
    { type: 'SELECT_PIECE', pieceId: move.pieceId },
    { type: 'MOVE_PIECE', to: move.to },
  ];
}
