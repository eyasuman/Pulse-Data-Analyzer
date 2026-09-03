const SUPABASE_URL = "https://qxdqubzymuqgppwlzbsc.supabase.co";
const SUPABASE_KEY = process.env["SUPABASE_SERVICE_KEY"] ?? "";

if (!SUPABASE_KEY) {
  console.warn("[supabase] SUPABASE_SERVICE_KEY is not set — all DB calls will fail.");
}

const REST_BASE = `${SUPABASE_URL}/rest/v1`;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1`;

// ─── Database ────────────────────────────────────────────────────────────────

async function supabaseFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${REST_BASE}/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${options.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }

  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

export async function sbSelect(table: string, query = ""): Promise<any[]> {
  const result = await supabaseFetch(`${table}${query}`);
  return Array.isArray(result) ? result : [];
}

export async function sbInsert(table: string, data: Record<string, unknown>): Promise<any> {
  const result = await supabaseFetch(table, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (Array.isArray(result)) return result[0];
  return result;
}

export async function sbUpdate(table: string, filter: string, data: Record<string, unknown>): Promise<any> {
  const result = await supabaseFetch(`${table}?${filter}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (Array.isArray(result)) return result[0];
  return result;
}

export async function sbDelete(table: string, filter: string): Promise<void> {
  await supabaseFetch(`${table}?${filter}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/**
 * Upload a file (Buffer) to a Supabase storage bucket.
 * Returns the full public URL for public buckets, or the storage path for private ones.
 */
export async function sbStorageUpload(
  bucket: string,
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const url = `${STORAGE_BASE}/object/${bucket}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": contentType,
      "Cache-Control": "3600",
      "x-upsert": "true",
    },
    body: data,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Storage upload ${bucket}/${path} → ${res.status}: ${body}`);
  }
  return sbPublicUrl(bucket, path);
}

/**
 * Generate a short-lived signed URL for a private bucket.
 * expiresIn is in seconds (default 5 minutes).
 */
export async function sbSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 300
): Promise<string> {
  const url = `${STORAGE_BASE}/object/sign/${bucket}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Signed URL ${bucket}/${path} → ${res.status}: ${body}`);
  }
  const json: any = await res.json();
  // Response: { signedURL: "/storage/v1/object/sign/..." }
  const rel: string = json.signedURL ?? json.signedUrl ?? "";
  return rel.startsWith("http") ? rel : `${SUPABASE_URL}${rel}`;
}

/**
 * Returns the direct public URL for a file in a public bucket.
 */
export function sbPublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
