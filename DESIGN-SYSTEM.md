# Design System

## Colors
- **Background (page):** `#06080e`
- **Surface (cards, panels):** `#0b0f1a`
- **Border:** `rgba(255, 255, 255, 0.06)` or `border-white/6`
- **Accent (primary):** Cyan `#22d3ee`
- **Success / Recovery high:** Green `#34d399`
- **Warning / Recovery mid:** Amber `#fbbf24`
- **Error / Recovery low:** Red `#f87171`
- **Muted text:** `rgba(255, 255, 255, 0.5)` or `text-gray-400`

## Typography
- **Body / UI:** Cairo (Arabic-first), fallback system sans
- **IDs, numbers, codes:** Space Mono (monospace)
- Load both: `Cairo`, `Space Mono` from Google Fonts

## Animations
- **Card hover:** `translateY(-3px)` + border-color → cyan
- **Stagger (lists/cards):** `fadeUp` with delay `0.05s` per item (e.g. `animation-delay: calc(var(--i) * 50ms)`)
- **Skeleton loading:** `pulse` animation
- **Transitions:** `transition-all duration-200` or `duration-300` for panels

## Components
- **Card radius:** `16px` (`rounded-2xl`)
- **Buttons:** Rounded (e.g. `rounded-xl`), accent bg or outline with accent border
- **Badges:** Rounded, status colors (cyan/green/amber/red) with low opacity bg
- **Inputs:** Dark bg, border `white/6`, focus: ring or border cyan

## Recovery score bar
- **Green:** score > 70 → `#34d399`
- **Amber:** 40–70 → `#fbbf24`
- **Red:** < 40 → `#f87171`

## Layout
- **Ambient gradient background:** Optional subtle gradient on page bg (e.g. from accent at low opacity)
- **Sidebar panels:** Slide from right, width e.g. 280px, overlay + transition

## Status palette (badges)
- Scheduled / default: cyan
- Success / completed: green
- Warning / in progress: amber
- Error / cancelled: red
- Muted: gray
