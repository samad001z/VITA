---
name: vita-design
description: Use this skill whenever creating or modifying ANY UI component, screen, animation, or style in the VITA health app. Enforces the "Living Bloom" v3 design system, motion language, theming, and component rules. Trigger for all React Native/Expo UI work in this repo.
---

# VITA Design System v3 — Living Bloom

## Companion skills (installed in .claude/skills/)
Consult these for craft guidance, but on any conflict the tokens, motion
values, and rules in THIS file win:
- `design-motion-principles` — motion/interaction craft (Kowalski, Krehel,
  Tompkins techniques); use when building or auditing animations.
- `impeccable` — frontend design workflows (craft, critique, audit, polish,
  typeset, layout, etc.); use for UX review and visual-hierarchy passes.
- `design-taste-frontend` (taste-skill) — anti-slop direction for marketing
  surfaces, landing pages, and redesigns; not for in-app product UI.

Aesthetic north star: Linear's polish × Apple Health's trust × Genie's living
serenity. Layered depth, gradient warmth, one living centerpiece, disciplined
accents. Never Material defaults, never flat "text on a background", never
template-looking.

## Theming (mandatory since v3)
- The app ships light ("porcelain day") AND dark ("forest night"). EVERY
  color resolves through `useTheme()` from src/ui — `const { colors,
  gradients, scheme } = useTheme()`. Importing static color objects is
  forbidden; theme.ts exports palettes only.
- User preference (system/light/dark) lives in Profile → Appearance,
  persisted via AsyncStorage. app.json userInterfaceStyle is "automatic".
- Scheme-dependent chrome: BlurView tint follows `scheme`; StatusBar style
  inverts; QR codes stay ink-on-white in BOTH themes (scanners first).

## Tokens (no values outside src/ui/theme.ts)
- Light canvas: bg #F6F7F3 · bgDeep #EDF0E9 · surface #FFF · ink #16181C
- Dark canvas: bg #0F1411 · bgDeep #0A0E0B · surface #181F1A · ink #F2F5F0
- Sage (brand): light #578A6C / dark #7DB18F · soft 12–16% fill
- Forest hero surfaces with onForest inks (work in both schemes)
- Gold (premium accent, SPARINGLY — patterns/highlights): light #97702B,
  dark #D8B26E. Text-safe by design (≥4.5:1 as caption text); rich gold
  fills come from gradients.gold only.
- Coral for alerts ONLY: light #C14F36, dark #F09780 (also text-safe).
- `fill` token for skeletons/off-tracks. Hairline ~7–9% ink.
- Gradients from theme.gradients only: primary, hero, gold, orbSage/orbGold.
- Type sizes: 13/15/17/22/28/34 only. Headings tracking -0.2.
- Radius: 14 / 20 / 28. Shadows: ambientShadow (resting) · liftShadow (heroes).
- Spacing grid: multiples of 4. Screen horizontal padding: 20.

## The Bloom (signature, v3)
- `Bloom` (src/ui/Bloom.tsx) is the living centerpiece: gradient petals that
  breathe on BREATH_MS (3200ms) and drift imperceptibly. Max ONE per screen.
- It must always be DRIVEN BY REAL STATE, never decoration for its own sake:
  Home hero bloom reads the pattern engine (sage calm = in rhythm, gold
  tone = a baseline drift detected); Welcome bloom is the brand moment.
- Static under reduced motion. Always accessibilityElementsHidden.

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
- Ambient "alive" loops are the ONLY animations allowed past 350ms: live
  dots (1.5s), the Bloom's breath (3200ms). Subtle, never attention-seeking,
  and disabled under reduced motion.
- Screen transitions: stack fades 200ms; report detail slides from bottom
  (paper handed over). Reanimated 4 removed shared element transitions — do
  not attempt sharedTransitionTag.

## Haptics (semantic vocabulary — src/lib/haptics.ts only)
- tap (light impact) · press-down, owned by PressableScale
- select · a choice changed state (toggles, chips, theme switch)
- success · a wait completed (upload processed, share minted, OTP accepted)
- warning · destructive/attention (revoke, upload failure)
- error · rejection (bad OTP)
- Never call expo-haptics directly outside that module.

## Component rules
- Compose ONLY from primitives in src/ui (Screen, Card, Text, Button, Sheet,
  Toggle, MetricTile, AnimatedNumber, Sparkline, SectionHeader, Skeleton,
  EmptyState, PressableScale, Input, OTPInput, Bloom). Missing primitive →
  create it in src/ui first, then use it.
- Card variants: "surface" (default) and "hero" (forest gradient + liftShadow
  + onForest inks).
- Every screen ships designed empty, skeleton-loading, and error states.
- Charts: custom-drawn (react-native-svg) — hairline grid, no chart-library
  theme. No skia (Expo Go safety).
- Icons: lucide-react-native, 1.5px stroke, ink-soft (or onForestSoft on heroes).
- Accessibility: 44pt touch targets, dynamic type, labels on all icons,
  reduced-motion fallbacks for every loop.

## Forbidden
- Static color imports; any hex/rgba literal outside theme.ts (exceptions:
  QR ink-on-white, on-forest glass pills documented inline)
- Default Alert.alert for anything user-facing (use Sheet)
- Pure black #000, pure red, harsh/stacked shadows, more than 2 typefaces
- Gold on more than one element per screen; coral for anything but alerts
- Any transition > 350ms (ambient loops exempt, see Motion), any unanimated
  mount, any `any` type
- More than one Bloom per screen, or a Bloom not driven by real state
