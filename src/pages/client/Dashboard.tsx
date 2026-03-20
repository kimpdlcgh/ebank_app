import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Eye, 
  EyeOff,
  Plus,
  Send,
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
  FileText,
  HelpCircle,
  Star,
  Zap,
  Lock,
  Globe,
  Smartphone,
  CreditCard as CardIcon,
  ArrowRight,
  BarChart3,
  Sparkles
} from 'lucide-react';
import LogoDisplay from '../../components/ui/LogoDisplay';
import SecuritySettings from '../../components/modals/SecuritySettings';

import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';
import ContactSupportModal from '../../components/modals/ContactSupportModal';

const mockTransactions: any[] = [];

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
  }
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { config, loading: configLoading, getPrimaryLogo, getCompanyName } = useSystemConfigContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);

  const getAccountStatus = (account: any) => {
    return String(account?.status ?? (account?.isActive ? 'active' : 'inactive')).toLowerCase();
  };

  const isAccountFullyActive = (account: any) => {
    const status = getAccountStatus(account);
    if (status === 'inactive' || status === 'pending' || status === 'pending_approval') {
      return false;
    }
    if (account?.isActive === false) {
      return false;
    }
    return status === 'active' || account?.isActive === true;
  };

  // Load real account data from Firestore with real-time updates
  useEffect(() => {
    if (!user) return;

    let unsubscribe: () => void;

    const setupRealtimeAccounts = async () => {
      try {
        setIsLoadingAccounts(true);
        console.log('Dashboard: Setting up real-time account monitoring for user:', user.uid);
        
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        
        // Create query for ALL accounts (not just active ones) so we can see status changes
        const accountsQuery = query(
          collection(db, 'accounts'),
          where('userId', '==', user.uid)
        );
        
        // Set up real-time listener
        unsubscribe = onSnapshot(accountsQuery, (snapshot) => {
          console.log('Dashboard: 🔄 Account data changed, updating...');
          
          if (!snapshot.empty) {
            const userAccounts = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              // Format display fields for compatibility
              type: doc.data().accountType || 'checking',
              primary: true // Mark first account as primary for now
            }));
            
            console.log('Dashboard: ✅ Real-time Firestore accounts updated:', userAccounts);
            setAccounts(userAccounts);

            // Keep the current selection if it still exists; otherwise fall back to first account.
            setSelectedAccount((prevSelected: any) => {
              if (!userAccounts.length) {
                return null;
              }

              if (prevSelected?.id) {
                const updatedSelected = userAccounts.find(acc => acc.id === prevSelected.id);
                if (updatedSelected) {
                  console.log('Dashboard: 📝 Selected account updated:', updatedSelected);
                  return updatedSelected;
                }
              }

              return userAccounts[0];
            });
          } else {
            console.log('Dashboard: ❌ No accounts found for user - contact support needed');
            setAccounts([]);
            setSelectedAccount(null);
          }
          
          setIsLoadingAccounts(false);
        }, (error) => {
          console.error('Dashboard: Real-time listener error:', error);
          setIsLoadingAccounts(false);
          setAccounts([]);
          setSelectedAccount(null);
        });
        
      } catch (error) {
        console.error('Dashboard: Error setting up real-time accounts:', error);
        setIsLoadingAccounts(false);
      }
    };

    setupRealtimeAccounts();
    
    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        console.log('Dashboard: Cleaning up real-time account listener');
        unsubscribe();
      }
    };
  }, [user?.uid]); // Only depend on user ID to avoid unnecessary re-subscriptions

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalBalance = accounts.reduce((sum: number, account: any) => sum + (account?.balance || 0), 0);
  const hasActiveAccount = accounts.some((account: any) => isAccountFullyActive(account));
  const selectedAccountCanTransact = hasActiveAccount;

  const showActivationRequiredNotice = () => {
    toast.error('Activate your account to enable this function');
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
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:fixed lg:inset-y-0 lg:left-0 lg:top-0 lg:h-screen lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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

          {/* User Profile Section */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isMoneyAction = item.id === 'transfer' || item.id === 'deposit' || item.id === 'withdraw';
              const isDisabled = isMoneyAction && !selectedAccountCanTransact;
              
              if (isDisabled) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={showActivationRequiredNotice}
                    className="group flex w-full items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed"
                    title="Available once your account is fully active"
                  >
                    <Icon className="mr-4 w-5 h-5 text-gray-400" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-400">Account activation required</div>
                    </div>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-4 w-5 h-5 transition-colors ${
                    isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-blue-700'
                  }`} />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    isActive ? 'text-blue-700 rotate-90' : 'text-gray-400 group-hover:text-blue-700'
                  }`} />
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer - Always visible */}
          <div className="mt-auto px-4 py-4 border-t bg-gray-50">
            <div className="space-y-2">
              <Link 
                to="/help" 
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HelpCircle className="mr-4 w-5 h-5 text-gray-500" />
                <span>Help & Support</span>
              </Link>
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                  <LogOut className="mr-4 w-5 h-5" />
                  <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-80">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Dashboard Overview</h1>
                  <p className="text-sm text-gray-500">Welcome back, {user?.firstName}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">Last login</p>
                  <p className="text-xs text-gray-500">Today, 2:30 PM</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 sm:p-5 lg:p-6 space-y-5">
          {/* Account Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Portfolio Value</p>
                  <div className="flex items-center space-x-3 mt-2">
                    {balanceVisible ? (
                      <span className="text-3xl font-bold">{formatCurrency(totalBalance)}</span>
                    ) : (
                      <span className="text-3xl font-bold">••••••••</span>
                    )}
                    <button
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors"
                    >
                      {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-green-300 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +2.4%
                  </div>
                  <p className="text-blue-100 text-xs">vs last month</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {selectedAccountCanTransact ? (
                  <Link
                    to="/deposit"
                    className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                  >
                    <Plus className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Deposit</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={showActivationRequiredNotice}
                    className="bg-blue-800 bg-opacity-40 rounded-lg p-3 text-center cursor-not-allowed"
                    title="Available once your account is fully active"
                  >
                    <Lock className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">Deposit</span>
                  </button>
                )}
                {selectedAccountCanTransact ? (
                  <Link
                    to="/withdraw"
                    className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                  >
                    <Download className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Withdraw</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={showActivationRequiredNotice}
                    className="bg-blue-800 bg-opacity-40 rounded-lg p-3 text-center cursor-not-allowed"
                    title="Available once your account is fully active"
                  >
                    <Lock className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">Withdraw</span>
                  </button>
                )}
                {selectedAccountCanTransact ? (
                  <Link
                    to="/transfer"
                    className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                  >
                    <Send className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Transfer</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={showActivationRequiredNotice}
                    className="bg-blue-800 bg-opacity-40 rounded-lg p-3 text-center cursor-not-allowed"
                    title="Available once your account is fully active"
                  >
                    <Lock className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">Transfer</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSecuritySettings(true)}
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <Shield className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Security</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/transactions"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <History className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">History</span>
                </Link>
                <Link
                  to="/profile"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <User className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Profile</span>
                </Link>
              </div>
            </div>

            {/* Account Cards - Enhanced Modern Design */}
            {isLoadingAccounts ? (
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 text-left shadow-sm">
                <div className="relative">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-slate-700 mb-3"></div>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Loading Accounts</h3>
                <p className="text-gray-600">Fetching your latest account information...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-50 via-white to-gray-50 rounded-xl p-6 border border-dashed border-slate-300 text-left relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Welcome to Banking</h3>
                  <p className="text-sm text-gray-600 mb-4 max-w-lg">Get started by opening your first account. Our team will help you choose the right account structure for your needs.</p>
                  <button 
                    onClick={() => setIsContactModalOpen(true)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors duration-200 font-medium"
                  >
                    Open Your First Account
                  </button>
                </div>
              </div>
            ) : (
              accounts.map((account: any) => (
              <div
                key={account.id}
                className={`group relative bg-white rounded-xl p-5 transition-all duration-200 cursor-pointer ${
                  selectedAccount?.id === account.id
                    ? 'ring-2 ring-slate-700 shadow-md border-0'
                    : 'border border-gray-200 hover:border-slate-300 hover:shadow-md'
                }`}
                onClick={() => setSelectedAccount(account)}
              >
                {/* Gradient Background Overlay */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${
                  account.accountType === 'savings' 
                    ? 'from-gray-50 to-slate-50' 
                    : account.accountType === 'checking'
                    ? 'from-slate-50 to-gray-50'
                    : 'from-gray-50 to-zinc-50'
                } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3 pr-10">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        account.accountType === 'savings' 
                          ? 'bg-gradient-to-br from-slate-700 to-slate-900' 
                          : account.accountType === 'checking'
                          ? 'bg-gradient-to-br from-slate-700 to-slate-900'
                          : 'bg-gradient-to-br from-slate-700 to-slate-900'
                      }`}>
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 capitalize truncate text-lg">
                            {account.accountName || `${account.accountType || account.type} Account`}
                          </h3>
                          {account.primary && (
                            <div className="inline-flex flex-shrink-0 items-center bg-slate-800 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                              <Star className="w-3 h-3 mr-1" />
                              Primary
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-gray-600 font-mono">
                            {balanceVisible ? account.accountNumber : `••••-••••-••••-${account.accountNumber?.slice(-4) || '••••'}`}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBalanceVisible(!balanceVisible);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-md transition-all"
                          >
                            {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Balance Section */}
                  <div className="mb-6">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1 min-w-0">
                      <p className="min-w-0 max-w-full text-[clamp(1.3rem,4.2vw,1.9rem)] leading-tight font-bold tracking-tight text-gray-900 whitespace-nowrap">
                        {balanceVisible ? formatCurrency(account.balance || 0) : '••••••••'}
                      </p>
                      <div className={`inline-flex items-center text-sm font-medium whitespace-nowrap basis-full sm:basis-auto ${
                        account.balance > 0 ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>Available</span>
                      </div>
                    </div>
                    <p className="text-gray-500">Current Balance</p>
                  </div>
                  
                  {/* Account Status & Type */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                        account.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          account.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></div>
                        {account.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Account Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{account.accountType || account.type}</p>
                    </div>
                  </div>
                  
                  {/* Account Features */}
                  {account.features && Object.keys(account.features).length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Active Features</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(account.features)
                          .filter(([, enabled]) => enabled)
                          .slice(0, 4)
                          .map(([feature]) => {
                            const featureName = feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            const getFeatureIcon = (f: string) => {
                              if (f.includes('online')) return <Globe className="w-4 h-4" />;
                              if (f.includes('mobile')) return <Smartphone className="w-4 h-4" />;
                              if (f.includes('card')) return <CardIcon className="w-4 h-4" />;
                              if (f.includes('transfer')) return <Send className="w-4 h-4" />;
                              return <Zap className="w-4 h-4" />;
                            };
                            
                            return (
                              <div 
                                key={feature}
                                className="flex items-center space-x-2 bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-xs"
                              >
                                <div className="text-blue-600">
                                  {getFeatureIcon(feature)}
                                </div>
                                <span className="text-gray-700 font-medium truncate">
                                  {featureName}
                                </span>
                              </div>
                            );
                          })
                        }
                      </div>
                      {Object.entries(account.features).filter(([, enabled]) => enabled).length > 4 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          +{Object.entries(account.features).filter(([, enabled]) => enabled).length - 4} more features
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Routing Number */}
                  {account.routingNumber && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Routing Number</p>
                          <p className="font-mono text-sm font-medium text-gray-900">
                            {balanceVisible ? account.routingNumber : '•••••••••'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Opened</p>
                          <p className="text-sm font-medium text-gray-700">
                            {account.createdAt ? 
                              new Date(account.createdAt.toDate ? account.createdAt.toDate() : account.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Selection Indicator */}
                {selectedAccount?.id === account.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              ))
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Recent Transactions - Enhanced */}
            <div className="xl:col-span-7">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                      <History className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
                      <p className="text-xs text-gray-500">Latest transaction movements</p>
                    </div>
                  </div>
                  <Link
                    to="/transactions"
                    className="group flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {mockTransactions.length === 0 ? (
                    <div className="text-left py-6 px-4 relative overflow-hidden border border-gray-100 rounded-xl bg-gradient-to-br from-slate-50 via-white to-gray-50">
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                          <History className="w-6 h-6 text-slate-500" />
                        </div>
                        <h4 className="text-base font-semibold text-gray-900 mb-1">No Transactions Yet</h4>
                        <p className="text-sm text-gray-600 mb-4 max-w-xl">Your recent operations will appear here once you start transferring, depositing, or withdrawing funds.</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedAccountCanTransact ? (
                            <>
                              <Link
                                to="/transfer"
                                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                              >
                                Transfer Money
                              </Link>
                              <Link
                                to="/deposit"
                                className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                              >
                                Make Deposit
                              </Link>
                            </>
                          ) : (
                            <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">
                              <Lock className="w-4 h-4 mr-2" />
                              Transfers and funding unlock after account activation
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    mockTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="group flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-200 border border-gray-100 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl shadow-sm ${
                          transaction.amount > 0 
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' 
                            : 'bg-gradient-to-br from-red-500 to-pink-600 text-white'
                        }`}>
                          {transaction.amount > 0 ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {transaction.description}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">{transaction.category}</span>
                            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                            <span className="text-sm text-gray-500">{transaction.date}</span>
                            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                            <span className="text-xs text-gray-400 capitalize px-2 py-0.5 bg-gray-100 rounded-md">
                              {transaction.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${
                          transaction.amount > 0 ? 'text-emerald-600' : 'text-gray-900'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </p>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                          transaction.amount > 0 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {transaction.amount > 0 ? 'Credit' : 'Debit'}
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="xl:col-span-5 space-y-4">
              {/* Account Details - Enhanced Modern Design */}
              {selectedAccount && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 opacity-5 ${
                    selectedAccount.accountType === 'savings' 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                      : selectedAccount.accountType === 'checking'
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      : 'bg-gradient-to-br from-purple-500 to-pink-600'
                  }`}></div>
                  
                  {/* Header */}
                  <div className="relative z-10 flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${
                        selectedAccount.accountType === 'savings' 
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                          : selectedAccount.accountType === 'checking'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-br from-purple-500 to-pink-600'
                      }`}>
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Account Overview</h3>
                        <p className="text-xs text-gray-500">Selected account snapshot</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Information Grid */}
                  <div className="relative z-10 space-y-3">
                    {/* Account Holder & Balance Row */}
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Holder</p>
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                      </div>
                    </div>
                    
                    {/* Balance Display */}
                    <div className={`rounded-lg p-3 bg-gradient-to-br ${
                      selectedAccount.accountType === 'savings' 
                        ? 'from-emerald-50 to-teal-50 border border-emerald-200' 
                        : selectedAccount.accountType === 'checking'
                        ? 'from-blue-50 to-indigo-50 border border-blue-200'
                        : 'from-purple-50 to-pink-50 border border-purple-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Current Balance</p>
                        <button
                          onClick={() => setBalanceVisible(!balanceVisible)}
                          className="text-gray-500 hover:text-gray-700 p-1 hover:bg-white hover:bg-opacity-50 rounded-md transition-all"
                        >
                          {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {balanceVisible ? formatCurrency(selectedAccount.balance || 0) : '••••••••'}
                      </p>
                      <div className={`flex items-center mt-2 text-sm font-medium ${
                        selectedAccount.balance > 0 ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Available
                      </div>
                    </div>
                    
                    {/* Account Numbers Grid */}
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Number</p>
                          <button
                            onClick={() => setBalanceVisible(!balanceVisible)}
                            className="text-gray-400 hover:text-gray-600 p-0.5 hover:bg-gray-100 rounded transition-all"
                          >
                            {balanceVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                        <p className="font-mono text-sm font-bold text-gray-900">
                          {balanceVisible 
                            ? selectedAccount.accountNumber 
                            : `••••-••••-••••-${selectedAccount.accountNumber?.slice(-4) || '••••'}`
                          }
                        </p>
                      </div>
                      
                      {selectedAccount.routingNumber && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Routing Number</p>
                          <p className="font-mono text-sm font-bold text-gray-900">
                            {balanceVisible ? selectedAccount.routingNumber : '•••••••••'}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Account Type & Status */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</p>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-gray-900 capitalize">{selectedAccount.accountType || selectedAccount.type}</p>
                          {selectedAccount.primary && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
                        <span className={`inline-flex items-center text-xs font-bold ${
                          selectedAccount.status === 'active' 
                            ? 'text-emerald-700' 
                            : 'text-red-700'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-1.5 ${
                            selectedAccount.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}></div>
                          {selectedAccount.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Active Features - Compact Grid */}
                    {selectedAccount.features && Object.keys(selectedAccount.features).some(key => selectedAccount.features[key]) && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Active Features</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedAccount.features)
                            .filter(([, enabled]) => enabled)
                            .slice(0, 4)
                            .map(([feature]) => {
                              const featureName = feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                              const getFeatureIcon = (f: string) => {
                                if (f.includes('online')) return <Globe className="w-3 h-3" />;
                                if (f.includes('mobile')) return <Smartphone className="w-3 h-3" />;
                                if (f.includes('card')) return <CreditCard className="w-3 h-3" />;
                                if (f.includes('transfer')) return <Send className="w-3 h-3" />;
                                return <Zap className="w-3 h-3" />;
                              };
                              
                              return (
                                <div 
                                  key={feature}
                                  className="inline-flex items-center space-x-1.5 bg-white border border-gray-200 rounded-full px-2.5 py-1 text-xs"
                                >
                                  <div className="text-blue-600 flex-shrink-0">
                                    {getFeatureIcon(feature)}
                                  </div>
                                  <span className="text-gray-700 font-medium truncate">
                                    {featureName.length > 11 ? featureName.substring(0, 11) + '...' : featureName}
                                  </span>
                                </div>
                              );
                            })
                          }
                        </div>
                        {Object.entries(selectedAccount.features).filter(([, enabled]) => enabled).length > 4 && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            +{Object.entries(selectedAccount.features).filter(([, enabled]) => enabled).length - 4} more
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Footer Information */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Account opened</p>
                        <p className="text-sm font-bold text-gray-900">
                          {selectedAccount.createdAt ? 
                            new Date(selectedAccount.createdAt.toDate ? selectedAccount.createdAt.toDate() : selectedAccount.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500">Last updated</p>
                        <p className="text-sm font-bold text-gray-900">Today</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Summary - Enhanced */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Monthly Overview</h3>
                      <p className="text-xs text-gray-500">
                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-100 rounded-xl p-3 bg-gradient-to-br from-slate-50 via-white to-gray-50">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white border border-gray-100 rounded-lg p-2.5">
                      <p className="text-[11px] text-gray-500">Income</p>
                      <p className="text-sm font-semibold text-gray-900">$0.00</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-2.5">
                      <p className="text-[11px] text-gray-500">Expenses</p>
                      <p className="text-sm font-semibold text-gray-900">$0.00</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-2.5">
                      <p className="text-[11px] text-gray-500">Net</p>
                      <p className="text-sm font-semibold text-emerald-600">$0.00</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-3">
                    <div className="h-full w-0 bg-slate-700"></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => navigate('/transfer')}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                    >
                      Transfer
                    </button>
                    <button
                      onClick={() => navigate('/deposit')}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                    >
                      Deposit
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Links - Enhanced */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
                    <p className="text-xs text-gray-500">Frequently used tools</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                  <Link
                    to="/account"
                    className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-all duration-200 border border-gray-100 hover:border-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-100 group-hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors">
                        <FileText className="w-4 h-4 text-slate-700" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">Account Statement</span>
                        <p className="text-xs text-gray-500">Download statements</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
                  </Link>
                  
                  <Link
                    to="/ewallets"
                    className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-all duration-200 border border-gray-100 hover:border-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-100 group-hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors">
                        <Wallet className="w-4 h-4 text-slate-700" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">Digital Wallets</span>
                        <p className="text-xs text-gray-500">Manage e-wallets</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
                  </Link>
                  
                  <button
                    onClick={() => setShowSecuritySettings(true)}
                    className="group w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-all duration-200 border border-gray-100 hover:border-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-100 group-hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors">
                        <Lock className="w-4 h-4 text-slate-700" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium text-gray-900">Security Settings</span>
                        <p className="text-xs text-gray-500">Manage account security</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>

              {/* Security Notice - Enhanced */}
              <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 rounded-2xl border-2 border-amber-200 p-6 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200 rounded-full -translate-y-10 translate-x-10 opacity-30"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-200 rounded-full translate-y-8 -translate-x-8 opacity-40"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-bold text-amber-900">Security Status</h4>
                        <div className="flex items-center bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></div>
                          Protected
                        </div>
                      </div>
                      <p className="text-sm text-amber-800 leading-relaxed mb-4">
                        Your account is protected with enterprise-grade security including 2FA, encryption, and fraud monitoring.
                      </p>
                    </div>
                  </div>
                  
                  {/* Security Features Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-900">2FA Enabled</span>
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-900">Encrypted</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Last scan: Today</p>
                      <p className="text-xs text-amber-600">Next scan: Tomorrow</p>
                    </div>
                    <button 
                      onClick={() => setShowSecuritySettings(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      Review Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Contact Support Modal */}
        <ContactSupportModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          defaultSubject="Request to Open a New Bank Account"
          defaultCategory="account_opening"
        />

        {/* Security Settings Modal */}
        {showSecuritySettings && (
          <SecuritySettings
            onClose={() => setShowSecuritySettings(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;