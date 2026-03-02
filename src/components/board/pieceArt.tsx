/**
 * Shared piece character art — detailed recognizable SVG characters.
 * Each piece type has a unique, clearly identifiable silhouette.
 * Used by BoardCanvas (SVG), PickPhase, and CapturedPieces.
 */
import React from 'react';
import { PieceType, Side } from '../../types';

// Consolidated Chinese character map
export const PIECE_CHARS: Record<PieceType, { red: string; black: string }> = {
  [PieceType.General]: { red: '帅', black: '将' },
  [PieceType.Advisor]: { red: '仕', black: '士' },
  [PieceType.Elephant]: { red: '相', black: '象' },
  [PieceType.Horse]: { red: '马', black: '馬' },
  [PieceType.Chariot]: { red: '车', black: '車' },
  [PieceType.Cannon]: { red: '炮', black: '砲' },
  [PieceType.Soldier]: { red: '兵', black: '卒' },
};

// Color palettes for each side
const COLORS = {
  [Side.Red]: {
    highlight: '#FFD0D8',
    base: '#E8556D',
    dark: '#C43E54',
    darker: '#A02E40',
    eye: '#8B2E3F',
    accent: '#F59E0B',
    accentDark: '#D97706',
    skin: '#FFE4CC',
    skinDark: '#F0C8A0',
  },
  [Side.Black]: {
    highlight: '#C8D5E8',
    base: '#5B6B8A',
    dark: '#3D4A63',
    darker: '#2A3345',
    eye: '#2A3345',
    accent: '#F59E0B',
    accentDark: '#D97706',
    skin: '#E8DDD0',
    skinDark: '#D0C0B0',
  },
};

type SideColors = (typeof COLORS)[Side.Red];

const FROZEN_COLORS: SideColors = {
  highlight: '#E8F4F8',
  base: '#D0E8F0',
  dark: '#7BA3B8',
  darker: '#5A8899',
  eye: '#5A8899',
  accent: '#8BB8CC',
  accentDark: '#6A9AAA',
  skin: '#E0F0F4',
  skinDark: '#B8D8E0',
};

// Animation class per piece type
const BLOB_ANIM: Record<PieceType, string> = {
  [PieceType.General]: 'blob-general',
  [PieceType.Advisor]: 'blob-advisor',
  [PieceType.Elephant]: 'blob-elephant',
  [PieceType.Horse]: 'blob-horse',
  [PieceType.Chariot]: 'blob-chariot',
  [PieceType.Cannon]: 'blob-cannon',
  [PieceType.Soldier]: 'blob-soldier',
};

/**
 * SVG gradient and filter definitions for piece rendering.
 * Place inside the board SVG's <defs>.
 */
export function PieceGradientDefs() {
  return (
    <>
      {/* Red side body gradient */}
      <radialGradient id="blob-grad-red" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor={COLORS[Side.Red].highlight} />
        <stop offset="50%" stopColor={COLORS[Side.Red].base} />
        <stop offset="100%" stopColor={COLORS[Side.Red].dark} />
      </radialGradient>
      {/* Black side body gradient */}
      <radialGradient id="blob-grad-black" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor={COLORS[Side.Black].highlight} />
        <stop offset="50%" stopColor={COLORS[Side.Black].base} />
        <stop offset="100%" stopColor={COLORS[Side.Black].dark} />
      </radialGradient>
      {/* Frozen body gradient */}
      <radialGradient id="blob-grad-frozen" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor={FROZEN_COLORS.highlight} />
        <stop offset="50%" stopColor={FROZEN_COLORS.base} />
        <stop offset="100%" stopColor={FROZEN_COLORS.dark} />
      </radialGradient>
      {/* 3D piece shadow filter */}
      <filter id="piece-3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx={0} dy={2} stdDeviation={3} floodOpacity={0.2} />
      </filter>
    </>
  );
}

interface PieceBlobProps {
  type: PieceType;
  side: Side;
  frozen?: boolean;
}

/**
 * Detailed SVG character for use inside board SVG.
 * Rendered at origin (0,0) — parent should translate.
 * Fits within ~46px diameter.
 */
export function PieceBlob({ type, side, frozen }: PieceBlobProps) {
  const c = frozen ? FROZEN_COLORS : COLORS[side];
  const gradId = frozen ? 'blob-grad-frozen' : `blob-grad-${side}`;

  return (
    <g className={BLOB_ANIM[type]} style={{ pointerEvents: 'none' }}>
      {renderPiece(type, c, gradId)}
    </g>
  );
}

