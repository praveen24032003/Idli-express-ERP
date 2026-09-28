import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  supabaseUrl && supabasePublishableKey ? createClient(supabaseUrl, supabasePublishableKey) : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  return supabase;
}

export function readData<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Supabase returned no data.");
  return result.data;
}

function camelCase(key: string) {
  return key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function snakeCase(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function mapRow<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => mapRow(item)) as T;
  if (!value || typeof value !== "object" || value instanceof Date) return value as T;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [camelCase(key), mapRow(item)]),
  ) as T;
}

export function toDatabaseRecord(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [snakeCase(key), item]),
  );
}