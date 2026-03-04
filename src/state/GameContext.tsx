import React, { createContext, useContext, useReducer, useMemo, useEffect, useRef } from 'react';
import { GameState, GamePhase, Side, PlayerType } from '../types';
import { createInitialBoard } from '../core/board';
import { gameReducer, GameAction } from './gameReducer';
import { Locale } from '../i18n/i18n';
import { getAIBanAction, getAIPickActions, getAITurnActions } from '../ai/aiPlayer';
import { evaluateBoard } from '../ai/evaluate';
import { useSettings } from './SettingsContext';

function createInitialGameState(): GameState {
  return {
    phase: GamePhase.Setup,
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
    checkState: null,
    winner: null,
    selectedPieceId: null,
    legalMoves: [],
    pendingAbility: null,
    isDoubleMoveActive: false,
    abilityLog: [],
    animations: [],
    winAnimation: null,
    boardTheme: 'classic' as const,
    drawProposal: null,
    isDraw: false,
  };
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  t: (key: string, params?: Record<string, string>) => string;
  locale: Locale;
  toggleLocale: () => void;
}

const GameContext = createContext<GameContextType>(null!);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const { locale, t, toggleLocale } = useSettings();
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI auto-play
  useEffect(() => {
    const isAI = state.players[Side.Black].type === PlayerType.AI;
    if (!isAI) return;

    // Cleanup any pending timer
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }

    // Ban phase: AI bans
    if (state.phase === GamePhase.Ban && state.banPhase?.currentBanner === Side.Black) {
      aiTimerRef.current = setTimeout(() => {
        const action = getAIBanAction(state);
        if (action) dispatch(action);
      }, 500);
      return;
    }

    // Pick phase: AI picks
    if (state.phase === GamePhase.Pick && state.pickPhase?.currentPicker === Side.Black) {
      aiTimerRef.current = setTimeout(() => {
        const actions = getAIPickActions(state);
        // Dispatch actions sequentially with small delays
        let delay = 0;
        for (const action of actions) {
          setTimeout(() => dispatch(action), delay);
          delay += 200;
        }
      }, 500);
      return;
    }

    // Play phase: AI moves (skip during win animation)
    if (state.phase === GamePhase.Play && state.currentTurn === Side.Black && !state.winAnimation) {
      aiTimerRef.current = setTimeout(() => {
        const actions = getAITurnActions(state);
        let delay = 0;
        for (const action of actions) {
          setTimeout(() => dispatch(action), delay);
          delay += 1200;
        }
      }, 1200);
      return;
    }

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [state.phase, state.currentTurn, state.banPhase?.currentBanner, state.pickPhase?.currentPicker, state.isDoubleMoveActive, state.selectedPieceId, state.winAnimation]);

  // AI responds to draw proposals
  useEffect(() => {
    if (!state.drawProposal) return;
    if (state.drawProposal.proposedBy !== Side.Red) return;
    if (state.players[Side.Black].type !== PlayerType.AI) return;

    const timer = setTimeout(() => {
      // AI accepts draw if evaluation is close to 0 (within ±200)
      const score = evaluateBoard(state.board, state.currentTurn);
      const accept = Math.abs(score) < 200;
      dispatch({ type: 'RESPOND_DRAW', accept });
    }, 1000);
    return () => clearTimeout(timer);
  }, [state.drawProposal]);

  // Win animation: delayed transition to End phase after 3 seconds
  useEffect(() => {
    if (!state.winAnimation) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'END_WIN_ANIMATION' });
    }, 3000);
    return () => clearTimeout(timer);
  }, [state.winAnimation]);

  const value = useMemo(() => ({ state, dispatch, t, locale, toggleLocale }), [state, dispatch, t, locale, toggleLocale]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