/* ================================================================
   Individual piece renderers — each draws a complete character
   with unique, clearly recognizable silhouette
   ================================================================ */

function renderPiece(type: PieceType, c: SideColors, gradId: string) {
  switch (type) {
    case PieceType.General: return renderGeneral(c, gradId);
    case PieceType.Advisor: return renderAdvisor(c, gradId);
    case PieceType.Elephant: return renderElephant(c, gradId);
    case PieceType.Horse: return renderHorse(c, gradId);
    case PieceType.Chariot: return renderChariot(c, gradId);
    case PieceType.Cannon: return renderCannon(c, gradId);
    case PieceType.Soldier: return renderSoldier(c, gradId);
    default: return null;
  }
}

/** General — Royal figure with big crown, robes, scepter */
function renderGeneral(c: SideColors, gradId: string) {
  return (
    <g filter="url(#piece-3d-shadow)">
      {/* Ground shadow */}
      <ellipse cx={0} cy={17} rx={14} ry={4} fill="rgba(0,0,0,0.12)" />
      {/* Robe body — wide trapezoidal shape */}
      <path d="M -14 4 Q -16 16 -12 16 L 12 16 Q 16 16 14 4 L 10 -2 L -10 -2 Z"
        fill={`url(#${gradId})`} />
      {/* Belt/sash */}
      <rect x={-10} y={2} width={20} height={3} rx={1} fill={c.accent} />
      <circle cx={0} cy={3.5} r={2} fill={c.accentDark} />
      {/* Head */}
      <circle cx={0} cy={-10} r={9} fill={c.skin} />
      {/* Hair line */}
      <path d="M -7 -14 Q 0 -18 7 -14" fill={c.darker} />
      {/* Crown — prominent 3-peak golden crown */}
      <path d="M -10 -15 L -8 -26 L -4 -19 L 0 -28 L 4 -19 L 8 -26 L 10 -15 Z"
        fill={c.accent} stroke={c.accentDark} strokeWidth={0.8} />
      {/* Crown gems */}
      <circle cx={0} cy={-23} r={1.8} fill="#FF6B6B" />
      <circle cx={-6} cy={-21} r={1.2} fill="#4ECDC4" />
      <circle cx={6} cy={-21} r={1.2} fill="#4ECDC4" />
      {/* Face — eyes */}
      <circle cx={-3.5} cy={-10} r={1.8} fill={c.eye} />
      <circle cx={3.5} cy={-10} r={1.8} fill={c.eye} />
      <circle cx={-3} cy={-10.5} r={0.7} fill="white" opacity={0.9} />
      <circle cx={4} cy={-10.5} r={0.7} fill="white" opacity={0.9} />
      {/* Smile */}
      <path d="M -2 -7 Q 0 -5 2 -7" fill="none" stroke={c.eye} strokeWidth={0.8} strokeLinecap="round" />
      {/* Collar detail */}
      <path d="M -6 -2 L 0 2 L 6 -2" fill="none" stroke={c.accent} strokeWidth={1.2} />
      {/* Robe pattern lines */}
      <line x1={-6} y1={6} x2={-8} y2={14} stroke={c.dark} strokeWidth={0.5} opacity={0.3} />
      <line x1={6} y1={6} x2={8} y2={14} stroke={c.dark} strokeWidth={0.5} opacity={0.3} />
      {/* 3D highlight */}
      <path d="M -7 -7 Q -5 -14 1 -13" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.3} />
    </g>
  );
}

