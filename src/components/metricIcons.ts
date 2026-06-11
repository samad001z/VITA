import {
  Droplets,
  Flame,
  Footprints,
  HeartPulse,
  MoonStar,
  Waves,
  type LucideIcon,
} from "lucide-react-native";

import { type HealthMetric } from "@/lib/health/types";

export const METRIC_ICONS: Record<HealthMetric, LucideIcon> = {
  heart_rate: HeartPulse,
  sleep_minutes: MoonStar,
  steps: Footprints,
  spo2: Droplets,
  hrv: Waves,
  active_energy: Flame,
};
