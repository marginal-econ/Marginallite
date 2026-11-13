import { DEFAULT_SETTINGS, validateSettings, type SiteSettings } from "../lib/site-settings";
import { getSupabaseAdmin } from "./supabase";

export async function getSettings(): Promise<{ settings: SiteSettings; ready: boolean }> {
  const { data, error } = await getSupabaseAdmin()
    .from("site_settings")
    .select("value")
    .eq("id", 1)
    .maybeSingle();
  // Existing deployments keep working until the additive migration is run.
  if (error && (error.code === "42P01" || error.code === "PGRST205")) {
    return { settings: { ...DEFAULT_SETTINGS }, ready: false };
  }
  if (error) throw error;
  return {
    settings: data
      ? validateSettings({ ...DEFAULT_SETTINGS, ...data.value })
      : { ...DEFAULT_SETTINGS },
    ready: true,
  };
}
export async function saveSettings(settings: SiteSettings): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("site_settings")
    .upsert({ id: 1, value: settings, updated_at: new Date().toISOString() });
  if (error) throw error;
}
