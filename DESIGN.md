---
name: Modern Linear-Minimalist Productivity
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
  tertiary: '#006243'
  on-tertiary: '#ffffff'
  tertiary-container: '#007d57'
  on-tertiary-container: '#bdffdc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-3xs: 0.125rem
  space-2xs: 0.25rem
  space-xs: 0.375rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  gutter-sm: 0.75rem
  gutter-md: 1rem
  gutter-lg: 1.5rem
  margin-page: 1.5rem
---

## Brand & Style

This design system synthesizes the calm, content-first spatial elegance of Notion with the high-velocity, keyboard-first precision of Linear. Built for high-output product teams, engineers, and creators, the system communicates deliberate craftsmanship, absolute clarity, and frictionless operational speed.

The visual style is **Minimalist-Engineered**:
- **Structured Precision:** Crisp, hairline containment borders paired with generous internal breathing room.
- **Utilitarian Calm:** A low-saturation visual plane where chrome recedes and user tasks command full focus.
- **Tactile Feedback:** Subtle micro-interactions, deliberate focus states, and instant visual validation that honor keyboard navigation and rapid manipulation.

## Colors

The palette balances clinical grayscale neutrality with purposeful, high-energy accents designed for quick visual scanning across complex workflows, task boards, and roadmaps.

### Core Roles
- **Primary (`#2563EB` / Cobalt Blue):** Represents active execution, primary action buttons, key metrics, and selected states.
- **Secondary (`#7C3AED` / Subtle Purple):** Highlights deep contextual features, AI insights, automation sequences, and complex relationships.
- **Tertiary (`#059669` / Emerald Green):** Signals operational health, finished tasks, positive deltas, and verified integrity.
- **Neutral (`#0F172A` / Slate Slate):** Provides high-legibility dark neutral contrasts across text hierarchies, deep frames, and baseline boundaries.

### Functional Status System
Status indicators and chips rely on dedicated, high-contrast semantic pairings (10% tint background + full-strength label and dot indicator):
- **Not Started:** Neutral Slate (`#64748B` label on `#F1F5F9` background; dark mode: `#94A3B8` on `#1E293B`).
- **In Progress:** Cobalt Pulse (`#2563EB` label on `#EFF6FF` background; dark mode: `#60A5FA` on `#1E3A8A33`).
- **Completed:** Emerald Focus (`#059669` label on `#ECFDF5` background; dark mode: `#34D399` on `#064E3B33`).
- **Blocked:** Amber-Red Alert (`#DC2626` label on `#FEF2F2` background; dark mode: `#F87171` on `#7F1D1D33`).

## Typography

Typography prioritizes high-density data parsing and editorial calm. **Geist** acts as the primary voice across marketing, headers, and UI bodies—its precise geometric shapes and sharp mechanical aperatures provide a modern technological rigor.

**JetBrains Mono** is introduced strictly for system-level tokens, task IDs (`PROJ-1024`), keyboard shortcut tooltips, and code blocks.

### Scaling & Responsive Adjustments
- Headers above 24px apply negative letter-spacing to enhance lockup cohesion.
- Mobile breakpoints transition `display` and `headline-lg` into tightened line-height tokens to avoid aggressive multi-line wrapping in board headings or modal panels.

## Layout & Spacing

The layout model is a flexible, multi-pane fluid architecture tailored for project workflows:

- **Structural Composition:** Built upon a collapsible 240px sidebar, an optional secondary panel (filter tree / sprint views at 280px), and an infinite-canvas or auto-fitting flex column container for task columns.
- **Rhythm Base:** Built on a strict 4px grid. Micro elements (task headers, badges, list rows) leverage 4px, 8px, and 12px steps to maintain maximum information density without visual clutter.
- **Responsive Adaptations:**
  - **Desktop (1024px+):** Multi-column split views, synchronized Kanban boards, inline contextual drawers.
  - **Tablet (768px - 1023px):** Sidebars collapse to icon-only rails or overlay sheets. Kanban boards switch to horizontal snap scrolling.
  - **Mobile (< 768px):** Unified vertical list hierarchy with bottom-sheet detail viewports and fixed, thumb-accessible command triggers.

