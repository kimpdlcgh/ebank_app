import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  FileText,
  HelpCircle,
  History,
  Home,
  LogOut,
  Menu,
  PieChart,
  Settings,
  Shield,
  TrendingUp,
  User,
  Wallet,
  X,
  ChevronRight,
} from 'lucide-react';
import LogoDisplay from '../ui/LogoDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/dashboard',
    description: 'Overview'
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: PieChart,
    path: '/portfolio',
    description: 'Holdings and allocation'
  },
  {
    id: 'markets',
    label: 'Markets',
    icon: TrendingUp,
    path: '/markets',
    description: 'Cross-asset watchlist'
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ArrowLeftRight,
    path: '/orders',
    description: 'Trade ticket and open orders'
  },
  {
    id: 'funding',
    label: 'Funding',
    icon: Wallet,
    path: '/funding',
    description: 'Cash and wallet transfers'
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: History,
    path: '/activity',
    description: 'Ledger, dividends, fees'
  },
  {
    id: 'research',
    label: 'Research',
    icon: BarChart3,
    path: '/research',
    description: 'Themes and market insights'
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    path: '/documents',
    description: 'Statements and confirms'
  },
  {
    id: 'profile',
    label: 'Profile Settings',
    icon: User,
    path: '/profile',
    description: 'Security and preferences'
  }
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, subtitle }) => {
  const { user } = useAuth();
  const { loading: configLoading, getPrimaryLogo, getCompanyName } = useSystemConfigContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      localStorage.clear();
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/client-login', { replace: true });
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Client logout error:', error);
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
                      src="/safeguard_logo.png?v=20260321"
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

          <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-semibold">
                {(user?.firstName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email?.split('@')[0] || 'Client'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <p className="mt-1 text-xs font-medium text-slate-600 truncate">{getCompanyName()} Brokerage Client</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path;

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

          <div className="px-4 py-4 border-t border-gray-100">
            <div className="space-y-2">
              <Link
                to="/research"
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
              >
                <BarChart3 className="mr-3 h-4 w-4" />
                Market research
              </Link>
              <Link
                to="/documents"
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
              >
                <FileText className="mr-3 h-4 w-4" />
                Documents
              </Link>
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