/** Advisor — Scholar with tall hat, holding scroll */
function renderAdvisor(c: SideColors, gradId: string) {
  return (
    <g filter="url(#piece-3d-shadow)">
      <ellipse cx={0} cy={17} rx={12} ry={3.5} fill="rgba(0,0,0,0.12)" />
      {/* Robe body — narrower than General */}
      <path d="M -11 2 Q -13 16 -10 16 L 10 16 Q 13 16 11 2 L 8 -2 L -8 -2 Z"
        fill={`url(#${gradId})`} />
      {/* Sash */}
      <rect x={-8} y={3} width={16} height={2.5} rx={1} fill={c.accent} opacity={0.7} />
      {/* Head */}
      <circle cx={0} cy={-10} r={8} fill={c.skin} />
      {/* Hair */}
      <path d="M -6 -14 Q 0 -17 6 -14" fill={c.darker} />
      {/* Tall scholar hat (乌纱帽 style) */}
      <path d="M -8 -14 L -7 -27 Q 0 -30 7 -27 L 8 -14 Z" fill="#6B4EAA" stroke="#5538A0" strokeWidth={0.6} />
      {/* Hat wings */}
      <ellipse cx={-12} cy={-18} rx={5} ry={2} fill="#6B4EAA" transform="rotate(-15 -12 -18)" />
      <ellipse cx={12} cy={-18} rx={5} ry={2} fill="#6B4EAA" transform="rotate(15 12 -18)" />
      {/* Hat jewel */}
      <circle cx={0} cy={-22} r={1.5} fill={c.accent} />
      {/* Face */}
      <circle cx={-3} cy={-10} r={1.5} fill={c.eye} />
      <circle cx={3} cy={-10} r={1.5} fill={c.eye} />
      <circle cx={-2.5} cy={-10.5} r={0.6} fill="white" opacity={0.9} />
      <circle cx={3.5} cy={-10.5} r={0.6} fill="white" opacity={0.9} />
      <path d="M -1.5 -7 Q 0 -5.5 1.5 -7" fill="none" stroke={c.eye} strokeWidth={0.7} strokeLinecap="round" />
      {/* Scroll in hand */}
      <rect x={10} y={2} width={4} height={10} rx={2} fill="#F5E6D3" stroke={c.dark} strokeWidth={0.5} />
      <line x1={10} y1={4} x2={14} y2={4} stroke={c.dark} strokeWidth={0.4} opacity={0.4} />
      <line x1={10} y1={7} x2={14} y2={7} stroke={c.dark} strokeWidth={0.4} opacity={0.4} />
      {/* 3D highlight */}
      <path d="M -5 -7 Q -3 -13 2 -12" fill="none" stroke="white" strokeWidth={1.2} strokeLinecap="round" opacity={0.3} />
    </g>
  );
}

/** Elephant — Chunky elephant body with big ears, trunk, tusks, armor */
function renderElephant(c: SideColors, gradId: string) {
  return (
    <g filter="url(#piece-3d-shadow)">
      <ellipse cx={0} cy={17} rx={16} ry={4} fill="rgba(0,0,0,0.12)" />
      {/* Main body — big and round */}
      <ellipse cx={0} cy={3} rx={15} ry={13} fill={`url(#${gradId})`} />
      {/* Big ears */}
      <ellipse cx={-18} cy={-2} rx={8} ry={11} fill={c.base} stroke={c.dark} strokeWidth={0.8} />
      <ellipse cx={18} cy={-2} rx={8} ry={11} fill={c.base} stroke={c.dark} strokeWidth={0.8} />
      {/* Inner ear */}
      <ellipse cx={-18} cy={-1} rx={5} ry={7} fill={c.highlight} opacity={0.5} />
      <ellipse cx={18} cy={-1} rx={5} ry={7} fill={c.highlight} opacity={0.5} />
      {/* Head bump */}
      <ellipse cx={0} cy={-10} rx={10} ry={8} fill={c.base} />
      <ellipse cx={0} cy={-11} rx={9} ry={7} fill={c.highlight} opacity={0.3} />
      {/* Eyes — cute big eyes */}
      <circle cx={-4} cy={-8} r={2.5} fill="white" />
      <circle cx={4} cy={-8} r={2.5} fill="white" />
      <circle cx={-3.5} cy={-7.5} r={1.5} fill={c.eye} />
      <circle cx={4.5} cy={-7.5} r={1.5} fill={c.eye} />
      <circle cx={-3} cy={-8} r={0.6} fill="white" opacity={0.9} />
      <circle cx={5} cy={-8} r={0.6} fill="white" opacity={0.9} />
      {/* Trunk — curves down from center of face */}
      <path d="M 0 -3 Q -1 4 -4 8 Q -6 12 -3 14"
        fill="none" stroke={c.dark} strokeWidth={3} strokeLinecap="round" />
      <path d="M 0 -3 Q -1 4 -4 8 Q -6 12 -3 14"
        fill="none" stroke={c.base} strokeWidth={2} strokeLinecap="round" />
      {/* Small tusks */}
      <path d="M -5 -1 L -7 4" stroke="white" strokeWidth={2} strokeLinecap="round" />
      <path d="M 5 -1 L 7 4" stroke="white" strokeWidth={2} strokeLinecap="round" />
      {/* Armor plate on forehead */}
      <path d="M -5 -14 Q 0 -17 5 -14 L 4 -11 Q 0 -12 -4 -11 Z" fill={c.accent} stroke={c.accentDark} strokeWidth={0.5} />
      <circle cx={0} cy={-14} r={1.2} fill={c.accentDark} />
      {/* Legs hint */}
      <rect x={-10} y={12} width={5} height={5} rx={2} fill={c.dark} opacity={0.5} />
      <rect x={5} y={12} width={5} height={5} rx={2} fill={c.dark} opacity={0.5} />
      {/* 3D highlight */}
      <path d="M -6 -12 Q -2 -16 4 -14" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.25} />
    </g>
  );
}

