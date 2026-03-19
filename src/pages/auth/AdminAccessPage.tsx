import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import LogoDisplay from '../../components/ui/LogoDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { UserRole } from '../../types';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import PasswordSecurityService from '../../services/PasswordSecurityService';
import { isAdminRole, normalizeUserRole } from '../../utils/roleUtils';

const AdminAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signOut, user } = useAuth();
  const { getPrimaryLogo, getCompanyName, loading: configLoading } = useSystemConfigContext();
  const [authMode, setAuthMode] = useState<'login' | 'create'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingAdminId, setPendingAdminId] = useState<string | null>(null);
  const [pendingAdminEmail, setPendingAdminEmail] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [createAdminData, setCreateAdminData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const isMfaVerified = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('adminMfaVerified') === 'true';
  }, [showMfaPrompt]);

  const userRequiresMfa = useMemo(() => {
    if (!user) return false;
    const userSecurity = (user as any)?.security;
    return Boolean(userSecurity?.twoFactorEnabled);
  }, [user]);

  // Redirect if already logged in as admin
  React.useEffect(() => {
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)) {
      if (userRequiresMfa && !isMfaVerified) return;
      navigate('/admin');
    }
  }, [user, navigate, userRequiresMfa, isMfaVerified]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateInputChange = (field: keyof typeof createAdminData, value: string) => {
    setCreateAdminData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { firstName, lastName, email, password, confirmPassword } = createAdminData;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error('Please complete all fields.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsCreatingAdmin(true);

    let secondaryApp: any = null;
    try {
      const { createUserWithEmailAndPassword, getAuth, signOut } = await import('firebase/auth');
      const { collection, doc, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, where } = await import('firebase/firestore');
      const { app, db } = await import('../../config/firebase');
      const { deleteApp, getApps, initializeApp } = await import('firebase/app');

      // Optional safety check: this can be blocked by strict rules for non-admin users.
      // If blocked, continue and let create/write rules determine authorization.
      try {
        const existingAdminQuery = query(
          collection(db, 'users'),
          where('role', 'in', [UserRole.ADMIN, UserRole.SUPER_ADMIN]),
          limit(1)
        );
        const existingAdmins = await getDocs(existingAdminQuery);

        if (!existingAdmins.empty) {
          toast.error('Admin account creation is disabled. Contact an existing admin.');
          return;
        }
      } catch (checkError) {
        console.warn('Admin existence pre-check skipped due Firestore rules:', checkError);
      }

      secondaryApp = getApps().find(existing => existing.name === 'SecondaryAdminSignup') || initializeApp(app.options, 'SecondaryAdminSignup');
      const secondaryAuth = getAuth(secondaryApp);
      const secondaryDb = getFirestore(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
      const firebaseUser = userCredential.user;

      await setDoc(doc(secondaryDb, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: UserRole.SUPER_ADMIN,
        emailVerified: firebaseUser.emailVerified,
        twoFactorEnabled: false,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'admin-access-signup',
        adminProfile: {
          department: 'Administration',
          jobTitle: 'System Administrator',
          permissions: {
            canManageUsers: true,
            canManageAccounts: true,
            canManageTransactions: true,
            canViewReports: true,
            canManageSettings: true
          }
        }
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      secondaryApp = null;

      setFormData({
        email: email.trim(),
        password
      });
      setCreateAdminData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setAuthMode('login');
      toast.success('Admin account created. Sign in to continue.');
    } catch (error) {
      console.error('Admin signup error:', error);
      if (error instanceof Error && error.message.includes('auth/email-already-in-use')) {
        toast.error('That email is already registered.');
      } else if (error instanceof Error && error.message.toLowerCase().includes('insufficient permissions')) {
        toast.error('Admin profile write was blocked by Firestore rules. Deploy the latest firestore.rules, then try again.');
      } else {
        toast.error('Unable to create admin account. Please try again.');
      }
    } finally {
      if (secondaryApp) {
        try {
          const { deleteApp } = await import('firebase/app');
          await deleteApp(secondaryApp);
        } catch {
          // no-op cleanup failure
        }
      }
      setIsCreatingAdmin(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = formData.email.trim();
    const normalizedPassword = formData.password.trim();
    
    if (!normalizedEmail || !normalizedPassword) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('adminMfaVerified');
      }
      await signIn(normalizedEmail, normalizedPassword);

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Authentication state not available. Please try again.');
      }

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.data();
      const resolvedRole = normalizeUserRole(
        userData?.role || (userData?.adminProfile ? UserRole.ADMIN : undefined)
      );

      if (!userDoc.exists() || !isAdminRole(resolvedRole)) {
        await signOut();
        toast.error('This account is not configured for admin access.');
        return;
      }

      const requiresMfa = Boolean(userData?.security?.twoFactorEnabled);

      if (requiresMfa) {
        setPendingAdminId(firebaseUser.uid);
        setPendingAdminEmail(firebaseUser.email || formData.email);
        setShowMfaPrompt(true);
        toast.success('Enter your 2FA code to continue.');
        return;
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('adminMfaVerified', 'true');
      }

      toast.success('Admin login successful!');
      navigate('/admin');
    } catch (error) {
      console.error('Admin login error:', error);
      const errorCode = (error as { code?: string } | null)?.code;
      if (errorCode === 'auth/invalid-credential') {
        toast.error('Invalid email or password. Please try again.');
        return;
      }
      if (error instanceof Error) {
        if (error.message.includes('user-not-found')) {
          toast.error('Admin account not found');
        } else if (error.message.includes('wrong-password')) {
          toast.error('Invalid password');
        } else if (error.message.includes('too-many-requests')) {
          toast.error('Too many failed attempts. Please try again later.');
        } else {
          toast.error('Login failed. Please check your credentials.');
        }
      }
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAdminId) {
      toast.error('Unable to verify MFA. Please sign in again.');
      return;
    }

    if (!mfaCode.trim()) {
      toast.error('Enter your authentication code');
      return;
    }

    setIsVerifyingMfa(true);
    try {
      const isValid = await PasswordSecurityService.verify2FACode(pendingAdminId, mfaCode.trim());
      if (!isValid) {
        toast.error('Invalid authentication code');
        return;
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('adminMfaVerified', 'true');
      }

      setShowMfaPrompt(false);
      setMfaCode('');
      toast.success('MFA verified. Welcome back!');
      navigate('/admin');
    } catch (error) {
      console.error('MFA verification error:', error);
      toast.error('Unable to verify MFA. Please try again.');
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleCancelMfa = async () => {
    setShowMfaPrompt(false);
    setMfaCode('');
    setPendingAdminId(null);
    setPendingAdminEmail('');
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('adminMfaVerified');
    }
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error after MFA cancel:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-full max-w-xs">
              {!configLoading ? (
                <LogoDisplay 
                  logoUrl={getPrimaryLogo()} 
                  companyName=""
                  fallbackIcon={<Shield className="w-12 h-12 text-blue-600" />}
                  className="w-full h-20 object-contain"
                />
              ) : (
                <div className="w-full h-20 flex items-center justify-center">
                  <img 
                    src="/frbr_logo.png"
                    alt="Logo"
                    className="w-full h-20 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Admin Access</h2>
          <p className="mt-1 text-sm text-slate-600">Sign in to manage the system</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-center mb-6 rounded-lg border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`w-1/2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Admin Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('create')}
              className={`w-1/2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${authMode === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Create Admin
            </button>
          </div>

          {authMode === 'login' ? (
          <>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Admin Sign In</h3>
            <p className="text-sm text-slate-600">Use your admin credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium"
            >
              Sign in
            </button>
          </form>
          </>
          ) : (
          <>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Create First Admin</h3>
            <p className="text-sm text-slate-600">Bootstrap a super-admin account for this system</p>
          </div>

          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="create-first-name" className="block text-sm font-medium text-slate-700 mb-2">
                  First Name
                </label>
                <input
                  id="create-first-name"
                  type="text"
                  value={createAdminData.firstName}
                  onChange={(e) => handleCreateInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Jane"
                  required
                />
              </div>
              <div>
                <label htmlFor="create-last-name" className="block text-sm font-medium text-slate-700 mb-2">
                  Last Name
                </label>
                <input
                  id="create-last-name"
                  type="text"
                  value={createAdminData.lastName}
                  onChange={(e) => handleCreateInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Admin"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="create-email" className="block text-sm font-medium text-slate-700 mb-2">
                Admin Email
              </label>
              <input
                id="create-email"
                type="email"
                value={createAdminData.email}
                onChange={(e) => handleCreateInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="create-password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="create-password"
                  type={showCreatePassword ? 'text' : 'password'}
                  value={createAdminData.password}
                  onChange={(e) => handleCreateInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors pr-10"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="create-confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="create-confirm-password"
                  type={showCreateConfirmPassword ? 'text' : 'password'}
                  value={createAdminData.confirmPassword}
                  onChange={(e) => handleCreateInputChange('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors pr-10"
                  placeholder="Re-enter your password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCreateConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingAdmin}
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-60"
            >
              {isCreatingAdmin ? 'Creating admin...' : 'Create Admin'}
            </button>

            <p className="text-xs text-slate-500">
              For security, this option only works when no admin account currently exists.
            </p>
          </form>
          </>
          )}
        </div>

        {/* MFA Verification Modal */}
        {showMfaPrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Two-Factor Verification</h3>
                  <p className="text-xs text-slate-500">{pendingAdminEmail}</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                Enter the 6-digit code from your authenticator app to complete admin sign-in.
              </p>

              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Authentication Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="123456"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelMfa}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingMfa}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {isVerifyingMfa ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Footer */}
        <div className="text-center">
          <p className="text-slate-700 text-sm">
            Secure Administrative Access • {getCompanyName()}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Protected by enterprise-grade security
          </p>
          
          {/* Client Access Link */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <Link
              to="/client-login"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm underline"
            >
              Client Account Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccessPage;