import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useGame } from '../../state/GameContext';
import { Position, PieceType, Side, PlayerType } from '../../types';
import { BOARD_COLS, BOARD_ROWS } from '../../core/constants';
import { findPieceById } from '../../core/board';
import { getAbilityById } from '../../core/abilityDefs';
import { PieceBlob, PieceGradientDefs, PIECE_CHARS } from './pieceArt';
import './BoardCanvas.css';

// SVG dimensions
const CELL_SIZE = 60;
const PADDING = 40;
const BOARD_WIDTH = (BOARD_COLS - 1) * CELL_SIZE;
const BOARD_HEIGHT = (BOARD_ROWS - 1) * CELL_SIZE;
const SVG_WIDTH = BOARD_WIDTH + PADDING * 2;
const SVG_HEIGHT = BOARD_HEIGHT + PADDING * 2;

function posToPixel(pos: Position): { x: number; y: number } {
  return {
    x: PADDING + pos.col * CELL_SIZE,
    y: PADDING + (BOARD_ROWS - 1 - pos.row) * CELL_SIZE,
  };
}

function pixelToPos(x: number, y: number): Position | null {
  const col = Math.round((x - PADDING) / CELL_SIZE);
  const row = BOARD_ROWS - 1 - Math.round((y - PADDING) / CELL_SIZE);
  if (col < 0 || col >= BOARD_COLS || row < 0 || row >= BOARD_ROWS) return null;
  return { col, row };
}

// Capture particle effect
interface CaptureParticle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  angle: number;
  speed: number;
  startTime: number;
}

let particleIdCounter = 0;

/** Decorative corner elements — theme-aware */
function BoardDecorations({ theme }: { theme: string }) {
  const frameX = PADDING - 15;
  const frameY = PADDING - 15;
  const frameW = BOARD_WIDTH + 30;
  const frameH = BOARD_HEIGHT + 30;
  const opacity = 0.45;

  switch (theme) {
    case 'desert':
      // Small cacti
      return (
        <g opacity={opacity}>
          <g transform={`translate(${frameX + 14}, ${frameY + 20})`}>
            <rect x={-2} y={-10} width={4} height={12} rx={2} fill="var(--color-decor)" />
            <circle cx={-5} cy={-6} r={3} fill="var(--color-decor)" />
            <circle cx={5} cy={-3} r={2.5} fill="var(--color-decor)" />
          </g>
          <g transform={`translate(${frameX + frameW - 14}, ${frameY + frameH - 18})`}>
            <rect x={-2} y={-10} width={4} height={12} rx={2} fill="var(--color-decor)" />
            <circle cx={-4} cy={-4} r={2.5} fill="var(--color-decor)" />
            <circle cx={5} cy={-7} r={3} fill="var(--color-decor)" />
          </g>
        </g>
      );
    case 'grassland':
      // Bushes + mushroom
      return (
        <g opacity={opacity}>
          <g transform={`translate(${frameX + 16}, ${frameY + 18})`}>
            <circle cx={-4} cy={0} r={5} fill="var(--color-decor)" />
            <circle cx={4} cy={-1} r={4.5} fill="var(--color-decor)" />
            <circle cx={0} cy={-4} r={4} fill="var(--color-decor)" />
          </g>
          <g transform={`translate(${frameX + frameW - 16}, ${frameY + frameH - 16})`}>
            <rect x={-1.5} y={-2} width={3} height={6} rx={1} fill="#C4A060" />
            <ellipse cx={0} cy={-3} rx={6} ry={4} fill="var(--color-decor)" />
            <circle cx={-2} cy={-4} r={1.2} fill="white" opacity={0.5} />
            <circle cx={2} cy={-2} r={1} fill="white" opacity={0.4} />
          </g>
        </g>
      );
    case 'night':
      // Star clusters
      return (
        <g opacity={opacity}>
          {[
            { tx: frameX + 14, ty: frameY + 16 },
            { tx: frameX + frameW - 14, ty: frameY + 16 },
            { tx: frameX + 14, ty: frameY + frameH - 14 },
            { tx: frameX + frameW - 14, ty: frameY + frameH - 14 },
          ].map((pos, i) => (
            <g key={`star-${i}`} transform={`translate(${pos.tx}, ${pos.ty})`}>
              <polygon points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5"
                fill="var(--color-decor)" />
              <circle cx={4} cy={-4} r={1} fill="var(--color-decor)" opacity={0.7} />
            </g>
          ))}
        </g>
      );
    default:
      // Classic: tiny flowers
      return (
        <g opacity={opacity}>
          <g transform={`translate(${frameX + 14}, ${frameY + 16})`}>
            <circle cx={-3} cy={0} r={2.5} fill="var(--color-decor)" />
            <circle cx={3} cy={0} r={2.5} fill="var(--color-decor)" />
            <circle cx={0} cy={-3} r={2.5} fill="var(--color-decor)" />
            <circle cx={0} cy={0} r={2} fill="#F59E0B" />
            <ellipse cx={4} cy={4} rx={3} ry={1.5} fill="#7EC8B8" transform="rotate(-30 4 4)" />
          </g>
          <g transform={`translate(${frameX + frameW - 14}, ${frameY + frameH - 14})`}>
            <circle cx={-3} cy={0} r={2.5} fill="var(--color-decor)" />
            <circle cx={3} cy={0} r={2.5} fill="var(--color-decor)" />
            <circle cx={0} cy={-3} r={2.5} fill="var(--color-decor)" />
            <circle cx={0} cy={0} r={2} fill="#F59E0B" />
            <ellipse cx={-4} cy={4} rx={3} ry={1.5} fill="#7EC8B8" transform="rotate(30 -4 4)" />
          </g>
        </g>
      );
  }
}