/** Horse — Horse head/bust with mane, armor, bridle */
function renderHorse(c: SideColors, gradId: string) {
  return (
    <g filter="url(#piece-3d-shadow)">
      <ellipse cx={0} cy={17} rx={13} ry={3.5} fill="rgba(0,0,0,0.12)" />
      {/* Neck/body base */}
      <path d="M -10 4 Q -12 16 -8 16 L 8 16 Q 12 16 10 4 Z"
        fill={`url(#${gradId})`} />
      {/* Armor plate on chest */}
      <path d="M -8 4 L 0 2 L 8 4 L 6 12 L -6 12 Z" fill={c.accent} stroke={c.accentDark} strokeWidth={0.5} opacity={0.7} />
      {/* Horse head — elongated with muzzle */}
      <path d="M -8 -4 Q -10 -14 -6 -20 Q -2 -26 4 -24 Q 10 -22 10 -14 Q 10 -6 6 -2 Q 2 0 -4 0 Z"
        fill={c.base} />
      <path d="M -7 -5 Q -9 -14 -5 -19 Q -1 -24 4 -22 Q 9 -20 9 -14 Q 9 -7 5 -3"
        fill={c.highlight} opacity={0.25} />
      {/* Eye */}
      <circle cx={3} cy={-12} r={2.5} fill="white" />
      <circle cx={3.5} cy={-11.5} r={1.5} fill={c.eye} />
      <circle cx={4} cy={-12} r={0.6} fill="white" opacity={0.9} />
      {/* Nostril */}
      <circle cx={5} cy={-5} r={1} fill={c.darker} opacity={0.6} />
      {/* Muzzle highlight */}
      <ellipse cx={4} cy={-6} rx={4} ry={3} fill={c.highlight} opacity={0.2} />
      {/* Ears — pointed */}
      <polygon points="-4,-20 -2,-28 1,-20" fill={c.base} stroke={c.dark} strokeWidth={0.5} />
      <polygon points="4,-20 7,-27 9,-19" fill={c.base} stroke={c.dark} strokeWidth={0.5} />
      <polygon points="-3,-21 -1,-26 0,-21" fill={c.highlight} opacity={0.4} />
      {/* Mane — flowing curves along neck */}
      <path d="M -4 -22 Q -10 -18 -8 -12 Q -10 -8 -8 -4"
        fill="none" stroke={c.dark} strokeWidth={3} strokeLinecap="round" />
      <path d="M -3 -20 Q -8 -16 -7 -11"
        fill="none" stroke={c.darker} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      {/* Bridle / harness */}
      <path d="M -2 -16 L 8 -14" stroke={c.accent} strokeWidth={1} />
      <path d="M 6 -8 L 8 -14" stroke={c.accent} strokeWidth={1} />
      <circle cx={6} cy={-8} r={1.2} fill={c.accent} />
      {/* 3D highlight */}
      <path d="M -3 -15 Q 0 -20 5 -18" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.25} />
    </g>
  );
}

