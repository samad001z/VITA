import { localDay } from "@/lib/health/types";
import { supabase } from "@/lib/supabase";

/** The quick-log vocabulary. Free text rides along in the note. */
export const SYMPTOMS = [
  "Headache",
  "Fatigue",
  "Fever",
  "Nausea",
  "Dizziness",
  "Pain",
  "Cough",
  "Poor sleep",
] as const;

export type Symptom = (typeof SYMPTOMS)[number];

export const SEVERITIES = ["Mild", "Moderate", "Severe"] as const;

export type Severity = (typeof SEVERITIES)[number];

export interface SymptomLog {
  symptom: Symptom;
  severity: Severity;
  note?: string;
}

/**
 * Writes a 'symptom' timeline event for today. Joins the same timeline as
 * reports and patterns, and is picked up by chat grounding automatically.
 */
export async function logSymptom({ symptom, severity, note }: SymptomLog): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (userId === undefined) throw new Error("Not signed in");

  const trimmed = note?.trim() ?? "";
  const { error } = await supabase.from("timeline_events").insert({
    user_id: userId,
    report_id: null,
    event_type: "symptom",
    title: `${symptom} · ${severity.toLowerCase()}`,
    summary: trimmed === "" ? null : trimmed,
    occurred_at: localDay(new Date()),
  });
  if (error !== null) throw new Error(error.message);
}
