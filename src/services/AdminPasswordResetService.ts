import { 
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { PasswordGenerator } from '../utils/passwordGenerator';
import { updatePasswordResetRequest } from './PasswordResetService';

export interface AdminPasswordResetResult {
  success: boolean;
  temporaryPassword?: string;
  message: string;
  error?: string;
}

/**
 * Admin Password Reset Service
 * Handles secure password resets for users by administrators
 */
export class AdminPasswordResetService {
  
  /**
   * Process password reset request with email method
   */
  static async processEmailReset(
    username: string, 
    adminEmail: string,
    requestId: string
  ): Promise<AdminPasswordResetResult> {
    try {
      console.log('Processing email password reset for username:', username);
      
      // Find user by username
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new Error(`User with username ${username} not found`);
      }
      
      // Send Firebase password reset email
      const userEmail = user.email as string;
      const userId = user.id as string;
      
      await sendPasswordResetEmail(auth, userEmail);
      console.log('Password reset email sent to:', userEmail);
      
      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        mustChangePassword: true,
        passwordResetBy: adminEmail,
        passwordResetAt: serverTimestamp(),
        passwordResetRequestId: requestId,
        passwordResetEmailSent: true,
        passwordResetMethod: 'email'
      });
      
      return {
        success: true,
        message: `Password reset email sent successfully to ${user.email}`
      };
      
    } catch (error: unknown) {
      console.error('Email password reset error:', error);
      return {
        success: false,
        message: 'Failed to send password reset email',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Process password reset request with Firebase native reset email
   * This ensures compatibility with Firebase Authentication system
   */
  static async processManualReset(
    username: string,
    adminEmail: string,
    requestId: string
  ): Promise<AdminPasswordResetResult> {
    try {
      console.log('Processing Firebase-native password reset for username:', username);
      
      // Find user by username
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new Error(`User with username ${username} not found`);
      }
      
      // Use Firebase's native password reset email (same as Firebase Console)
      const userEmail = user.email as string;
      const userId = user.id as string;
      
      await sendPasswordResetEmail(auth, userEmail);
      console.log('Firebase password reset email sent to:', userEmail);
      
      // Update user document to track the admin-initiated reset
      await updateDoc(doc(db, 'users', userId), {
        mustChangePassword: true,
        passwordResetBy: adminEmail,
        passwordResetAt: serverTimestamp(),
        passwordResetRequestId: requestId,
        passwordResetMethod: 'admin_initiated_firebase_reset',
        passwordResetEmailSent: true,
        adminNotes: `Admin-initiated Firebase password reset. Password reset email sent to ${userEmail}. User can reset password using Firebase's secure reset link.`
      });
      
      console.log('Firebase password reset completed for user:', username);
      
      return {
        success: true,
        message: `Firebase password reset email sent to ${userEmail}. User will receive the same secure reset email as from Firebase Console.`
      };
      
    } catch (error: unknown) {
      console.error('Firebase password reset error:', error);
      return {
        success: false,
        message: 'Failed to send Firebase password reset email',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Complete password reset approval process
   */
  static async completePasswordReset(
    requestId: string,
    method: 'email' | 'manual',
    username: string,
    adminEmail: string
  ): Promise<AdminPasswordResetResult> {
    try {
      let result: AdminPasswordResetResult;
      
      if (method === 'email') {
        result = await this.processEmailReset(username, adminEmail, requestId);
      } else {
        result = await this.processManualReset(username, adminEmail, requestId);
      }
      
      if (result.success) {
        // Update the password reset request status
        const adminNotes = method === 'email'
          ? `Password reset approved. Firebase password reset email sent. User can reset their password using the email link.`
          : `Admin-initiated password reset approved. Firebase password reset email sent using native Firebase system. User will receive the same secure reset link as from Firebase Console.`;
          
        await updatePasswordResetRequest(requestId, {
          status: 'approved',
          adminNotes
        }, adminEmail);
        
        console.log('Password reset request updated to approved status');
      }
      
      return result;
      
    } catch (error: unknown) {
      console.error('Complete password reset error:', error);
      return {
        success: false,
        message: 'Failed to complete password reset process',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Find user by username
   */
  private static async findUserByUsername(username: string): Promise<Record<string, unknown> | null> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('username', '==', username)
      );
      
      const userSnapshot = await getDocs(usersQuery);
      if (userSnapshot.empty) {
        return null;
      }
      
      const userDoc = userSnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      console.error('Error finding user by username:', error);
      return null;
    }
  }
  
  /**
   * Validate admin permissions
   */
  static async validateAdminPermissions(adminUid: string): Promise<boolean> {
    try {
      const adminDoc = await getDoc(doc(db, 'users', adminUid));
      const adminData = adminDoc.data();
      
      return adminData?.role === 'admin' && adminData?.isActive === true;
    } catch (error) {
      console.error('Error validating admin permissions:', error);
      return false;
    }
  }
}