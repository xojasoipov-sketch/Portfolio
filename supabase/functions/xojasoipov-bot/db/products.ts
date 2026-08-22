import { db } from "./client.ts";
import type { ProductRow } from "./types.ts";
import { DUPLICATE_DISTANCE, hammingDistance } from "../utils/imageHash.ts";

/**
 * Strips a caption down to something two people would type the same way:
 * lowercased, punctuation and repeated whitespace gone. Without this,
 * "Nike Air Max 90" and "nike air-max 90!" read as two different products.
 */
export function normalizeTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

export type DuplicateReason = "same_file" | "same_image" | "same_title";

export interface DuplicateMatch {
  product: ProductRow;
  reason: DuplicateReason;
  /** Hamming distance, present only for a "same_image" match. */
  distance?: number;
}

export interface ProductCandidate {
  photoUniqueId: string | null;
  imageHash: string | null;
  normalizedTitle: string | null;
}

/**
 * Ceiling on the visual scan. Comparing dHashes needs them in memory --
 * Postgres cannot do a Hamming-distance lookup without an extension -- so this
 * is deliberate, not an accident. Past it the scan stops covering the oldest
 * rows, which is why it reports `truncated` for the caller to log.
 */
export const VISUAL_SCAN_LIMIT = 5000;

/**
 * Looks for an existing product matching a new submission, cheapest and most
 * certain first: an exact file match is one indexed lookup and beyond doubt,
 * the visual scan is the one that costs something, and the title check is last
 * because it is weakest (two colourways can share a name).
 *
 * Neither of the first two needs any text: a bare photo with no caption is
 * still compared as a picture.
 */
export async function findDuplicate(
  candidate: ProductCandidate,
): Promise<{ match: DuplicateMatch | null; scanned: number; truncated: boolean }> {
  if (candidate.photoUniqueId) {
    const { data } = await db
      .from("xbot_products")
      .select("*")
      .eq("photo_unique_id", candidate.photoUniqueId)
      .limit(1)
      .maybeSingle();
    if (data) {
      return { match: { product: data as ProductRow, reason: "same_file" }, scanned: 1, truncated: false };
    }
  }

  let scanned = 0;
  let truncated = false;
  if (candidate.imageHash) {
    const { data } = await db
      .from("xbot_products")
      .select("*")
      .not("image_hash", "is", null)
      .order("created_at", { ascending: false })
      .limit(VISUAL_SCAN_LIMIT);

    const rows = (data ?? []) as ProductRow[];
    scanned = rows.length;
    truncated = rows.length >= VISUAL_SCAN_LIMIT;

    let best: DuplicateMatch | null = null;
    for (const row of rows) {
      if (!row.image_hash) continue;
      const distance = hammingDistance(candidate.imageHash, row.image_hash);
      if (distance <= DUPLICATE_DISTANCE && (!best || distance < best.distance!)) {
        best = { product: row, reason: "same_image", distance };
        // Nothing can beat an exact visual match, so stop looking.
        if (distance === 0) break;
      }
    }
    if (best) return { match: best, scanned, truncated };
  }

  if (candidate.normalizedTitle) {
    const { data } = await db
      .from("xbot_products")
      .select("*")
      .eq("normalized_title", candidate.normalizedTitle)
      .limit(1)
      .maybeSingle();
    if (data) {
      return { match: { product: data as ProductRow, reason: "same_title" }, scanned, truncated };
    }
  }

  return { match: null, scanned, truncated };
}

export interface CreateProductInput {
  title: string | null;
  description: string | null;
  normalizedTitle: string | null;
  photoFileId: string | null;
  photoUniqueId: string | null;
  imageHash: string | null;
  addedBy: number;
  sourceChatId: number;
  sourceMessageId: number;
}

export async function createProduct(input: CreateProductInput): Promise<ProductRow> {
  const { data, error } = await db
    .from("xbot_products")
    .insert({
      title: input.title,
      description: input.description,
      normalized_title: input.normalizedTitle,
      photo_file_id: input.photoFileId,
      photo_unique_id: input.photoUniqueId,
      image_hash: input.imageHash,
      added_by: input.addedBy,
      source_chat_id: input.sourceChatId,
      source_message_id: input.sourceMessageId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProductRow;
}

export async function countProducts(): Promise<number> {
  const { count } = await db.from("xbot_products").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function listProducts(limit = 10): Promise<ProductRow[]> {
  const { data, error } = await db
    .from("xbot_products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await db.from("xbot_products").delete().eq("id", id);
  return !error;
}
