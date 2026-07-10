const SUPABASE_URL = "https://qxdqubzymuqgppwlzbsc.supabase.co";
const SUPABASE_KEY = process.env["SUPABASE_SERVICE_KEY"] ?? "";

if (!SUPABASE_KEY) {
  console.warn("[supabase] SUPABASE_SERVICE_KEY is not set — all DB calls will fail.");
}

const BASE = `${SUPABASE_URL}/rest/v1`;

async function supabaseFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${BASE}/${path}`;
  const res = await fetch(url, {
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
