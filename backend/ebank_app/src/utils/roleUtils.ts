import { UserRole } from '../types';

export const normalizeUserRole = (role?: string): UserRole => {
  const value = (role || '').toLowerCase();

  if (value === 'super_admin' || value === 'super-admin' || value === 'super admin') {
    return UserRole.SUPER_ADMIN;
  }

  if (value === 'admin') {
    return UserRole.ADMIN;
  }

  return UserRole.CLIENT;
};

export const isAdminRole = (role?: string): boolean => {
  const normalized = normalizeUserRole(role);
  return normalized === UserRole.ADMIN || normalized === UserRole.SUPER_ADMIN;
};