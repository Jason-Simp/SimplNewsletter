"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function authFetch(
  supabase: SupabaseClient | null,
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const headers = new Headers(init?.headers);

  if (supabase) {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  return fetch(input, {
    ...init,
    headers
  });
}