## Elevation & Depth

Visual hierarchy uses a refined combination of surface tonal tiering and low-contrast ghost borders, reinforced by translucent atmospheric ambient shadows.

### Surface Tiers
- **Base Canvas (`surface-0`):** `#FFFFFF` (Dark: `#090D16`)
- **Inset / Sub-layer (`surface-subtle`):** `#F8FAFC` (Dark: `#0F172A`)
- **Card / Raised Containers (`surface-card`):** `#FFFFFF` with 1px border `#E2E8F0` (Dark: `#131C31` with `#1E293B`)
- **Overlay / Popover / Command Menu (`surface-overlay`):** Frosted glass blend with `backdrop-filter: blur(12px)` and `#FFFFFFEE` (Dark: `#131C31DD`)

### Shadow Character
- **Subtle Layer (Cards, Chips):** `0 1px 2px 0 rgba(15, 23, 42, 0.04)`
- **Hover / Active State:** `0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`
- **Floating Panels / Modals:** `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`

## Shapes

The design system adopts a **Soft (Level 1)** curvature system that emphasizes ergonomic modularity without feeling overly bubbly or game-like:

- **Base Controls (`rounded` / 4px / `0.25rem`):** Checkboxes, inline tags, code chips, dropdown items.
- **Interactive Containers (`rounded-md` to `rounded-lg` / 6px - 8px / `0.375rem` - `0.5rem`):** Buttons, text inputs, task list rows, notification toasts.
- **Structural Modules (`rounded-xl` / 12px / `0.75rem`):** Kanban task cards, popover cards, contextual flyout menus.
- **High-Order Surfaces (`rounded-2xl` / 16px / `1rem`):** Modals, full command centers, major canvas viewports.

## Components

### Buttons
- **Primary:** Solid `#2563EB` fill, white text, 8px radius, subtle top-inner highlight (`inset 0 1px 0 rgba(255,255,255,0.15)`). Hover scales tone to `#1D4ED8`. Active state triggers micro-compression (`transform: scale(0.98)`).
- **Secondary / Ghost:** Transparent surface with a 1px border (`#E2E8F0`). On hover, switches to `#F1F5F9`.
- **Keyboard Affordance:** Buttons include an optional trailing monospace shortcut tag (`K`, `⌘+Enter`) rendered in `label-sm`.

### Chips & Status Tags
- Height constrained to 22px (`label-sm`).
- Border-radius set to 4px.
- Styled with a 6px semantic color dot followed by title case text.
- Interactive tags feature a soft border transition and an instantaneous remove/edit icon on hover.

### Task Cards (Kanban / List View)
- 1px neutral hairline border with background `#FFFFFF`.
- Internal padding at `space-md` (12px).
- Dynamic metadata layout: task ID (`JetBrains Mono`, `body-sm`), task title (`headline-sm`), status chip, assignee avatar, and subtask progress bar.
- Lift on hover: Y-axis offset of -1px accompanied by the subtle elevated ambient shadow.

### Input Fields & Search Bars
- Minimalist background `#F8FAFC`, stepping to solid `#FFFFFF` on focus with a dual-ring: 1px `#2563EB` outline and 3px `rgba(37, 99, 235, 0.15)` focus spread.
- Prefix and suffix icon alignment using neutral muted slate `#94A3B8`.

### Checkboxes & Selection Controls
- 16x16px square with 4px border radius.
- Unchecked: 1.5px border `#CBD5E1`.
- Checked: `#2563EB` solid fill with white checkmark icon, animated via a quick stroke-dashoffset transition.

### Interactive Command Palette (`Cmd+K`)
- Centered modal container (`rounded-xl`), floating elevation, search-first interface with filter groupings (Tasks, Projects, Views, Actions).
- Highlighted items use an active left border stripe (`#2563EB`) and background `#F1F5F9`.