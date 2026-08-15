import { DocumentData, Timestamp } from 'firebase/firestore';
import { User, UserRole } from '../types';
import { normalizeUserRole, isAdminRole } from './roleUtils';

/** Live Safeguard app stores users in `profiles`, not `users`. */
export const USER_COLLECTION = 'profiles';

const STAFF_SUPERADMIN_EMAILS = new Set([
  'mateenforjob@gmail.com',
  'admin@safeguardsecurities.us',
]);

export function accountStatusToLegacyStatus(accountStatus?: string): string {
  const value = String(accountStatus || 'pending').toLowerCase();
  if (value === 'active') return 'approved';
  if (value === 'suspended' || value === 'locked') return 'suspended';
  return value;
}

export function legacyStatusToAccountStatus(status?: string): string {
  const value = String(status || 'pending').toLowerCase();
  if (value === 'approved' || value === 'active') return 'active';
  if (value === 'suspended' || value === 'inactive' || value === 'locked') return 'suspended';
  return 'pending';
}

export function inferRoleFromEmail(email?: string, storedRole?: string): UserRole {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (STAFF_SUPERADMIN_EMAILS.has(normalizedEmail)) {
    return UserRole.SUPER_ADMIN;
  }
  return normalizeUserRole(storedRole);
}

export function profileToUser(
  uid: string,
  data: DocumentData,
  emailVerified = false
): User {
  const email = String(data.email || '');
  const role = inferRoleFromEmail(email, data.role);
  const accountStatus = String(data.accountStatus || data.status || 'pending');
  const legacyStatus = accountStatusToLegacyStatus(accountStatus);
  const createdAt = (data.createdAt || data.created_at || Timestamp.now()) as Timestamp;
  const updatedAt = (data.updatedAt || data.updated_at || createdAt) as Timestamp;

  return {
    uid,
    email,
    firstName: String(data.first_name || data.firstName || data.displayName || 'User'),
    lastName: String(data.last_name || data.lastName || ''),
    phoneNumber: data.phone || data.phoneNumber,
    role,
    emailVerified,
    twoFactorEnabled: Boolean(data.twoFactorEnabled),
    profileImageUrl: data.profileImageUrl || data.photoURL,
    createdAt,
    updatedAt,
    isActive: legacyStatus === 'approved',
    status: legacyStatus,
    department: data.department,
    jobTitle: data.jobTitle,
    adminProfile: isAdminRole(role) ? data.adminProfile : undefined,
  } as User;
}

export function userWritePayload(user: Partial<User> & { email?: string }): DocumentData {
  const payload: DocumentData = {
    updatedAt: Timestamp.now(),
  };

  if (user.email !== undefined) payload.email = user.email;
  if (user.firstName !== undefined) {
    payload.first_name = user.firstName;
    payload.firstName = user.firstName;
  }
  if (user.lastName !== undefined) {
    payload.last_name = user.lastName;
    payload.lastName = user.lastName;
  }
  if (user.role !== undefined) {
    payload.role = user.role;
    payload.is_admin = isAdminRole(user.role);
  }
  if (user.status !== undefined) {
    payload.accountStatus = legacyStatusToAccountStatus(user.status);
    payload.status = user.status;
  }
  if (user.phoneNumber !== undefined) payload.phone = user.phoneNumber;
  if (user.department !== undefined) payload.department = user.department;
  if (user.jobTitle !== undefined) payload.jobTitle = user.jobTitle;

  return payload;
}

export function newProfileDefaults(email: string, role: UserRole = UserRole.CLIENT): DocumentData {
  const accountStatus = role === UserRole.CLIENT ? 'pending' : 'active';
  return {
    email,
    role,
    is_admin: isAdminRole(role),
    accountStatus,
    status: accountStatusToLegacyStatus(accountStatus),
    customPermissions: [],
    language: 'English (US)',
    timezone: 'America/New_York (EST)',
    currency: 'USD',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}