/** Chariot — War cart with canopy, wheels, flag */
function renderChariot(c: SideColors, gradId: string) {
  return (
    <g filter="url(#piece-3d-shadow)">
      <ellipse cx={0} cy={17} rx={14} ry={3.5} fill="rgba(0,0,0,0.12)" />
      {/* Cart body — rectangular with detail */}
      <rect x={-14} y={0} width={28} height={12} rx={3} fill={`url(#${gradId})`} />
      {/* Side panels */}
      <rect x={-12} y={2} width={24} height={8} rx={2} fill={c.dark} opacity={0.2} />
      <line x1={-4} y1={2} x2={-4} y2={10} stroke={c.dark} strokeWidth={0.6} opacity={0.3} />
      <line x1={4} y1={2} x2={4} y2={10} stroke={c.dark} strokeWidth={0.6} opacity={0.3} />
      {/* Wheels */}
      <circle cx={-11} cy={14} r={5} fill={c.accent} stroke={c.accentDark} strokeWidth={1} />
      <circle cx={11} cy={14} r={5} fill={c.accent} stroke={c.accentDark} strokeWidth={1} />
      {/* Wheel spokes */}
      <line x1={-11} y1={10} x2={-11} y2={18} stroke={c.accentDark} strokeWidth={0.6} />
      <line x1={-15} y1={14} x2={-7} y2={14} stroke={c.accentDark} strokeWidth={0.6} />
      <line x1={11} y1={10} x2={11} y2={18} stroke={c.accentDark} strokeWidth={0.6} />
      <line x1={7} y1={14} x2={15} y2={14} stroke={c.accentDark} strokeWidth={0.6} />
      {/* Hub caps */}
      <circle cx={-11} cy={14} r={1.5} fill={c.accentDark} />
      <circle cx={11} cy={14} r={1.5} fill={c.accentDark} />
      {/* Canopy/roof — angled tent shape */}
      <path d="M -14 0 L -16 -4 L 0 -10 L 16 -4 L 14 0 Z" fill={c.base} stroke={c.dark} strokeWidth={0.5} />
      <path d="M -14 0 L -16 -4 L 0 -10 L 0 0 Z" fill={c.highlight} opacity={0.2} />
      {/* Support poles */}
      <line x1={-12} y1={-3} x2={-12} y2={0} stroke={c.dark} strokeWidth={1.5} />
      <line x1={12} y1={-3} x2={12} y2={0} stroke={c.dark} strokeWidth={1.5} />
      {/* Flag on top */}
      <line x1={0} y1={-10} x2={0} y2={-24} stroke={c.dark} strokeWidth={1.2} />
      <path d="M 0 -24 L 8 -21 L 0 -18 Z" fill={c.base} stroke={c.dark} strokeWidth={0.5} />
      <path d="M 1 -23 L 6 -21 L 1 -19" fill={c.highlight} opacity={0.3} />
      {/* Axle */}
      <line x1={-14} y1={12} x2={14} y2={12} stroke={c.dark} strokeWidth={1.5} />
      {/* 3D highlight */}
      <path d="M -10 -6 Q -4 -9 2 -8" fill="none" stroke="white" strokeWidth={1.2} strokeLinecap="round" opacity={0.25} />
    </g>
  );
}

/** Cannon — Bronze/iron cannon on wheeled mount */
function renderCannon(c: SideColors, gradId: string) {
  return (
    <g filter="url(#piece-3d-shadow)">
      <ellipse cx={0} cy={17} rx={14} ry={3.5} fill="rgba(0,0,0,0.12)" />
      {/* Wheeled mount base */}
      <path d="M -12 8 L -10 14 L 10 14 L 12 8 Z" fill={c.dark} />
      <rect x={-8} y={6} width={16} height={4} rx={2} fill={c.base} />
      {/* Wheels */}
      <circle cx={-10} cy={14} r={4} fill={c.accent} stroke={c.accentDark} strokeWidth={0.8} />
      <circle cx={10} cy={14} r={4} fill={c.accent} stroke={c.accentDark} strokeWidth={0.8} />
      <circle cx={-10} cy={14} r={1.2} fill={c.accentDark} />
      <circle cx={10} cy={14} r={1.2} fill={c.accentDark} />
      {/* Cannon barrel — tilted upward */}
      <path d="M -7 4 L -9 -16 Q -8 -20 8 -20 Q 10 -20 9 -16 L 7 4 Z"
        fill={`url(#${gradId})`} />
      {/* Barrel opening (muzzle) */}
      <ellipse cx={0} cy={-18} rx={7} ry={3} fill={c.dark} />
      <ellipse cx={0} cy={-18} rx={5} ry={2} fill={c.darker} />
      {/* Decorative bands */}
      <rect x={-8} y={-14} width={16} height={2} rx={1} fill={c.accent} opacity={0.7} />
      <rect x={-7} y={-6} width={14} height={2} rx={1} fill={c.accent} opacity={0.7} />
      <rect x={-7.5} y={0} width={15} height={2} rx={1} fill={c.accent} opacity={0.5} />
      {/* Fuse on top */}
      <path d="M 0 -20 Q 3 -24 2 -28" fill="none" stroke={c.dark} strokeWidth={1.5} strokeLinecap="round" />
      {/* Spark/flame */}
      <circle cx={2} cy={-28} r={3} fill={c.accent}>
        <animate attributeName="r" values="2;4;2" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx={1} cy={-29} r={1.5} fill="#FF6B6B" opacity={0.8}>
        <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
      </circle>
      {/* 3D highlight on barrel */}
      <path d="M -5 -15 Q -3 -18 3 -17" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.2} />
    </g>
  );
}

