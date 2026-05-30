import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

// ── Role-based permission matrix ──────────────────────────────────
export const ROLE_PERMISSIONS = {
  super_admin: ["*"],
  admin: [
    "users.view", "users.ban", "users.verify", "users.mute",
    "reports.view", "reports.resolve",
    "tickets.view", "tickets.reply", "tickets.close",
    "tournaments.moderate", "tournaments.view",
    "matches.confirm",
    "analytics.view",
    "logs.view",
    "coins.grant",
  ],
  founder: [
    "tournaments.create", "tournaments.edit_own", "tournaments.delete_own",
    "matches.manage_own", "matches.start",
    "users.view",
  ],
  designer: [
    "store.manage", "store.upload",
    "banners.manage",
    "assets.upload",
  ],
  user: [
    "profile.view", "profile.edit",
    "wallet.view",
    "tournaments.join",
    "chat.send",
  ],
};

// ── can(role, permission) ─────────────────────────────────────────
export const can = (role, permission) => {
  const list = ROLE_PERMISSIONS[role] || [];
  return list.includes("*") || list.includes(permission);
};

// ── Legacy PERMISSIONS map (kept for backward compat) ────────────
export const PERMISSIONS = {
  VIEW_USERS:            'users.view',
  EDIT_USER_ROLE:        'edit_user_role',
  BAN_USER:              'users.ban',
  DELETE_USER:           'delete_user',
  GRANT_COINS:           'coins.grant',
  VIEW_USER_DETAILS:     'users.view',
  CREATE_TOURNAMENT:     'tournaments.create',
  EDIT_ANY_TOURNAMENT:   'edit_any_tournament',
  DELETE_ANY_TOURNAMENT: 'delete_any_tournament',
  MANAGE_OWN_TOURNAMENT: 'tournaments.edit_own',
  START_MATCH:           'matches.start',
  CONFIRM_MATCH_RESULT:  'matches.confirm',
  MANAGE_ADMINS:         'manage_admins',
  VIEW_LOGS:             'logs.view',
  MANAGE_REPORTS:        'reports.resolve',
  VIEW_ANALYTICS:        'analytics.view',
  VIEW_ALL_TICKETS:      'tickets.view',
  REPLY_TO_TICKETS:      'tickets.reply',
  CLOSE_TICKETS:         'tickets.close',
  VERIFY_USERS:          'users.verify',
  MAINTENANCE_MODE:      'maintenance_mode',
  VIEW_SYSTEM_CONFIG:    'view_system_config',
};

// ── usePermissions hook ───────────────────────────────────────────
export const usePermissions = (user) => {
  const [permissions, setPermissions] = useState({
    can: () => false,
    isSuperAdmin: false,
    isAdmin: false,
    isFounder: false,
    isDesigner: false,
    isUser: false,
    isBanned: false,
  });

  useEffect(() => {
    if (!user) {
      setPermissions({ can: () => false, isSuperAdmin: false, isAdmin: false, isFounder: false, isDesigner: false, isUser: false, isBanned: false });
      return;
    }
    setPermissions({
      can:          (perm) => can(user.role, perm),
      isSuperAdmin: user.role === 'super_admin',
      isAdmin:      ['admin', 'super_admin'].includes(user.role),
      isFounder:    user.role === 'founder',
      isDesigner:   user.role === 'designer',
      isUser:       user.role === 'user',
      isBanned:     user.role === 'banned',
    });
  }, [user]);

  return permissions;
};

// ── checkPermission (Supabase RPC — for sensitive ops) ───────────
export const checkPermission = async (userId, permissionName) => {
  try {
    // Note: check_user_permission takes p_user_id and required_role (not permission_name)
    const { data, error } = await supabase.rpc('check_user_permission', { p_user_id: userId, required_role: permissionName });
    if (error) return false;
    return data || false;
  } catch {
    return false;
  }
};

export default can;
