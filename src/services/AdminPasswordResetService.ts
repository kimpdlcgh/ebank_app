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
      await sendPasswordResetEmail(auth, user.email);
      console.log('Password reset email sent to:', user.email);
      
      // Update user document
      await updateDoc(doc(db, 'users', user.id), {
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
   * Process password reset request with manual temporary password
   */
  static async processManualReset(
    username: string,
    adminEmail: string,
    requestId: string,
    customTempPassword?: string
  ): Promise<AdminPasswordResetResult> {
    try {
      console.log('Processing manual password reset for username:', username);
      
      // Find user by username
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new Error(`User with username ${username} not found`);
      }
      
      // Generate secure temporary password
      const tempPassword = customTempPassword || PasswordGenerator.generateSecurePassword({
        length: 12,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSpecialChars: true
      });
      
      console.log('Generated temporary password for user:', username);
      
      // Also send password reset email as backup
      try {
        await sendPasswordResetEmail(auth, user.email);
        console.log('Backup password reset email sent to:', user.email);
      } catch (emailError) {
        console.warn('Failed to send backup reset email:', emailError);
        // Continue with manual reset even if email fails
      }
      
      // Update user document with temporary password info and backup email option
      await updateDoc(doc(db, 'users', user.id), {
        mustChangePassword: true,
        passwordResetBy: adminEmail,
        passwordResetAt: serverTimestamp(),
        passwordResetRequestId: requestId,
        temporaryPassword: tempPassword,
        passwordResetMethod: 'manual',
        adminMustCommunicatePassword: true,
        passwordResetEmailSent: true, // Email sent as backup
        adminNotes: `Manual password reset. Temporary password: ${tempPassword}. Password reset email also sent as backup option.`
      });
      
      console.log('Manual password reset completed for user:', username);
      
      return {
        success: true,
        temporaryPassword: tempPassword,
        message: `Manual password reset completed. Temporary password generated. Email reset also sent as backup.`
      };
      
    } catch (error: unknown) {
      console.error('Manual password reset error:', error);
      return {
        success: false,
        message: 'Failed to process manual password reset',
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
    adminEmail: string,
    tempPassword?: string
  ): Promise<AdminPasswordResetResult> {
    try {
      let result: AdminPasswordResetResult;
      
      if (method === 'email') {
        result = await this.processEmailReset(username, adminEmail, requestId);
      } else {
        result = await this.processManualReset(username, adminEmail, requestId, tempPassword);
      }
      
      if (result.success) {
        // Update the password reset request status
        const adminNotes = method === 'email'
          ? `Password reset approved. Firebase password reset email sent. User can reset their password using the email link.`
          : `Manual password reset approved. Temporary password: ${result.temporaryPassword}. Password reset email also sent as backup. Admin must securely communicate the temporary password to the user.`;
          
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
  private static async findUserByUsername(username: string): Promise<any | null> {
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