import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { normalizeUserRole } from './roleUtils';

interface UserDocData {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface UsersPublicBackfillResult {
  totalUsers: number;
  created: number;
  skippedExisting: number;
  skippedMissingUsername: number;
}

export const backfillUsersPublic = async (): Promise<UsersPublicBackfillResult> => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const usersPublicSnapshot = await getDocs(collection(db, 'users_public'));

  const existingIds = new Set<string>();
  usersPublicSnapshot.forEach(docSnap => existingIds.add(docSnap.id));

  let created = 0;
  let skippedExisting = 0;
  let skippedMissingUsername = 0;

  let batch = writeBatch(db);
  let batchCount = 0;

  usersSnapshot.forEach(userDoc => {
    const userData = userDoc.data() as UserDocData;
    const username = (userData.username || '').toString().trim();
    const email = (userData.email || '').toString().trim();

    if (!username || !email) {
      skippedMissingUsername += 1;
      return;
    }

    if (existingIds.has(userDoc.id)) {
      skippedExisting += 1;
      return;
    }

    const publicRef = doc(db, 'users_public', userDoc.id);
    batch.set(publicRef, {
      uid: userDoc.id,
      username,
      email,
      role: normalizeUserRole(userData.role),
      isActive: userData.isActive ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    created += 1;
    batchCount += 1;

    if (batchCount >= 450) {
      batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  });

  if (batchCount > 0) {
    await batch.commit();
  }

  return {
    totalUsers: usersSnapshot.size,
    created,
    skippedExisting,
    skippedMissingUsername
  };
};
