// ============================================
// All type definitions in one file to avoid
// circular dependency issues with Vite HMR
// ============================================

// --- Position ---
export interface Position {
  readonly col: number; // 0-8
  readonly row: number; // 0-9
}

export function posEqual(a: Position, b: Position): boolean {
  return a.col === b.col && a.row === b.row;
}

export function posToKey(p: Position): string {
  return `${p.col},${p.row}`;
}

// --- Side & Piece ---
export enum Side {
  Red = 'red',
  Black = 'black',
}

export enum PieceType {
  General = 'general',
  Advisor = 'advisor',
  Elephant = 'elephant',
  Horse = 'horse',
  Chariot = 'chariot',
  Cannon = 'cannon',
  Soldier = 'soldier',
}

export function oppositeSide(side: Side): Side {
  return side === Side.Red ? Side.Black : Side.Red;
}

// --- Ability ---
export type AbilityId = string;

export enum AbilityTrigger {
  Active = 'active',
  Passive = 'passive',
  OnCapture = 'on-capture',
  OnBeingCaptured = 'on-being-captured',
  OnMove = 'on-move',
  OnTurnStart = 'on-turn-start',
}

export enum TargetingRule {
  None = 'none',
  Self = 'self',
  AnyEmptySquare = 'any-empty-square',
  AdjacentEnemy = 'adjacent-enemy',
  FriendlyPiece = 'friendly-piece',
  CapturedFriendly = 'captured-friendly',
  SquareInRange = 'square-in-range',
}

export interface AbilityInstance {
  readonly abilityId: AbilityId;
  chargesRemaining: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface AbilityDef {
  readonly id: AbilityId;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly cost: number;
  readonly maxCharges: number;
  readonly triggerType: AbilityTrigger;
  readonly targetingRule: TargetingRule;
  readonly icon: string;
}

export interface AbilityLogEntry {
  readonly turnNumber: number;
  readonly pieceId: string;
  readonly abilityId: AbilityId;
  readonly messageKey: string;
}

export function createAbilityInstance(def: AbilityDef): AbilityInstance {
  return {
    abilityId: def.id,
    chargesRemaining: def.maxCharges,
    isActive: false,
    metadata: {},
  };
}

// --- Piece Instance ---
export interface PieceInstance {
  readonly id: string;
  readonly type: PieceType;
  readonly side: Side;
  readonly position: Position;
  readonly abilities: AbilityInstance[];
  readonly isFrozen: boolean;
  readonly frozenTurnsRemaining: number;
  readonly fortifyTurnsStationary: number;
  readonly isRevealed: boolean;
}

// --- Board ---
export type BoardGrid = (PieceInstance | null)[][];

export interface MineInfo {
  readonly position: Position;
  readonly placedBy: Side;
  readonly turnsRemaining: number;
}

export interface TreasurePoint {
  readonly position: Position;
  readonly collected: boolean;
}

export interface Board {
  readonly grid: BoardGrid;
  readonly treasurePoints: TreasurePoint[];
  readonly mines: MineInfo[];
}

// --- Player ---
export enum PlayerType {
  Human = 'human',
  AI = 'ai',
}

export interface Player {
  readonly side: Side;
  readonly type: PlayerType;
  readonly name: string;
}

// --- Game State ---
export enum GamePhase {
  Setup = 'setup',
  Ban = 'ban',
  Pick = 'pick',
  Play = 'play',
  End = 'end',
}

export interface BanPhaseState {
  readonly bannedAbilities: { [Side.Red]: AbilityId[]; [Side.Black]: AbilityId[] };
  readonly currentBanner: Side;
  readonly bansRemaining: { [Side.Red]: number; [Side.Black]: number };
}

export interface PieceAbilityAssignment {
  readonly pieceId: string;
  readonly abilityId: AbilityId;
}

export interface PickPhaseState {
  readonly currentPicker: Side;
  readonly budgetRemaining: { [Side.Red]: number; [Side.Black]: number };
  readonly assignments: { [Side.Red]: PieceAbilityAssignment[]; [Side.Black]: PieceAbilityAssignment[] };
  readonly availableAbilities: AbilityId[];
}

export interface MoveRecord {
  readonly turnNumber: number;
  readonly side: Side;
  readonly pieceId: string;
  readonly pieceType: string;
  readonly from: Position;
  readonly to: Position;
  readonly captured: PieceInstance | null;
  readonly abilitiesTriggered: AbilityId[];
}

export interface CheckInfo {
  readonly side: Side;
  readonly checkedBy: string[];
}

export interface PendingAbility {
  readonly pieceId: string;
  readonly abilityId: AbilityId;
  readonly validTargets: Position[];
}

export interface AnimationState {
  readonly type: string;
  readonly data: Record<string, unknown>;
  readonly startTime: number;
}

export interface WinAnimationState {
  readonly winner: Side;
  readonly capturePosition: Position;
  readonly startTime: number;
}

// --- Board Theme ---
export type BoardTheme = 'classic' | 'desert' | 'grassland' | 'night';

// --- Draw Proposal ---
export interface DrawProposal {
  readonly proposedBy: Side;
  readonly turnNumber: number;
}

export interface GameState {
  readonly phase: GamePhase;
  readonly board: Board;
  readonly currentTurn: Side;
  readonly turnNumber: number;
  readonly players: { [Side.Red]: Player; [Side.Black]: Player };
  readonly capturedPieces: PieceInstance[];
  readonly moveHistory: MoveRecord[];
  readonly banPhase: BanPhaseState | null;
  readonly pickPhase: PickPhaseState | null;
  readonly checkState: CheckInfo | null;
  readonly winner: Side | null;
  readonly selectedPieceId: string | null;
  readonly legalMoves: Position[];
  readonly pendingAbility: PendingAbility | null;
  readonly isDoubleMoveActive: boolean;
  readonly abilityLog: AbilityLogEntry[];
  readonly animations: AnimationState[];
  readonly winAnimation: WinAnimationState | null;
  readonly boardTheme: BoardTheme;
  readonly drawProposal: DrawProposal | null;
  readonly isDraw: boolean;
}
