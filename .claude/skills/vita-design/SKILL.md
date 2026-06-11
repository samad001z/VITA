---
name: vita-design
description: Use this skill whenever creating or modifying ANY UI component, screen, animation, or style in the VITA health app. Enforces the "Vital Luxe" v2 design system, motion language, and component rules. Trigger for all React Native/Expo UI work in this repo.
---

# VITA Design System v2 — Vital Luxe

Aesthetic north star: Linear's polish × Apple Health's trust × a premium SaaS
dashboard. Layered depth, gradient warmth, disciplined accents. Never Material
defaults, never flat "text on a background", never template-looking.

## Tokens (no values outside src/ui/theme.ts)
- Canvas: bg #F6F7F3 (warm porcelain) · bgDeep #EDF0E9 · surface #FFFFFF
  · glass rgba(255,255,255,0.78)
- Ink: #16181C · soft 0.56 · faint 0.34
- Sage (brand): #578A6C · bright #7DB18F · deep #33523F · soft 12% fill
- Forest (dark hero surfaces): #1B2A21 / #26392D with onForest #F2F5F0 inks
- Gold (premium accent, SPARINGLY — patterns, highlights): #C2974E
- Coral #E8826B for alerts ONLY. Hairline rgba(22,24,28,0.07).
- Gradients from theme.gradients only: primary (sage), hero (forest),
  gold, orbSage/orbGold (ambient background orbs).
- Type sizes: 13/15/17/22/28/34 only. Headings tracking -0.2.
- Radius: 14 / 20 / 28. Shadows: ambientShadow (resting) · liftShadow (heroes).
- Spacing grid: multiples of 4. Screen horizontal padding: 20.

## Signature moves (what makes it feel expensive)
- Screens sit on ambient gradient orbs (Screen renders them) — depth without noise.
- One forest-gradient hero card anchors a screen; everything else stays light.
- Primary buttons are gradient-filled with a soft lift shadow.
- Numbers count up (AnimatedNumber), charts draw in (Sparkline), nothing snaps.
- Gold is reserved for "your body's patterns" moments — it must stay rare.

## Motion language (Reanimated — every rule mandatory)
- Springs only for layout/entrance: damping 18, stiffness 180. No linear movement.
- Press: scale 0.97 + light haptic. Release springs back.
- Entrances: fade + 12px rise, list stagger 40ms, max 350ms total.
- Number changes animate with a counting transition (AnimatedNumber), never snap.
- Sparklines draw in via stroke-dashoffset on the house spring timing (≤350ms).
- Sheets: drag-to-dismiss, background stage scales to 0.96.
- Live metrics get ambient "alive" indicators (1.5s breathing pulse) — never distracting.

## Component rules
- Compose ONLY from primitives in src/ui (Screen, Card, Text, Button, Sheet,
  Toggle, MetricTile, AnimatedNumber, Sparkline, SectionHeader, Skeleton,
  EmptyState, PressableScale, Input, OTPInput). Missing primitive → create it
  in src/ui first, then use it.
- Card variants: "surface" (default, white + ambientShadow) and "hero"
  (forest gradient + liftShadow + onForest inks).
- Every screen ships designed empty, skeleton-loading, and error states.
- Charts: custom-drawn (react-native-svg or skia) — hairline grid, no chart-library theme.
- Icons: lucide-react-native, 1.5px stroke, ink-soft (or onForestSoft on heroes).
- Accessibility: 44pt touch targets, dynamic type, labels on all icons.

## Forbidden
- Default Alert.alert for anything user-facing (use Sheet)
- Pure black #000, pure red, harsh/stacked shadows, more than 2 typefaces
- Gold on more than one element per screen; coral for anything but alerts
- Any animation > 350ms, any unanimated mount, any `any` type
