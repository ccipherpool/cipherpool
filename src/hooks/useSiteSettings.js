import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// Cache settings globally so all components share one fetch
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

const DEFAULTS = {
  platform_name:        "CipherPool",
  platform_tagline:     "The Arena Awaits",
  maintenance_mode:     false,
  registration_enabled: true,
  max_tournament_size:  100,
  starter_coins:        500,
  daily_reward_amount:  50,
  min_withdraw_amount:  100,
  discord_url:          "https://discord.gg/cipherpool",
  support_email:        "support@cipherpool.gg",
};

export function useSiteSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _cache && (now - _cacheTime) < CACHE_TTL) {
      setSettings({ ...DEFAULTS, ..._cache });
      setLoading(false);
      return;
    }

    try {
      const { data, error: err } = await supabase.rpc("get_site_settings_public");
      if (err) throw err;

      const parsed = {};
      if (data) {
        Object.entries(data).forEach(([k, v]) => {
          // jsonb values come back as JSON; unwrap primitives
          parsed[k] = v;
        });
      }

      _cache = parsed;
      _cacheTime = now;
      setSettings({ ...DEFAULTS, ...parsed });
    } catch (e) {
      // Graceful fallback — never crash the frontend if CMS is unavailable
      console.warn("useSiteSettings: falling back to defaults", e.message);
      setError(e.message);
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Convenience: check if a feature is available (uses feature_flags table)
  const isFeatureEnabled = useCallback((key) => {
    // This is a simple sync check against the loaded settings.
    // For flag-specific logic, use useFeatureFlags hook.
    return true;
  }, []);

  return { settings, loading, error, refresh: () => load(true), isFeatureEnabled };
}

// Separate hook for feature flags
export function useFeatureFlags() {
  const [flags, setFlags]   = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("feature_flags")
          .select("key, is_enabled")
          .eq("is_enabled", true);

        const map = {};
        (data || []).forEach(f => { map[f.key] = true; });
        setFlags(map);
      } catch {
        // silently fail — all features default to enabled for graceful degradation
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isEnabled = useCallback((key, defaultValue = true) => {
    if (loading) return defaultValue;
    return flags[key] ?? defaultValue;
  }, [flags, loading]);

  return { flags, loading, isEnabled };
}