export function BoardCanvas() {
  const { state, dispatch } = useGame();
  const { board, selectedPieceId, legalMoves, currentTurn, checkState, moveHistory, pendingAbility, winAnimation } = state;
  const [captureParticles, setCaptureParticles] = useState<CaptureParticle[]>([]);
  const [shaking, setShaking] = useState(false);
  const [winShaking, setWinShaking] = useState(false);
  const [winFlash, setWinFlash] = useState(false);
  const prevMoveCountRef = useRef(moveHistory.length);
  const prevAbilityLogRef = useRef(state.abilityLog.length);

  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

  // Detect captures and spawn particles + shake
  useEffect(() => {
    if (moveHistory.length > prevMoveCountRef.current) {
      const latestMove = moveHistory[moveHistory.length - 1];
      if (latestMove.captured) {
        if (!winAnimation) {
          const { x, y } = posToPixel(latestMove.to);
          const emojis = ['✨', '💫', '⭐', '💥', '🌟'];
          const newParticles: CaptureParticle[] = [];
          for (let i = 0; i < 8; i++) {
            newParticles.push({
              id: ++particleIdCounter,
              x,
              y,
              emoji: emojis[Math.floor(Math.random() * emojis.length)],
              angle: (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5,
              speed: 30 + Math.random() * 40,
              startTime: Date.now(),
            });
          }
          setCaptureParticles(prev => [...prev, ...newParticles]);
          setShaking(true);
          setTimeout(() => setShaking(false), 300);
          setTimeout(() => {
            setCaptureParticles(prev => prev.filter(p => !newParticles.includes(p)));
          }, 800);
        }
      }
    }
    prevMoveCountRef.current = moveHistory.length;
  }, [moveHistory.length, winAnimation]);

  // Detect ability activations and spawn particles
  useEffect(() => {
    const { abilityLog } = state;
    if (abilityLog.length > prevAbilityLogRef.current) {
      const newEntries = abilityLog.slice(prevAbilityLogRef.current);
      for (const entry of newEntries) {
        const piece = findPieceById(board, entry.pieceId);
        if (!piece) continue;
        const { x, y } = posToPixel(piece.position);

        const ABILITY_EMOJIS: Record<string, string[]> = {
          'shield': ['🛡️', '✨', '💫'],
          'teleport': ['✨', '🌟', '💫'],
          'double-move': ['⚡', '💨', '⚡'],
          'freeze': ['❄️', '🧊', '❄️'],
          'resurrect': ['💫', '🌟', '✨'],
          'range-attack': ['🎯', '💥', '🔥'],
          'swap': ['🔄', '✨', '🔄'],
          'mine': ['💣', '⚠️', '💣'],
          'scout': ['🔍', '👁️', '🔍'],
          'berserk': ['🔥', '💢', '🔥'],
          'fortify': ['🏰', '🛡️', '🏰'],
          'poison': ['☠️', '💀', '☠️'],
          'shadow-step': ['👤', '💨', '👤'],
          'iron-will': ['🦾', '💪', '🦾'],
        };

        const emojis = ABILITY_EMOJIS[entry.abilityId] || ['✨', '💫', '⭐'];
        const newParticles: CaptureParticle[] = [];
        for (let i = 0; i < 6; i++) {
          newParticles.push({
            id: ++particleIdCounter,
            x,
            y,
            emoji: emojis[i % emojis.length],
            angle: (Math.PI * 2 * i) / 6 + (Math.random() - 0.5) * 0.3,
            speed: 25 + Math.random() * 30,
            startTime: Date.now(),
          });
        }
        setCaptureParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => {
          setCaptureParticles(prev => prev.filter(p => !newParticles.includes(p)));
        }, 800);
      }
    }
    prevAbilityLogRef.current = abilityLog.length;
  }, [state.abilityLog.length, board]);

  // Win animation: dramatic particles, extended shake, flash
  useEffect(() => {
    if (!winAnimation) return;
    const { capturePosition } = winAnimation;
    const { x, y } = posToPixel(capturePosition);

    const winEmojis = ['👑', '💥', '⚡', '🔥', '💫', '✨', '🌟', '🎆'];
    const wave1: CaptureParticle[] = [];
    for (let i = 0; i < 20; i++) {
      wave1.push({
        id: ++particleIdCounter,
        x,
        y,
        emoji: winEmojis[Math.floor(Math.random() * winEmojis.length)],
        angle: (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.4,
        speed: 50 + Math.random() * 60,
        startTime: Date.now(),
      });
    }
    setCaptureParticles(prev => [...prev, ...wave1]);

    setWinShaking(true);
    setTimeout(() => setWinShaking(false), 1500);

    setWinFlash(true);
    setTimeout(() => setWinFlash(false), 1200);

    setTimeout(() => {
      setCaptureParticles(prev => prev.filter(p => !wave1.includes(p)));
    }, 1500);

    const wave2Timer = setTimeout(() => {
      const wave2: CaptureParticle[] = [];
      for (let i = 0; i < 12; i++) {
        wave2.push({
          id: ++particleIdCounter,
          x,
          y,
          emoji: winEmojis[Math.floor(Math.random() * winEmojis.length)],
          angle: (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5,
          speed: 40 + Math.random() * 50,
          startTime: Date.now(),
        });
      }
      setCaptureParticles(prev => [...prev, ...wave2]);
      setTimeout(() => {
        setCaptureParticles(prev => prev.filter(p => !wave2.includes(p)));
      }, 1500);
    }, 1000);

    return () => clearTimeout(wave2Timer);
  }, [winAnimation]);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (state.players[currentTurn]?.type === PlayerType.AI) return;
      if (winAnimation) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_WIDTH / rect.width;
      const scaleY = SVG_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const pos = pixelToPos(x, y);
      if (!pos) {
        if (!pendingAbility) dispatch({ type: 'DESELECT_PIECE' });
        return;
      }

      if (pendingAbility) {
        const isValidTarget = pendingAbility.validTargets.some(
          t => t.col === pos.col && t.row === pos.row
        );
        if (isValidTarget) {
          dispatch({ type: 'EXECUTE_PENDING_ABILITY', target: pos });
        }
        return;
      }

      const piece = board.grid[pos.row][pos.col];

      if (selectedPieceId) {
        const isLegalTarget = legalMoves.some(m => m.col === pos.col && m.row === pos.row);
        if (isLegalTarget) {
          dispatch({ type: 'MOVE_PIECE', to: pos });
          return;
        }
      }

      if (piece && piece.side === currentTurn) {
        if (selectedPieceId === piece.id) {
          dispatch({ type: 'DESELECT_PIECE' });
        } else {
          dispatch({ type: 'SELECT_PIECE', pieceId: piece.id });
        }
        return;
      }

      dispatch({ type: 'DESELECT_PIECE' });
    },
    [board, selectedPieceId, legalMoves, currentTurn, pendingAbility, dispatch, state.players, winAnimation]
  );

  const abilityTargets = pendingAbility ? pendingAbility.validTargets : [];

  // Frame dimensions for terrain
  const frameX = PADDING - 15;
  const frameY = PADDING - 15;
  const frameW = BOARD_WIDTH + 30;
  const frameH = BOARD_HEIGHT + 30;

  return (
    <div className={`board-container ${shaking ? 'board-shake' : ''} ${winShaking ? 'board-win-shake' : ''}`}>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="board-svg"
        onClick={handleClick}
      >
        <defs>
          {/* Board shadow */}
          <filter id="board-shadow" x="-5%" y="-5%" width="115%" height="115%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.15)" />
          </filter>
          {/* Glow filters */}
          <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#FFD166" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#B088F9" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#E8556D" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Terrain gradient */}
          <radialGradient id="terrain-grad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="var(--color-terrain-center)" />
            <stop offset="100%" stopColor="var(--color-terrain-edge)" />
          </radialGradient>

          {/* Dot texture pattern */}
          <pattern id="terrain-dots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="1" fill="var(--color-dot)" opacity="0.25" />
          </pattern>

          {/* Depth gradient (dark top → transparent bottom) */}
          <linearGradient id="ground-perspective" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>

          {/* River gradient */}
          <linearGradient id="river-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-river-light)" />
            <stop offset="50%" stopColor="var(--color-river-deep)" />
            <stop offset="100%" stopColor="var(--color-river-light)" />
          </linearGradient>

          {/* Palace glow gradients */}
          <radialGradient id="palace-glow-red" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="var(--color-palace-red-glow)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="palace-glow-black" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="var(--color-palace-black-glow)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Piece blob gradient defs */}
          <PieceGradientDefs />

          {/* Treasure chest gradients */}
          <radialGradient id="treasureGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="60%" stopColor="#FFA500" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF8C00" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="chestBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CD853F" />
            <stop offset="40%" stopColor="#8B5E3C" />
            <stop offset="100%" stopColor="#5C3A1E" />
          </linearGradient>
          <linearGradient id="chestBodyRoyal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5B3A8C" />
            <stop offset="50%" stopColor="#3D2066" />
            <stop offset="100%" stopColor="#2D1050" />
          </linearGradient>
          <radialGradient id="sapphireGem" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#6699FF" />
            <stop offset="50%" stopColor="#2244AA" />
            <stop offset="100%" stopColor="#111166" />
          </radialGradient>
          <linearGradient id="chestLid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#DAA520" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <linearGradient id="chestTrim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#DAA520" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#DAA520" />
          </linearGradient>
          <radialGradient id="rubyGem" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FF4444" />
            <stop offset="50%" stopColor="#CC0000" />
            <stop offset="100%" stopColor="#800000" />
          </radialGradient>
          <radialGradient id="emeraldGem" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#66FF66" />
            <stop offset="50%" stopColor="#2E8B57" />
            <stop offset="100%" stopColor="#1B5E20" />
          </radialGradient>
        </defs>

        {/* ===== BOARD TERRAIN ===== */}
        <g id="board-terrain">
          {/* Frame with shadow */}
          <rect
            x={frameX} y={frameY}
            width={frameW} height={frameH}
            rx={16} ry={16}
            fill="var(--color-board-frame)"
            filter="url(#board-shadow)"
          />
          {/* Terrain surface */}
          <rect
            x={frameX + 4} y={frameY + 4}
            width={frameW - 8} height={frameH - 8}
            rx={12} ry={12}
            fill="url(#terrain-grad)"
          />
          {/* Dot texture */}
          <rect
            x={frameX + 4} y={frameY + 4}
            width={frameW - 8} height={frameH - 8}
            rx={12} ry={12}
            fill="url(#terrain-dots)"
            opacity={0.15}
          />
          {/* Depth gradient */}
          <rect
            x={frameX + 4} y={frameY + 4}
            width={frameW - 8} height={frameH - 8}
            rx={12} ry={12}
            fill="url(#ground-perspective)"
            opacity={0.12}
          />
        </g>

        {/* ===== GRID LINES ===== */}
        {/* Horizontal lines — one for each row */}
        {Array.from({ length: BOARD_ROWS }, (_, svgRow) => {
          const y = PADDING + svgRow * CELL_SIZE;
          return (
            <line key={`hline-${svgRow}`}
              x1={PADDING} y1={y} x2={PADDING + BOARD_WIDTH} y2={y}
              stroke="var(--color-dot)" strokeWidth={1.2} opacity={0.5}
            />
          );
        })}
        {/* Vertical lines — edge columns full length, inner columns split at river */}
        {Array.from({ length: BOARD_COLS }, (_, col) => {
          const x = PADDING + col * CELL_SIZE;
          const isEdge = col === 0 || col === BOARD_COLS - 1;
          if (isEdge) {
            return (
              <line key={`vline-${col}`}
                x1={x} y1={PADDING} x2={x} y2={PADDING + BOARD_HEIGHT}
                stroke="var(--color-dot)" strokeWidth={1.2} opacity={0.5}
              />
            );
          }
          // Inner columns: gap at river (svgRow 4 to 5)
          return (
            <React.Fragment key={`vline-${col}`}>
              <line x1={x} y1={PADDING} x2={x} y2={PADDING + 4 * CELL_SIZE}
                stroke="var(--color-dot)" strokeWidth={1.2} opacity={0.5} />
              <line x1={x} y1={PADDING + 5 * CELL_SIZE} x2={x} y2={PADDING + BOARD_HEIGHT}
                stroke="var(--color-dot)" strokeWidth={1.2} opacity={0.5} />
            </React.Fragment>
          );
        })}

        {/* Board outer border — thicker for emphasis */}
        <rect
          x={PADDING} y={PADDING}
          width={BOARD_WIDTH} height={BOARD_HEIGHT}
          fill="none"
          stroke="var(--color-dot)"
          strokeWidth={2.5}
          opacity={0.65}
          rx={1}
        />

        {/* Palace diagonal lines */}
        {/* Black palace (top): columns 3-5, rows 0-2 in SVG */}
        <line x1={PADDING + 3 * CELL_SIZE} y1={PADDING} x2={PADDING + 5 * CELL_SIZE} y2={PADDING + 2 * CELL_SIZE}
          stroke="var(--color-dot)" strokeWidth={1} opacity={0.35} />
        <line x1={PADDING + 5 * CELL_SIZE} y1={PADDING} x2={PADDING + 3 * CELL_SIZE} y2={PADDING + 2 * CELL_SIZE}
          stroke="var(--color-dot)" strokeWidth={1} opacity={0.35} />
        {/* Red palace (bottom): columns 3-5, rows 7-9 in SVG */}
        <line x1={PADDING + 3 * CELL_SIZE} y1={PADDING + 7 * CELL_SIZE} x2={PADDING + 5 * CELL_SIZE} y2={PADDING + 9 * CELL_SIZE}
          stroke="var(--color-dot)" strokeWidth={1} opacity={0.35} />
        <line x1={PADDING + 5 * CELL_SIZE} y1={PADDING + 7 * CELL_SIZE} x2={PADDING + 3 * CELL_SIZE} y2={PADDING + 9 * CELL_SIZE}
          stroke="var(--color-dot)" strokeWidth={1} opacity={0.35} />

        {/* Intersection dots — accented on key positions */}
        {Array.from({ length: BOARD_ROWS }, (_, svgRow) =>
          Array.from({ length: BOARD_COLS }, (_, col) => {
            const x = PADDING + col * CELL_SIZE;
            const y = PADDING + svgRow * CELL_SIZE;
            const isEdge = col === 0 || col === BOARD_COLS - 1 || svgRow === 0 || svgRow === BOARD_ROWS - 1;
            const isCorner = (col === 0 || col === BOARD_COLS - 1) && (svgRow === 0 || svgRow === BOARD_ROWS - 1);
            return (
              <circle
                key={`dot-${svgRow}-${col}`}
                cx={x} cy={y} r={isCorner ? 3.5 : isEdge ? 3 : 2}
                fill="var(--color-dot)"
                opacity={isCorner ? 0.7 : isEdge ? 0.55 : 0.35}
              />
            );
          })
        )}

        {/* ===== PALACE GLOW ZONES ===== */}
        {/* Black palace (top) */}
        <rect
          x={PADDING + 3 * CELL_SIZE - CELL_SIZE * 0.3}
          y={PADDING - CELL_SIZE * 0.3}
          width={2 * CELL_SIZE + CELL_SIZE * 0.6}
          height={2 * CELL_SIZE + CELL_SIZE * 0.6}
          rx={8} ry={8}
          fill="url(#palace-glow-black)"
        />
        {/* Red palace (bottom) */}
        <rect
          x={PADDING + 3 * CELL_SIZE - CELL_SIZE * 0.3}
          y={PADDING + 7 * CELL_SIZE - CELL_SIZE * 0.3}
          width={2 * CELL_SIZE + CELL_SIZE * 0.6}
          height={2 * CELL_SIZE + CELL_SIZE * 0.6}
          rx={8} ry={8}
          fill="url(#palace-glow-red)"
        />

        {/* ===== ENHANCED RIVER ===== */}
        <rect
          x={PADDING - 8}
          y={PADDING + 4 * CELL_SIZE - 8}
          width={BOARD_WIDTH + 16}
          height={CELL_SIZE + 16}
          rx={8} ry={8}
          fill="url(#river-grad)"
          opacity={0.7}
        />
        {/* Animated wave paths */}
        {[0, 1, 2].map(i => {
          const cy = PADDING + 4 * CELL_SIZE + CELL_SIZE * (0.25 + i * 0.25);
          const amp = 6 - i;
          const d = `M ${PADDING - 8} ${cy} ` +
            Array.from({ length: 17 }, (_, j) => {
              const px = PADDING - 8 + (BOARD_WIDTH + 16) * (j / 16);
              const py = cy + Math.sin(j * 0.8) * amp;
              return `L ${px.toFixed(1)} ${py.toFixed(1)}`;
            }).join(' ');
          return (
            <path
              key={`wave-${i}`}
              d={d}
              fill="none"
              stroke="var(--color-river-wave)"
              strokeWidth={1.5 - i * 0.3}
              strokeLinecap="round"
              opacity={0.35 - i * 0.08}
              strokeDasharray="8 6"
              className="river-wave"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          );
        })}
        {/* Bubble circles */}
        {[
          { cx: PADDING + BOARD_WIDTH * 0.15, delay: 0 },
          { cx: PADDING + BOARD_WIDTH * 0.35, delay: 1.2 },
          { cx: PADDING + BOARD_WIDTH * 0.55, delay: 0.6 },
          { cx: PADDING + BOARD_WIDTH * 0.75, delay: 1.8 },
          { cx: PADDING + BOARD_WIDTH * 0.9, delay: 0.3 },
        ].map((b, i) => (
          <circle
            key={`bubble-${i}`}
            cx={b.cx}
            cy={PADDING + 4.6 * CELL_SIZE}
            r={2}
            fill="white"
            opacity={0}
            className="river-bubble"
            style={{ animationDelay: `${b.delay}s` }}
          />
        ))}
        {/* 楚河/汉界 text */}
        <text x={PADDING + BOARD_WIDTH / 2 - 80} y={PADDING + 4.55 * CELL_SIZE}
          fill="var(--color-board-line)" fontSize={18} fontFamily="var(--font-chinese)"
          fontWeight={600} textAnchor="middle" dominantBaseline="middle" opacity={0.35}>楚河</text>
        <text x={PADDING + BOARD_WIDTH / 2 + 80} y={PADDING + 4.55 * CELL_SIZE}
          fill="var(--color-board-line)" fontSize={18} fontFamily="var(--font-chinese)"
          fontWeight={600} textAnchor="middle" dominantBaseline="middle" opacity={0.35}>汉界</text>

        {/* ===== DECORATIVE CORNERS ===== */}
        <BoardDecorations theme={state.boardTheme} />

        {/* Mines are invisible */}

        {/* Treasure markers */}
        {board.treasurePoints.map((tp, i) => {
          if (tp.collected) return null;
          const { x, y } = posToPixel(tp.position);
          return (
            <g key={`treasure-${i}`} className="treasure-marker">
              {/* Outer glow pulse */}
              <circle cx={x} cy={y} r={16} fill="none" stroke="#FFD700" strokeWidth={1.2} opacity={0.25}>
                <animate attributeName="r" values="14;20;14" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.1;0.35;0.1" dur="2.5s" repeatCount="indefinite" />
              </circle>
              {/* Inner warm glow */}
              <circle cx={x} cy={y} r={13} fill="url(#treasureGlow)" opacity={0.3}>
                <animate attributeName="opacity" values="0.15;0.4;0.15" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Royal treasure chest — open, with coins spilling out */}
              <g transform={`translate(${x - 12}, ${y - 12})`}>
                {/* === Open lid tilted back === */}
                <rect x={2} y={0} width={20} height={7} rx={1.5} fill="url(#chestLid)" stroke="#8B6914" strokeWidth={0.7} transform="rotate(-8, 12, 7)" />
                {/* Lid gold trim */}
                <rect x={2} y={0} width={20} height={1.5} rx={1} fill="#FFE87C" stroke="#DAA520" strokeWidth={0.3} transform="rotate(-8, 12, 7)" />
                {/* Lid inner decorative line */}
                <line x1={4} y1={4} x2={20} y2={3} stroke="#B8860B" strokeWidth={0.4} opacity={0.5} />

                {/* === Chest body (royal purple) === */}
                <rect x={1} y={9} width={22} height={14} rx={1.5} fill="url(#chestBodyRoyal)" stroke="#2D1B69" strokeWidth={0.8} />
                {/* Gold rim at top opening */}
                <rect x={0.5} y={8} width={23} height={2.5} rx={1} fill="url(#chestTrim)" stroke="#8B6914" strokeWidth={0.6} />
                {/* Gold horizontal band */}
                <rect x={1} y={16} width={22} height={1.5} fill="url(#chestTrim)" stroke="#8B6914" strokeWidth={0.3} />
                {/* Gold bottom edge */}
                <rect x={1} y={21} width={22} height={1.5} rx={0.8} fill="url(#chestTrim)" stroke="#8B6914" strokeWidth={0.3} />
                {/* Vertical gold straps */}
                <rect x={6} y={9} width={1} height={14} fill="#DAA520" opacity={0.5} />
                <rect x={17} y={9} width={1} height={14} fill="#DAA520" opacity={0.5} />

                {/* Gold coins spilling from open top */}
                <circle cx={7} cy={8.5} r={2.3} fill="#FFD700" stroke="#B8860B" strokeWidth={0.5} />
                <circle cx={12} cy={7.5} r={2.5} fill="#FFE44D" stroke="#B8860B" strokeWidth={0.5} />
                <circle cx={17} cy={8.5} r={2.3} fill="#FFD700" stroke="#B8860B" strokeWidth={0.5} />
                {/* Coin $ marks */}
                <text x={7} y={9.5} fontSize={2.5} fill="#B8860B" textAnchor="middle" fontWeight="bold">$</text>
                <text x={12} y={8.5} fontSize={2.5} fill="#B8860B" textAnchor="middle" fontWeight="bold">$</text>
                <text x={17} y={9.5} fontSize={2.5} fill="#B8860B" textAnchor="middle" fontWeight="bold">$</text>
                {/* Coin shine highlights */}
                <circle cx={6} cy={7.5} r={0.6} fill="#FFFDE0" opacity={0.9} />
                <circle cx={11} cy={6.5} r={0.7} fill="#FFFDE0" opacity={0.9} />
                <circle cx={16} cy={7.5} r={0.6} fill="#FFFDE0" opacity={0.9} />

                {/* Center ruby gem with gold setting */}
                <circle cx={12} cy={14} r={2.5} fill="#FFD700" stroke="#8B6914" strokeWidth={0.5} />
                <circle cx={12} cy={14} r={1.7} fill="url(#rubyGem)" />
                <circle cx={11.3} cy={13.3} r={0.5} fill="#FF9999" opacity={0.8} />
                {/* Side sapphire gems */}
                <ellipse cx={6} cy={19} rx={1.3} ry={1.1} fill="url(#sapphireGem)" stroke="#1A237E" strokeWidth={0.3} />
                <ellipse cx={18} cy={19} rx={1.3} ry={1.1} fill="url(#sapphireGem)" stroke="#1A237E" strokeWidth={0.3} />
                {/* Corner rivets */}
                <circle cx={3} cy={10.5} r={0.8} fill="#FFE87C" stroke="#B8860B" strokeWidth={0.3} />
                <circle cx={21} cy={10.5} r={0.8} fill="#FFE87C" stroke="#B8860B" strokeWidth={0.3} />
                <circle cx={3} cy={21} r={0.8} fill="#FFE87C" stroke="#B8860B" strokeWidth={0.3} />
                <circle cx={21} cy={21} r={0.8} fill="#FFE87C" stroke="#B8860B" strokeWidth={0.3} />

                {/* Sparkles */}
                <path d="M21,2 L21.6,0 L22.2,2 L24,2.6 L22.2,3.2 L21.6,5.2 L21,3.2 L19,2.6Z" fill="#FFF8DC" opacity={0.9}>
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
                </path>
                <path d="M-1,5 L-0.6,3.8 L-0.2,5 L1,5.3 L-0.2,5.7 L-0.6,6.8 L-1,5.7 L-2.2,5.3Z" fill="#FFE4B5" opacity={0.7}>
                  <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2s" begin="0.5s" repeatCount="indefinite" />
                </path>
              </g>
            </g>
          );
        })}

        {/* Last move highlight */}
        {lastMove && (
          <>
            <circle cx={posToPixel(lastMove.from).x} cy={posToPixel(lastMove.from).y}
              r={CELL_SIZE * 0.38} fill="var(--color-last-move)"
              stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
            <circle cx={posToPixel(lastMove.to).x} cy={posToPixel(lastMove.to).y}
              r={CELL_SIZE * 0.38} fill="var(--color-last-move)"
              stroke="var(--color-primary)" strokeWidth={1.5} opacity={0.6} />
          </>
        )}

        {/* Legal move indicators */}
        {legalMoves.map(move => {
          const { x, y } = posToPixel(move);
          const isCapture = board.grid[move.row][move.col] !== null;
          return (
            <g key={`legal-${move.col}-${move.row}`} className="legal-move-indicator">
              {isCapture ? (
                <circle cx={x} cy={y} r={CELL_SIZE * 0.38}
                  fill="none" stroke="var(--color-danger)" strokeWidth={3} opacity={0.6}>
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
                </circle>
              ) : (
                <circle cx={x} cy={y} r={8} fill="var(--color-legal-move)">
                  <animate attributeName="r" values="6;9;6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Ability target indicators */}
        {abilityTargets.map(target => {
          const { x, y } = posToPixel(target);
          const hasPiece = board.grid[target.row][target.col] !== null;
          return (
            <g key={`abtarget-${target.col}-${target.row}`}>
              {hasPiece ? (
                <circle cx={x} cy={y} r={CELL_SIZE * 0.40}
                  fill="none" stroke="#B088F9" strokeWidth={3} opacity={0.7}
                  filter="url(#glow-purple)">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="1.2s" repeatCount="indefinite" />
                </circle>
              ) : (
                <circle cx={x} cy={y} r={10} fill="#B088F9" opacity={0.5}>
                  <animate attributeName="r" values="7;12;7" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* ===== PIECES — cute blob characters ===== */}
        {Array.from({ length: BOARD_ROWS }, (_, row) =>
          Array.from({ length: BOARD_COLS }, (_, col) => {
            const piece = board.grid[row][col];
            if (!piece) return null;

            const { x, y } = posToPixel(piece.position);
            const isSelected = piece.id === selectedPieceId;
            const isRed = piece.side === Side.Red;
            const char = PIECE_CHARS[piece.type][isRed ? 'red' : 'black'];
            const isInCheckPiece = checkState && piece.type === PieceType.General && piece.side === checkState.side;
            const pieceColor = isRed ? 'var(--color-red-piece)' : 'var(--color-black-piece)';

            const showRevealedAbility = piece.isRevealed && piece.side !== currentTurn && piece.abilities.length > 0;
            const revealedAbilityDef = showRevealedAbility ? getAbilityById(piece.abilities[0].abilityId) : null;

            const scale = isSelected ? 1.08 : 1;
            const liftY = isSelected ? -3 : 0;

            return (
              <g
                key={piece.id}
                transform={`translate(${x}, ${y + liftY}) scale(${scale})`}
                className={`piece-group ${isSelected ? 'piece-selected' : ''} ${isInCheckPiece ? 'piece-in-check' : ''}`}
                style={{
                  cursor: piece.side === currentTurn ? 'pointer' : 'default',
                }}
              >
                {/* Selection glow */}
                {isSelected && (
                  <circle cx={0} cy={0} r={CELL_SIZE * 0.44}
                    fill="none" stroke="var(--color-accent)" strokeWidth={3}
                    filter="url(#glow-gold)">
                    <animate attributeName="r" values={`${CELL_SIZE * 0.42};${CELL_SIZE * 0.47};${CELL_SIZE * 0.42}`} dur="1s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Check warning glow */}
                {isInCheckPiece && (
                  <circle cx={0} cy={0} r={CELL_SIZE * 0.44}
                    fill="var(--color-check)" stroke="var(--color-danger)" strokeWidth={2}
                    filter="url(#glow-red)">
                    <animate attributeName="opacity" values="0.3;0.7;0.3" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Cute blob piece */}
                <PieceBlob type={piece.type} side={piece.side} frozen={piece.isFrozen} />

                {/* Small Chinese char label below blob */}
                <text x={0} y={CELL_SIZE * 0.48}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={piece.isFrozen ? '#7BA3B8' : pieceColor}
                  fontSize={9} fontWeight={700} fontFamily="var(--font-chinese)"
                  opacity={0.5}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {char}
                </text>

                {/* Ability indicator dot */}
                {piece.abilities.length > 0 && !piece.isFrozen && (
                  <circle cx={CELL_SIZE * 0.28} cy={-CELL_SIZE * 0.28}
                    r={6} fill="var(--color-accent)" stroke="white" strokeWidth={1.5}>
                    <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Revealed enemy ability icon */}
                {revealedAbilityDef && (
                  <text x={CELL_SIZE * 0.28} y={-CELL_SIZE * 0.28}
                    textAnchor="middle" dominantBaseline="middle" fontSize={12}
                    style={{ pointerEvents: 'none' }}>
                    {revealedAbilityDef.icon}
                  </text>
                )}

                {/* Frozen indicator */}
                {piece.isFrozen && (
                  <text x={CELL_SIZE * 0.3} y={CELL_SIZE * 0.3}
                    textAnchor="middle" dominantBaseline="middle" fontSize={16}
                    style={{ pointerEvents: 'none' }}>❄️</text>
                )}

                {/* Fortify indicator */}
                {piece.abilities.some(a => a.abilityId === 'fortify' && (a.chargesRemaining > 0 || a.chargesRemaining === -1)) && piece.fortifyTurnsStationary >= 2 && (
                  <text x={-CELL_SIZE * 0.3} y={-CELL_SIZE * 0.3}
                    textAnchor="middle" dominantBaseline="middle" fontSize={12}
                    style={{ pointerEvents: 'none' }}>🏰</text>
                )}
              </g>
            );
          })
        )}

        {/* Win flash overlay */}
        {winFlash && (
          <rect
            x={0} y={0} width={SVG_WIDTH} height={SVG_HEIGHT}
            className="win-flash-overlay"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Win pulse ring */}
        {winAnimation && (() => {
          const { x, y } = posToPixel(winAnimation.capturePosition);
          const ringColor = winAnimation.winner === Side.Red ? '#E8556D' : '#4A5568';
          return (
            <circle
              cx={x} cy={y} r={15}
              fill="none" stroke={ringColor} strokeWidth={3} opacity={0.8}
              className="win-pulse-ring"
              style={{ pointerEvents: 'none' }}
            />
          );
        })()}

        {/* Capture particles */}
        {captureParticles.map(p => {
          const duration = winAnimation ? 1.2 : 0.7;
          const elapsed = (Date.now() - p.startTime) / 1000;
          const progress = Math.min(elapsed / duration, 1);
          const px = p.x + Math.cos(p.angle) * p.speed * progress;
          const py = p.y + Math.sin(p.angle) * p.speed * progress - 20 * progress;
          const opacity = 1 - progress;
          const scale = 0.5 + 0.5 * (1 - progress);
          return (
            <text
              key={p.id}
              x={px}
              y={py}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={winAnimation ? 20 : 16}
              opacity={opacity}
              transform={`scale(${scale})`}
              style={{ pointerEvents: 'none' }}
            >
              {p.emoji}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
