import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import { UserRole } from './types';
import ErrorBoundary from './components/ErrorBoundary';

const ClientLoginPage = React.lazy(() => import('./pages/auth/ClientLoginPage'));
const ChangePasswordPage = React.lazy(() => import('./pages/auth/ChangePasswordPage'));
const PasswordResetActionPage = React.lazy(() => import('./pages/auth/PasswordResetActionPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/auth/ForgotPasswordPage'));
const AdminAccessPage = React.lazy(() => import('./pages/auth/AdminAccessPage'));

const ClientDashboard = React.lazy(() => import('./pages/client/Dashboard'));
const AccountOverview = React.lazy(() => import('./pages/client/AccountOverview'));
const TransactionHistory = React.lazy(() => import('./pages/client/TransactionHistory'));
const DepositFunds = React.lazy(() => import('./pages/client/DepositFunds'));
const WithdrawFunds = React.lazy(() => import('./pages/client/WithdrawFunds'));
const TransferFunds = React.lazy(() => import('./pages/client/TransferFunds'));
const EWalletManagement = React.lazy(() => import('./pages/client/EWalletManagement'));
const Profile = React.lazy(() => import('./pages/client/Profile'));
const ReportsAnalytics = React.lazy(() => import('./pages/client/ReportsAnalytics'));
const Statements = React.lazy(() => import('./pages/client/Statements'));
const HelpSupport = React.lazy(() => import('./pages/client/HelpSupport'));

const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminAnalytics = React.lazy(() => import('./pages/admin/Analytics'));
const ClientAccountOpening = React.lazy(() => import('./pages/admin/ClientAccountOpening'));
const ManageUsers = React.lazy(() => import('./pages/admin/ManageUsers'));
const ManagePasswordResets = React.lazy(() => import('./pages/admin/ManagePasswordResets'));
const ManageAccounts = React.lazy(() => import('./pages/admin/ManageAccounts'));
const ManageTransactions = React.lazy(() => import('./pages/admin/ManageTransactions'));
const ManageDeposits = React.lazy(() => import('./pages/admin/ManageDeposits'));
const ManageWithdrawals = React.lazy(() => import('./pages/admin/ManageWithdrawals'));
const ManageCountries = React.lazy(() => import('./pages/admin/ManageCountries'));
const ManageFAQs = React.lazy(() => import('./pages/admin/ManageFAQs'));
const ManageSupportRequests = React.lazy(() => import('./pages/admin/ManageSupportRequests'));
const SystemSettings = React.lazy(() => import('./pages/admin/SystemSettings'));
const ComplianceCenter = React.lazy(() => import('./pages/admin/ComplianceCenter'));
const AdminNotifications = React.lazy(() => import('./pages/admin/AdminNotifications'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
  </div>
);

// Protected Route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Redirect based on the required role for proper separation
    if (requiredRole && (requiredRole === UserRole.ADMIN || requiredRole === UserRole.SUPER_ADMIN)) {
      return <Navigate to="/admin-access" replace />;
    } else {
      // For client routes, redirect to client login
      return <Navigate to="/client-login" replace />;
    }
  }

  if (requiredRole) {
    // Check role hierarchy: SUPER_ADMIN can access ADMIN routes, ADMIN can access ADMIN routes
    // Also handle case-insensitive role matching for backward compatibility
    const userRole = user.role?.toLowerCase();
    const reqRole = requiredRole.toLowerCase();
    
    const hasAccess = 
      userRole === reqRole || 
      user.role === requiredRole ||
      (reqRole === UserRole.ADMIN && (userRole === UserRole.SUPER_ADMIN || user.role === UserRole.SUPER_ADMIN));
    
    if (!hasAccess) {
      return <Navigate to={user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN ? '/admin' : '/dashboard'} replace />;
    }
  }

  return <>{children}</>;
};

// Public Route wrapper (redirects to dashboard if authenticated)
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    // Route based on user role (handle both uppercase and lowercase roles)
    const userRole = user.role?.toLowerCase();
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN || 
        user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AdminAccessRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    const userRole = user.role?.toLowerCase();
    if (
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN
    ) {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
};

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
        {/* Public routes */}
        {/* Old login removed - using admin-access and client-login instead */}
        <Route
          path="/client-login"
          element={
            <PublicRoute>
              <ClientLoginPage />
            </PublicRoute>
          }
        />
        {/* Signup disabled - accounts created by admin only */}
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/password-reset"
          element={
            <PublicRoute>
              <PasswordResetActionPage />
            </PublicRoute>
          }
        />
        <Route
          path="/admin-access"
          element={
            <AdminAccessRoute>
              <AdminAccessPage />
            </AdminAccessRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ChangePasswordPage />
          }
        />

        {/* Client routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <AccountOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <TransactionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deposit"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <DepositFunds />
            </ProtectedRoute>
          }
        />
        <Route
          path="/withdraw"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <WithdrawFunds />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <TransferFunds />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ewallets"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <EWalletManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <ReportsAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statements"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <Statements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute requiredRole={UserRole.CLIENT}>
              <HelpSupport />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/client-onboarding"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ClientAccountOpening />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/password-resets"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManagePasswordResets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/deposits"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageDeposits />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/withdrawals"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageWithdrawals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageSupportRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faqs"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageFAQs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/countries"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ManageCountries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <AdminNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/compliance"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ComplianceCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredRole={UserRole.SUPER_ADMIN}>
              <SystemSettings />
            </ProtectedRoute>
          }
        />

        {/* Default redirect to client login - primary user entrance */}
        <Route path="/" element={<Navigate to="/client-login" replace />} />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/client-login" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SystemConfigProvider>
            <AppContent />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </SystemConfigProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