/** Soldier — Small warrior with dome helmet, shield, spear */
function renderSoldier(c: SideColors, gradId: string) {
  return (
    <g filter="url(#piece-3d-shadow)">
      <ellipse cx={0} cy={17} rx={10} ry={3} fill="rgba(0,0,0,0.12)" />
      {/* Body / armor */}
      <rect x={-9} y={0} width={18} height={14} rx={4} fill={`url(#${gradId})`} />
      {/* Armor detail */}
      <rect x={-7} y={2} width={14} height={4} rx={2} fill={c.dark} opacity={0.15} />
      <rect x={-7} y={8} width={14} height={4} rx={2} fill={c.dark} opacity={0.1} />
      {/* Belt */}
      <rect x={-9} y={6} width={18} height={2} rx={1} fill={c.accent} opacity={0.6} />
      {/* Head */}
      <circle cx={0} cy={-8} r={8} fill={c.skin} />
      {/* Dome helmet */}
      <path d="M -9 -8 Q -9 -20 0 -22 Q 9 -20 9 -8 Z" fill={c.base} stroke={c.dark} strokeWidth={0.6} />
      {/* Helmet brim */}
      <ellipse cx={0} cy={-8} rx={10} ry={3} fill={c.dark} />
      {/* Helmet top knob */}
      <circle cx={0} cy={-21} r={2.5} fill={c.accent} stroke={c.accentDark} strokeWidth={0.5} />
      {/* Face — determined look */}
      <circle cx={-3} cy={-6} r={1.5} fill={c.eye} />
      <circle cx={3} cy={-6} r={1.5} fill={c.eye} />
      <circle cx={-2.5} cy={-6.5} r={0.5} fill="white" opacity={0.9} />
      <circle cx={3.5} cy={-6.5} r={0.5} fill="white" opacity={0.9} />
      {/* Determined mouth */}
      <line x1={-2} y1={-3} x2={2} y2={-3} stroke={c.eye} strokeWidth={0.8} strokeLinecap="round" />
      {/* Spear — on right side */}
      <line x1={12} y1={-26} x2={12} y2={14} stroke={c.dark} strokeWidth={1.5} />
      <polygon points="12,-26 9,-20 15,-20" fill={c.accent} stroke={c.accentDark} strokeWidth={0.4} />
      {/* Shield — on left side */}
      <ellipse cx={-12} cy={6} rx={4} ry={6} fill={c.base} stroke={c.dark} strokeWidth={0.8} />
      <line x1={-12} y1={1} x2={-12} y2={11} stroke={c.dark} strokeWidth={0.5} opacity={0.4} />
      <circle cx={-12} cy={6} r={1.5} fill={c.accent} />
      {/* 3D highlight */}
      <path d="M -4 -14 Q 0 -18 4 -16" fill="none" stroke="white" strokeWidth={1.2} strokeLinecap="round" opacity={0.25} />
    </g>
  );
}

interface MiniPieceIconProps {
  type: PieceType;
  side: Side;
  size?: number;
}

/**
 * Small inline-SVG character for use in HTML contexts
 * (PickPhase piece cards, CapturedPieces list).
 */
export function MiniPieceIcon({ type, side, size = 28 }: MiniPieceIconProps) {
  return (
    <svg width={size} height={size} viewBox="-28 -32 56 54" style={{ display: 'block' }}>
      <PieceGradientDefs />
      <PieceBlob type={type} side={side} />
    </svg>
  );
}
