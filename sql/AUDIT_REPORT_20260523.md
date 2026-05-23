# CipherPool Database Audit Report
**Date:** 2026-05-23  
**DB:** PostgreSQL 17.6 · Supabase project `mbaldfltjcjlsrhntteh`  
**Tool:** psql 18.4 (local) · direct connection db.*.supabase.co:5432

---

## 1. Schema Overview

| Item | Count |
|------|-------|
| Tables (public schema) | **155** |
| RPC Functions | **232** |
| Storage Buckets | **8** |
| Tables with RLS enabled | **155 / 155** ✅ |
| Tables without RLS | **0** ✅ |

---

## 2. Key Active Tables (non-empty)

| Table | Approx Rows |
|-------|-------------|
| profiles | 1,016 |
| wallets | 1,016 |
| team_members | 393 |
| admin_logs | 92 |
| tournaments | 50 |
| teams | 31 |
| chat_messages | 31 |
| user_daily_claims | 22 |
| wallet_transactions | 20 |
| store_items | 19 |
| user_items | 14 |
| tournament_participants | 5 |
| notifications | 5 |
| user_presence | 4 |

All wallet balances = 0 (economy not yet seeded with real coins).

---

## 3. Storage Buckets

| Bucket | Public | Size Limit |
|--------|--------|-----------|
| avatars | ✅ | 5 MB |
| chat-audio | ✅ | unlimited |
| screenshots | ✅ | 10 MB |
| store-items | ✅ | 10 MB |
| **stories** | ✅ | **50 MB** ← created this session |
| team-logos | ✅ | unlimited |
| tournament-banners | ✅ | 10 MB |
| verification-docs | ✅ | unlimited |

---

## 4. Migrations Applied This Session

### sql/43_platform_os_infrastructure.sql ✅
Tables created:
- `system_modules` — 23 platform systems seeded
- `system_events` — centralized event bus
- `system_alerts` — admin incident tracker
- `ai_reports` — AI-generated analysis
- `automation_rules` — rule-based triggers
- `feature_flags` — 7 flags seeded
- `system_metrics` — time-series perf data

RPCs created:
- `get_platform_overview()` — live snapshot for Command Center
- `log_system_event()` — frontend event logging helper

### sql/44_cms_control_system.sql ✅
Tables created:
- `site_settings` — 10 settings seeded
- `theme_settings` — 1 theme seeded (Cyber Dark)
- `homepage_sections` — 5 sections seeded
- `navigation_items` — dynamic nav management
- `media_assets` — centralized media library
- `cms_logs` — auto-audit trail

RPCs created:
- `get_site_settings_public()` — public settings map for frontend
- `update_site_setting(key, value)` — super_admin/founder only
- `toggle_feature_flag(key, enabled)` — super_admin only

Triggers:
- `cms_log_site_settings` → auto-logs every change to site_settings
- `cms_log_feature_flags` → auto-logs every flag toggle
- `cms_log_homepage_sections` → auto-logs homepage edits

---

## 5. RLS Fixes Applied

Tables that had RLS disabled (now all enabled + policies added):

| Table | Policy Added |
|-------|-------------|
| audit_logs | admin read/write |
| clan_tests | admin only |
| match_disputes | admin read/write |
| permissions | admin read, super_admin write |
| role_permissions | admin read, super_admin write |
| schema_migrations | super_admin read only |
| tournament_matches | authenticated read, admin write |

---

## 6. Frontend Wiring

| Change | Status |
|--------|--------|
| CMSTab imported in SuperAdmin.jsx | ✅ |
| "CMS" nav item added to Platform section | ✅ |
| `activeTab === "cms"` render case added | ✅ |
| `/command-center` route registered in App.jsx | ✅ (was already there) |
| Command Center link in Sidebar.jsx | ✅ (was already there) |
| `useSiteSettings.js` hook | ✅ (new file, ready) |
| `useFeatureFlags()` export from useSiteSettings | ✅ |

---

## 7. Platform Overview (live snapshot)

```json
{
  "online_users": 0,
  "total_users": 1016,
  "active_tournaments": 21,
  "open_reports": 0,
  "open_alerts": 0,
  "total_coins": 0,
  "systems_online": 23,
  "systems_total": 23,
  "health_pct": 100,
  "new_users_today": 0
}
```

---

## 8. Schema Backup

File: `sql/backup_schema_20260523_163816.sql` (605 KB, schema-only)

---

## 9. Pending Items

- [ ] Realtime enabled on `system_alerts` + `system_events` in Supabase Dashboard
- [ ] Starter coins grant via `admin_adjust_coins` to seed economy
- [ ] `navigation_items` table: seed rows for dynamic nav (optional)
- [ ] `media_assets` bucket policies (stories bucket done; others use existing policies)
- [ ] `/friends` page UI (social module backlog)
- [ ] `/messages` inbox page (social module backlog)
