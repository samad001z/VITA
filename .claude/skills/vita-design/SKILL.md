---
name: vita-design
description: Use this skill whenever creating or modifying ANY UI component, screen, animation, or style in the VITA health app. Enforces the "calm clinical luxury" design system, motion language, and component rules. Trigger for all React Native/Expo UI work in this repo.
---

# VITA Design System — Calm Clinical Luxury

Aesthetic north star: Apple Health × Linear. Soft depth, generous whitespace,
clinical trust. Never Material defaults, never template-looking.

## Tokens (no values outside these)
- Colors: bg #FAFAF8 · surface #FFFFFF · ink #1A1A1E · ink-soft rgba(26,26,30,0.55)
  · primary sage #7C9885 · alert coral #E8826B (alerts ONLY) · hairline rgba(0,0,0,0.06)
- Dark mode: bg #111114 · surface #1C1C21 · ink #F4F4F2, same accent hues desaturated 10%
- Type sizes: 13 / 15 / 17 / 22 / 28 / 34 only. Headings tracking -0.2.
- Radius: 12 / 16 / 24 only. One soft ambient shadow max (opacity ≤ 0.08, radius ≥ 16).
- Spacing grid: multiples of 4. Screen horizontal padding: 20.

## Motion language (Reanimated 3 — every rule mandatory)
- Springs only for layout/entrance: damping 18, stiffness 180. No linear timing for movement.
- Press: scale 0.97 + expo-haptics light impact. Release spring back.
- Entrances: fade + 12px translateY, list items stagger 40ms apart, max 350ms total.
- Number changes (vitals, trends) animate with a counting transition, never snap.
- Sheets: native-feel detents, drag-to-dismiss via gesture-handler, background scales to 0.96.
- Health metric cards: subtle continuous "alive" indicators (e.g., 1.5s breathing pulse on
  live heart-rate dot) — ambient, never distracting.

## Component rules
- Compose ONLY from primitives in src/ui (Screen, Card, Text, Button, Sheet, MetricTile).
  If a primitive is missing, create it in src/ui first, then use it.
- Every screen ships with designed empty state, skeleton loading state, and error state.
- Charts: custom react-native-skia or victory-native, hairline grid, no chart-library default theme.
- Icons: lucide-react-native, 1.5px stroke weight, ink-soft color.
- Accessibility: minimum touch target 44pt, dynamic type respected, labels on all icons.

## Forbidden
- Default Alert.alert for anything user-facing (use custom Sheet)
- Pure black #000, pure red, harsh shadows, more than 2 typefaces
- Any animation > 350ms, any unanimated mount, any `any` type
