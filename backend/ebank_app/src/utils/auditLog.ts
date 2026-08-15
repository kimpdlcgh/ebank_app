import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface LogAdminActionParams {
  action: string;
  actor: {
    id?: string;
    email?: string;
  };
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, any>;
}

/**
 * Appends an entry to the admin audit trail. Best-effort: a logging failure
 * must never block the admin action it is recording.
 */
export const logAdminAction = async ({
  action,
  actor,
  targetType,
  targetId,
  targetLabel,
  details
}: LogAdminActionParams): Promise<void> => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      actorId: actor?.id || null,
      actorEmail: actor?.email || null,
      targetType: targetType || null,
      targetId: targetId || null,
      targetLabel: targetLabel || null,
      details: details || {},
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to write audit log entry:', action, error);
  }
};
