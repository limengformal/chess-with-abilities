# Chess with Abilities — Game Manual

*A magical Chinese Chess adventure*

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [The Board](#the-board)
4. [Pieces and Movement](#pieces-and-movement)
5. [Game Phases](#game-phases)
6. [Abilities](#abilities)
7. [Treasures and Mines](#treasures-and-mines)
8. [Winning the Game](#winning-the-game)
9. [Strategy Tips](#strategy-tips)

---

## Overview

**Chess with Abilities** is a strategic board game that combines traditional Chinese Chess (Xiangqi) with a unique ability system. Two players — Red and Black — compete on a classic 9×10 board, but before battle begins, each player bans and picks special abilities to assign to their pieces. These abilities can turn the tide of a game, adding layers of tactical depth to every match.

The game supports two modes: **Local (2 Players)** for playing against a friend, and **VS Computer** for playing against an AI opponent.

---

## Getting Started

### Setup Screen

When you start the game, you will:

1. **Choose a game mode** — Local (2 Players) or VS Computer.
2. **Enter player names** for the Red and Black sides.
3. **Select a board theme** — Classic, Desert, Grassland, or Night.

After setup, the game proceeds through the Ban Phase, Pick Phase, and then the main Play Phase.

---

## The Board

The board is a 9-column by 10-row grid, based on the traditional Xiangqi layout.

```
  0   1   2   3   4   5   6   7   8     ← columns
┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ C │ H │ E │ A │ G │ A │ E │ H │ C │  row 9  (Black back rank)
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │  row 8
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │ c │   │   │   │   │   │ c │   │  row 7  (Black cannons)
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ s │   │ s │   │ s │   │ s │   │ s │  row 6  (Black soldiers)
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │  row 5  ← RIVER
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │  row 4  ← RIVER
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ S │   │ S │   │ S │   │ S │   │ S │  row 3  (Red soldiers)
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │ C │   │   │   │   │   │ C │   │  row 2  (Red cannons)
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │  row 1
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ C │ H │ E │ A │ G │ A │ E │ H │ C │  row 0  (Red back rank)
└───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

Key areas:

- **The River** divides the board between rows 4 and 5. Some pieces behave differently once they cross it.
- **The Palace** is a 3×3 area (columns 3–5) at each end of the board — rows 0–2 for Red, rows 7–9 for Black. The General and Advisors are confined to their palace.
- **Treasure Points** — 6 randomly placed points on the board that grant abilities when a piece lands on them.

---

## Pieces and Movement

Each player starts with 16 pieces. The pieces and their movement rules are:

### General (帅 / 将)

- Moves **one square orthogonally** (up, down, left, or right).
- **Confined to the palace** (3×3 area).
- **Flying General Rule**: The two Generals may never face each other on the same column with no pieces between them. This rule can be used tactically to restrict enemy movement.

### Advisor (仕 / 士)

- Moves **one square diagonally**.
- **Confined to the palace**.

### Elephant (相 / 象)

- Moves **exactly two squares diagonally** (forming a "field" move).
- **Cannot cross the river** — stays on its own side.
- **Can be blocked**: If a piece occupies the square diagonally between the Elephant's start and destination, the move is illegal.

### Horse (马 / 馬)

- Moves in an **L-shape**: one square orthogonally, then one square diagonally outward (similar to the knight in Western chess).
- **Can be blocked**: If a piece occupies the first orthogonal square, the Horse cannot move in that direction.

### Chariot (车 / 車)

- Moves **any number of squares orthogonally** (like a Rook in Western chess).
- Cannot jump over other pieces.

### Cannon (炮 / 砲)

- **Moves** like a Chariot — any number of squares orthogonally.
- **Captures** differently — must jump over exactly one piece (called a "screen") to capture an enemy beyond it.

### Soldier (兵 / 卒)

- **Before crossing the river**: Moves **one square forward** only.
- **After crossing the river**: Can move **one square forward or sideways** (left/right), but never backward.

---

## Game Phases

A full game consists of four phases:

### Phase 1: Ban Phase

Players alternate banning abilities that neither side can use during the match. **Red bans first.** Each player bans **3 abilities**, for a total of 6 banned abilities. This phase prevents dominant strategies and forces variety.

### Phase 2: Pick Phase

Players alternate picking abilities and assigning them to their pieces. **Red picks first.** Each player has a **budget of 10 cost points** to spend on abilities. Rules for picking:

- Each piece can hold **at most one ability**.
- Abilities have different costs (1–4 points), so budget management is key.
- After both players confirm their picks, all ability assignments are revealed.

### Phase 3: Play Phase

The main game. **Red moves first.** Players alternate turns. On each turn, you may:

1. **Move a piece** — Click a piece to see its legal moves highlighted, then click a destination.
2. **Use an active ability** — If the selected piece has an active ability with remaining charges, you can activate it from the Ability Panel instead of making a normal move.

Passive and triggered abilities activate automatically when their conditions are met.

### Phase 4: End Phase

The game ends when a win condition is reached. The End Screen shows a complete game log of moves and ability events, and offers options to **Play Again** or start a **New Game**.

---

## Abilities

There are **14 abilities** in the game, divided into several categories based on how they activate.

### Active Abilities

These are manually activated during your turn instead of (or in addition to) a normal move.

| Ability | Icon | Cost | Charges | Effect |
|---------|------|------|---------|--------|
| **Teleport** | ✨ | 3 | 1 | Move to any empty square on the board. |
| **Double Move** | ⚡ | 3 | 1 | Take two consecutive moves this turn. |
| **Resurrect** | 💫 | 4 | 1 | Bring back the most recently captured friendly piece to any empty square. |
| **Range Attack** | 🎯 | 2 | 1 | Capture an enemy piece within 2 squares, bypassing normal movement rules. |
| **Swap** | 🔄 | 2 | 1 | Swap positions with any friendly piece instantly. |
| **Scout** | 🔍 | 1 | 2 | Reveal the abilities of an enemy piece within 2 squares. |
| **Shadow Step** | 👤 | 2 | 2 | Move to any empty square adjacent to an enemy piece. |

### Triggered on Capture Abilities

These fire automatically after your piece captures an enemy.

| Ability | Icon | Cost | Charges | Effect |
|---------|------|------|---------|--------|
| **Berserk** | 🔥 | 3 | 2 | After capturing an enemy piece, immediately take another move. |
| **Freeze** | ❄️ | 2 | 2 | After capturing, freeze one adjacent enemy piece for 1 turn (the frozen piece cannot move). |

### Triggered on Being Captured Abilities

These fire automatically when your piece is about to be captured.

| Ability | Icon | Cost | Charges | Effect |
|---------|------|------|---------|--------|
| **Shield** | 🛡️ | 2 | 1 | Survive one capture attempt. The piece remains on the board and the charge is consumed. |
| **Poison** | ☠️ | 2 | 1 | When this piece is captured, the attacker loses **all** of their abilities. |

### Passive Abilities

These are always in effect without manual activation.

| Ability | Icon | Cost | Charges | Effect |
|---------|------|------|---------|--------|
| **Fortify** | 🏰 | 2 | 1 | After standing still (not moving) for 2 or more turns, the piece becomes immune to one capture attempt. Consumed on use. |
| **Iron Will** | 🦾 | 1 | Unlimited | Immune to Freeze effects. This piece can never be frozen. |

### Movement-Triggered Ability

| Ability | Icon | Cost | Charges | Effect |
|---------|------|------|---------|--------|
| **Mine** | 💣 | 2 | 2 | When this piece moves, a hidden mine is left at the square it moved **from**. Any enemy that steps on the mine loses **all** their abilities. Mines last for 10 turns. |

### Ability Interactions

When a piece is attacked, defensive abilities resolve in this order:

1. **Fortify** — If the piece has Fortify active (has been stationary for 2+ turns), the capture is blocked and 1 charge is consumed.
2. **Shield** — If Fortify didn't apply, Shield blocks the capture and consumes 1 charge.
3. **Poison** — If neither Fortify nor Shield applied, the piece is captured, but the attacker loses all abilities.

After a successful capture, these effects can trigger:

1. **Berserk** — The attacker gets an extra move.
2. **Freeze** — The attacker may freeze one adjacent enemy.
3. **Ability Inheritance** — There is a 50% chance the attacker inherits an ability from the captured piece.

---

## Treasures and Mines

### Treasures

Six **treasure points** are randomly placed on the board at the start of each game. When a piece moves onto a treasure point, it receives a **random ability** from the pool of banned abilities. This adds an element of surprise and can shift the balance of the game.

### Mines

Mines are invisible traps left behind by pieces with the Mine ability. When an enemy piece steps on a mined square, it immediately **loses all of its abilities**. Mines expire after 10 turns if not triggered.

---

## Winning the Game

The game can end in several ways:

- **Checkmate** — A player's General is under attack (in check) and there is no legal move to escape. The attacking player wins.
- **Stalemate** — A player has no legal moves on their turn. That player **loses** (unlike Western chess where stalemate is a draw).
- **Surrender** — A player may surrender at any time using the Surrender button.
- **Draw** — Either player may propose a draw. The opponent can accept or reject. If accepted, the game ends in a draw.

---

## Strategy Tips

### Drafting Strategy (Ban & Pick)

- **Ban abilities that counter your planned strategy.** If you want to play aggressively, consider banning Shield or Fortify.
- **Budget wisely.** You have only 10 points. A mix of one expensive ability (like Resurrect at 4) and several cheaper ones is often better than concentrating all points on a single piece.
- **Consider synergies.** Berserk on a Chariot is devastating — capture a piece and immediately move again. Freeze on an aggressive Horse can lock down enemy pieces after a capture.
- **Don't ignore passive abilities.** Iron Will (1 cost) is a great value pick that provides permanent Freeze immunity.

### Gameplay Strategy

- **Protect your General.** Abilities are powerful but the core win condition remains the same: checkmate the enemy General.
- **Use Scout early.** At only 1 cost point with 2 charges, Scout provides valuable intel on enemy ability placements. Knowing which enemy pieces have Shield or Poison can save you from costly mistakes.
- **Watch for mines.** If an enemy piece has the Mine ability, be cautious about moving through squares it has recently left.
- **Collect treasures.** Moving a piece onto a treasure point can grant a powerful banned ability for free. Try to reach treasure points before your opponent.
- **Time your active abilities.** Teleport, Double Move, and Shadow Step are one-use abilities. Save them for critical moments — like escaping a check or delivering checkmate.
- **Fortify your key defenders.** A piece with Fortify becomes very hard to capture if it stays still for 2 turns. Use it on a piece guarding your General.

---

## Language and Themes

The game supports **English** and **Chinese** languages via the language toggle. Four board themes are available: **Classic**, **Desert**, **Grassland**, and **Night**.

---

*Enjoy the game! May your abilities serve you well on the battlefield.*
