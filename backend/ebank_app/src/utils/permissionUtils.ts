import { UserRole } from '../types';
import { normalizeUserRole } from './roleUtils';

export type AdminPermissionKey =
  | 'canManageUsers'
  | 'canManageAccounts'
  | 'canManageTransactions'
  | 'canViewReports'
  | 'canManageSettings';

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageAccounts: boolean;
  canManageTransactions: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

interface UserWithAdminProfile {
  role?: string;
  adminProfile?: {
    permissions?: Partial<AdminPermissions>;
  };
}

const defaultAdminPermissions: AdminPermissions = {
  canManageUsers: false,
  canManageAccounts: true,
  canManageTransactions: true,
  canViewReports: true,
  canManageSettings: false
};

export const getAdminPermissions = (user: UserWithAdminProfile | null | undefined): AdminPermissions => {
  if (!user) {
    return { ...defaultAdminPermissions, canManageUsers: false, canManageSettings: false, canViewReports: false, canManageAccounts: false, canManageTransactions: false };
  }

  const normalizedRole = normalizeUserRole(user.role);
  if (normalizedRole === UserRole.SUPER_ADMIN) {
    return {
      canManageUsers: true,
      canManageAccounts: true,
      canManageTransactions: true,
      canViewReports: true,
      canManageSettings: true
    };
  }

  const permissions = user.adminProfile?.permissions as Partial<AdminPermissions> | undefined;
  return {
    ...defaultAdminPermissions,
    ...(permissions || {})
  };
};

export const hasAdminPermission = (user: UserWithAdminProfile | null | undefined, permission?: AdminPermissionKey): boolean => {
  if (!permission) return true;
  const perms = getAdminPermissions(user);
  return perms[permission] === true;
};
