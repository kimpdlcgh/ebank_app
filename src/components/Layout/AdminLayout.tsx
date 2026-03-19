import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  Activity, 
  BarChart3,
  Settings,
  LogOut,
  Home,
  Menu,
  X,
  ChevronRight,
  Shield,
  Search,
  Plus,
  UserPlus,
  Download,
  MessageSquare,
  HelpCircle,
  Globe,
  Key,
  Bell
} from 'lucide-react';
import LogoDisplay from '../ui/LogoDisplay';
import NotificationCenter from '../admin/NotificationCenter';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { UserRole } from '../../types';
import { AdminPermissionKey, hasAdminPermission } from '../../utils/permissionUtils';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';

// Admin navigation items
const adminNavigationItems: Array<{
  id: string;
  label: string;
  icon: any;
  path: string;
  description: string;
  permission?: AdminPermissionKey;
}> = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: Home, 
    path: '/admin',
    description: 'System overview'
  },
  { 
    id: 'client-onboarding', 
    label: 'Open Client Account', 
    icon: UserPlus, 
    path: '/admin/client-onboarding',
    description: 'International client onboarding',
    permission: 'canManageAccounts'
  },
  { 
    id: 'users', 
    label: 'Admin Users', 
    icon: Users, 
    path: '/admin/users',
    description: 'Manage administrative users',
    permission: 'canManageUsers'
  },
  { 
    id: 'password-resets', 
    label: 'Password Resets', 
    icon: Key, 
    path: '/admin/password-resets',
    description: 'Manage password reset requests',
    permission: 'canManageUsers'
  },
  { 
    id: 'accounts', 
    label: 'Account Management', 
    icon: CreditCard, 
    path: '/admin/accounts',
    description: 'Manage accounts',
    permission: 'canManageAccounts'
  },
  { 
    id: 'transactions', 
    label: 'Transactions', 
    icon: Activity, 
    path: '/admin/transactions',
    description: 'View all transactions',
    permission: 'canManageTransactions'
  },
  { 
    id: 'deposits', 
    label: 'Deposit Requests', 
    icon: Plus, 
    path: '/admin/deposits',
    description: 'Manage deposits',
    permission: 'canManageTransactions'
  },
  { 
    id: 'withdrawals', 
    label: 'Withdrawal Requests', 
    icon: Download, 
    path: '/admin/withdrawals',
    description: 'Manage withdrawals',
    permission: 'canManageTransactions'
  },
  { 
    id: 'support', 
    label: 'Support Requests', 
    icon: MessageSquare, 
    path: '/admin/support',
    description: 'Manage customer support',
    permission: 'canViewReports'
  },
  { 
    id: 'faqs', 
    label: 'Manage FAQs', 
    icon: HelpCircle, 
    path: '/admin/faqs',
    description: 'Manage help articles',
    permission: 'canManageSettings'
  },
  { 
    id: 'countries', 
    label: 'Manage Countries', 
    icon: Globe, 
    path: '/admin/countries',
    description: 'Manage country selections',
    permission: 'canManageSettings'
  },
  { 
    id: 'analytics', 
    label: 'Analytics & Reports', 
    icon: BarChart3, 
    path: '/admin/analytics',
    description: 'System analytics',
    permission: 'canViewReports'
  },
  { 
    id: 'notifications', 
    label: 'Notifications', 
    icon: Bell, 
    path: '/admin/notifications',
    description: 'System alerts',
    permission: 'canViewReports'
  },
  { 
    id: 'compliance', 
    label: 'KYC & AML', 
    icon: Shield, 
    path: '/admin/compliance',
    description: 'Compliance review',
    permission: 'canViewReports'
  },
  { 
    id: 'settings', 
    label: 'System Settings', 
    icon: Settings, 
    path: '/admin/settings',
    description: 'System configuration',
    permission: 'canManageSettings'
  }
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle }) => {
  const { user } = useAuth();
  const { config, loading: configLoading, getPrimaryLogo, getCompanyName } = useSystemConfigContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const matchedNavItem = adminNavigationItems.find(item =>
    location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
  );
  const hasPageAccess = !matchedNavItem?.permission || hasAdminPermission(user, matchedNavItem.permission);
  const userSecurity = (user as any)?.security;
  const requiresMfa = Boolean(user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) && userSecurity?.twoFactorEnabled);
  const isMfaVerified = typeof window !== 'undefined' && window.sessionStorage.getItem('adminMfaVerified') === 'true';
  const hasMfaAccess = !requiresMfa || isMfaVerified;

  const handleSignOut = async () => {
    try {
      // Clear any cached data and sign out
      localStorage.clear(); // Clear any cached data
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('adminMfaVerified');
      }
      await signOut(auth);
      toast.success('Successfully signed out');
      
      // Redirect to admin access page
      navigate('/admin-access', { replace: true });
    } catch (error) {
      toast.error('Error signing out');
      console.error('Sign out error:', error);
      
      // Still redirect even if there was an error
      navigate('/admin-access', { replace: true });
    }
  };

  const isActivePage = (path: string) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path !== '/admin' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Show loading screen while SystemConfig is loading
  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        {/* Sidebar Header - Enhanced Logo */}
        <div className="flex items-center justify-between h-24 px-4 bg-white shadow-sm border-b">
          <div className="flex items-center w-full">
            <div className="w-full max-w-xs">
              {!configLoading ? (
                <LogoDisplay 
                  logoUrl={getPrimaryLogo()} 
                  companyName=""
                  fallbackIcon={<Shield className="h-16 w-16 text-red-600" />}
                  className="w-full h-20 object-contain"
                />
              ) : (
                <div className="w-full h-20 flex items-center justify-center">
                  <img 
                    src="/frbr_logo.png?v=20260319"
                    alt="Logo"
                    className="w-full h-20 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-600 hover:bg-gray-100 p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Admin Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">System Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {adminNavigationItems.filter(item => {
            if (item.id === 'settings' && user?.role !== UserRole.SUPER_ADMIN) {
              return false;
            }
            return !item.permission || hasAdminPermission(user, item.permission);
          }).map((item) => {
            const isActive = isActivePage(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-red-100 text-red-700 border-r-2 border-red-500'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-red-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="space-y-2">
            <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="mr-3 h-4 w-4 text-gray-400" />
              System Settings
            </button>
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="ml-4 lg:ml-0">
                {title && (
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                    {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Notifications */}
              <NotificationCenter />

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {!hasMfaAccess ? (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 m-6">
              <h2 className="text-lg font-semibold text-slate-900">Two-factor verification required</h2>
              <p className="text-sm text-slate-600 mt-2">
                Your admin account requires MFA verification before accessing the console.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate('/admin-access')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Verify now
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : hasPageAccess ? (
            children
          ) : (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 m-6">
              <h2 className="text-lg font-semibold text-slate-900">Access restricted</h2>
              <p className="text-sm text-slate-600 mt-2">
                You don’t have permission to access this section. Please contact a super admin.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Back to dashboard
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;