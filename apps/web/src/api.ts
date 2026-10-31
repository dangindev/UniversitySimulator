import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const base = import.meta.env.VITE_API_URL || "/api/v1";
let localToken = sessionStorage.getItem("usim.dev-session") || "";
let supabase: SupabaseClient | undefined;
if (
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
) {
  supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}
export const authClient = supabase;
export function setDevToken(token: string) {
  localToken = token;
  sessionStorage.setItem("usim.dev-session", token);
}
export async function logout() {
  localToken = "";
  sessionStorage.removeItem("usim.dev-session");
  await supabase?.auth.signOut();
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const accessToken =
    (await supabase?.auth.getSession())?.data.session?.access_token ||
    localToken;
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error(
      "Không kết nối được máy chủ. Kiểm tra mạng và thử lại; bài đã được xác nhận lưu vẫn được giữ.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(
      new Error(
        Array.isArray(data.message)
          ? data.message.join(" · ")
          : data.message || data.error || "Yêu cầu chưa thực hiện được.",
      ),
      { status: response.status },
    );
  return data as T;
}
export function operationKey() {
  return crypto.randomUUID();
}
