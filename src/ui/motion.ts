import { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";

import { SPRING, STAGGER_MS } from "./theme";

/**
 * Standard entrance: fade + 12px rise on the house spring.
 * `index` staggers list items 40ms apart.
 */
export function enterUp(index = 0) {
  return FadeInDown.springify()
    .damping(SPRING.damping)
    .stiffness(SPRING.stiffness)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
    .delay(index * STAGGER_MS);
}

/** Entrance without movement, for backdrops and overlays. */
export function enterFade(index = 0) {
  return FadeIn.springify()
    .damping(SPRING.damping)
    .stiffness(SPRING.stiffness)
    .delay(index * STAGGER_MS);
}

/** Quick exit — must never exceed the 350ms budget. */
export function exitFade() {
  return FadeOut.duration(150);
}
