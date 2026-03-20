import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Send, 
  Plus, 
  Download, 
  Bell,
  Settings,
  LogOut,
  Home,
  History,
  Wallet,
  User,
  Menu,
  X,
  ChevronRight,
  Shield,
  PieChart,
  FileText,
  HelpCircle
} from 'lucide-react';
import LogoDisplay from '../ui/LogoDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { useUserAccounts } from '../../hooks/useFirestore';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';

// Sidebar navigation items
const navigationItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: Home, 
    path: '/dashboard',
    description: 'Overview'
  },
  { 
    id: 'accounts', 
    label: 'Account Details', 
    icon: CreditCard, 
    path: '/account',
    description: 'View account information'
  },
  { 
    id: 'transactions', 
    label: 'Transaction History', 
    icon: History, 
    path: '/transactions',
    description: 'View all transactions'
  },
  { 
    id: 'transfer', 
    label: 'Transfer Money', 
    icon: Send, 
    path: '/transfer',
    description: 'Send funds'
  },
  { 
    id: 'deposit', 
    label: 'Deposit Funds', 
    icon: Plus, 
    path: '/deposit',
    description: 'Add money'
  },
  { 
    id: 'withdraw', 
    label: 'Withdraw Funds', 
    icon: Download, 
    path: '/withdraw',
    description: 'Cash out'
  },
  { 
    id: 'ewallets', 
    label: 'E-Wallets', 
    icon: Wallet, 
    path: '/ewallets',
    description: 'Digital wallets'
  },
  { 
    id: 'profile', 
    label: 'Profile Settings', 
    icon: User, 
    path: '/profile',
    description: 'Manage account'
  },
  { 
    id: 'reports', 
    label: 'Reports & Analytics', 
    icon: PieChart, 
    path: '/reports',
    description: 'Financial insights'
  },
  { 
    id: 'statements', 
    label: 'Statements', 
    icon: FileText, 
    path: '/statements',
    description: 'Account statements'
  },
  { 
    id: 'help', 
    label: 'Help & Support', 
    icon: HelpCircle, 
    path: '/help',
    description: 'Get assistance'
  }
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, subtitle }) => {
  const { user } = useAuth();
  const { config, loading: configLoading, getPrimaryLogo, getCompanyName } = useSystemConfigContext();
  const { data: userAccounts } = useUserAccounts(user?.uid || '');
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAccountFullyActive = (account: any) => {
    const status = String(account?.status ?? (account?.isActive ? 'active' : 'inactive')).toLowerCase();
    if (status === 'inactive' || status === 'pending' || status === 'pending_approval') {
      return false;
    }
    if (account?.isActive === false) {
      return false;
    }
    return status === 'active' || account?.isActive === true;
  };

  const hasActiveAccount = (userAccounts || []).some((account: any) => isAccountFullyActive(account));

  const showActivationRequiredNotice = () => {
    toast.error('Activate your account to enable this function');
  };

  const handleSignOut = async () => {
    try {
      // Clear any cached data and sign out
      localStorage.clear(); // Clear any cached client data
      await signOut(auth);
      toast.success('Signed out successfully');
      
      // Redirect to client login page
      navigate('/client-login', { replace: true });
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Client logout error:', error);
      
      // Still redirect even if there was an error
      navigate('/client-login', { replace: true });
    }
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-80 z-50 bg-white shadow-xl fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out lg:fixed lg:inset-y-0 lg:left-0 lg:top-0 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header - Enhanced Logo */}
          <div className="flex items-center justify-between px-6 py-8 border-b bg-white shadow-sm">
            <div className="flex items-center w-full">
              <div className="w-full max-w-xs">
                {!configLoading ? (
                  <LogoDisplay 
                    logoUrl={getPrimaryLogo()} 
                    companyName=""
                    fallbackIcon={<Shield className="w-16 h-16 text-blue-600" />}
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
              className="lg:hidden p-2 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to="/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-blue-700 transition-colors"
                  title="Back to dashboard"
                >
                  {user?.email?.split('@')[0] || 'User'}
                  <Home className="w-3.5 h-3.5" />
                </Link>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <Link
                  to="/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  className="mt-1 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path;
              const isMoneyAction = item.id === 'transfer' || item.id === 'deposit' || item.id === 'withdraw';
              const isDisabled = isMoneyAction && !hasActiveAccount;

              if (isDisabled) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={showActivationRequiredNotice}
                    className="group flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl text-gray-400 bg-gray-50 cursor-not-allowed"
                    title="Available once your account is fully active"
                  >
                    <IconComponent className="mr-3 h-5 w-5 text-gray-400" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span>{item.label}</span>
                        <Shield className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Account activation required</p>
                    </div>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <IconComponent className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-gray-500 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="space-y-2">
              <button className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors">
                <PieChart className="mr-3 h-4 w-4" />
                Reports & Analytics
              </button>
              <button className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors">
                <FileText className="mr-3 h-4 w-4" />
                Statements
              </button>
            </div>
          </div>

          {/* Footer - Always visible */}
          <div className="mt-auto px-4 py-4 border-t border-gray-100 bg-white">
            <div className="space-y-2">
              <Link
                to="/help"
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
              >
                <HelpCircle className="mr-3 h-4 w-4" />
                Help & Support
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-80">
        {/* Top Header - Sticky/Floating */}
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Menu className="w-6 h-6" />
                </button>
                {title && (
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;