import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { API_URL, fetchWithTimeout } from "./http";
import { supabase } from "./supabase";

export interface PickedFile {
  uri: string;
  mime: string;
  ext: string;
  fileType: "pdf" | "image";
}

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

function toPicked(uri: string, mime: string): PickedFile {
  const ext = EXT_BY_MIME[mime] ?? "jpg";
  return { uri, mime, ext, fileType: mime === "application/pdf" ? "pdf" : "image" };
}

export async function pickFromCamera(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;
  return toPicked(asset.uri, asset.mimeType ?? "image/jpeg");
}

export async function pickFromLibrary(): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;
  return toPicked(asset.uri, asset.mimeType ?? "image/jpeg");
}

export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;
  return toPicked(asset.uri, asset.mimeType ?? "application/pdf");
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/=+$/, "");
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const index = BASE64_CHARS.indexOf(char);
    if (index === -1) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(output);
}

/**
 * Upload a picked file to the private bucket under <uid>/<reportId>.<ext>,
 * insert the reports row, and kick off extraction. Returns the report id.
 */
export async function uploadReport(file: PickedFile): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (session === null) throw new Error("Not signed in");

  const reportId = Crypto.randomUUID();
  const path = `${session.user.id}/${reportId}.${file.ext}`;

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);

  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(path, bytes.buffer as ArrayBuffer, { contentType: file.mime });
  if (uploadError !== null) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("reports").insert({
    id: reportId,
    user_id: session.user.id,
    file_path: path,
    file_type: file.fileType,
  });
  if (insertError !== null) throw new Error(insertError.message);

  return reportId;
}

/** Ask the FastAPI service to extract a report. Throws if unreachable. */
export async function requestExtraction(reportId: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new Error("Not signed in");

  // Extraction reads the file and runs a long Gemini call; give it room.
  const response = await fetchWithTimeout(
    `${API_URL}/extract`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ report_id: reportId }),
    },
    120_000,
  );
  if (!response.ok) {
    throw new Error(`Extraction request failed (${response.status})`);
  }
}
