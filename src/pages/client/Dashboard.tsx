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
            
            // Update selected account if it was modified
            if (selectedAccount) {
              const updatedSelected = userAccounts.find(acc => acc.id === selectedAccount.id);
              if (updatedSelected) {
                console.log('Dashboard: 📝 Selected account updated:', updatedSelected);
                setSelectedAccount(updatedSelected);
              }
            } else if (userAccounts.length > 0) {
              setSelectedAccount(userAccounts[0]);
            }
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
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
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
                      src="/sglogo.png"
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
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

          {/* Sidebar Footer */}
          <div className="px-4 py-4 border-t bg-gray-50">
            <div className="space-y-2">
              <Link 
                to="/dashboard/help" 
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
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
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
        <main className="p-6 space-y-6">
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
                <Link
                  to="/deposit"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <Plus className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Deposit</span>
                </Link>
                <Link
                  to="/withdraw"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <Download className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Withdraw</span>
                </Link>
                <Link
                  to="/transfer"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <Send className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Transfer</span>
                </Link>
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
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 text-center shadow-sm">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600 mx-auto mb-4"></div>
                  <div className="absolute inset-0 rounded-full bg-blue-50 opacity-20 animate-pulse"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Accounts</h3>
                <p className="text-gray-600">Fetching your latest account information...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl p-8 border-2 border-dashed border-blue-200 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-100 rounded-full translate-y-12 -translate-x-12 opacity-30"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to Banking</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">Get started by opening your first account. Our team will help you choose the perfect account type.</p>
                  <button 
                    onClick={() => setIsContactModalOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold"
                  >
                    Open Your First Account
                  </button>
                </div>
              </div>
            ) : (
              accounts.map((account: any) => (
              <div
                key={account.id}
                className={`group relative bg-white rounded-2xl p-6 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                  selectedAccount?.id === account.id
                    ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-500/20 border-0'
                    : 'border border-gray-200 hover:border-blue-300 hover:shadow-xl'
                }`}
                onClick={() => setSelectedAccount(account)}
              >
                {/* Gradient Background Overlay */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${
                  account.accountType === 'savings' 
                    ? 'from-emerald-50 to-teal-50' 
                    : account.accountType === 'checking'
                    ? 'from-blue-50 to-indigo-50'
                    : 'from-purple-50 to-pink-50'
                } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                        account.accountType === 'savings' 
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                          : account.accountType === 'checking'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-br from-purple-500 to-pink-600'
                      }`}>
                        <CreditCard className="w-7 h-7 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-bold text-gray-900 capitalize truncate text-lg">
                            {account.accountName || `${account.accountType || account.type} Account`}
                          </h3>
                          {account.primary && (
                            <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                              <Star className="w-3 h-3 mr-1" />
                              Primary
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
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
                    <div className="flex items-baseline space-x-2 mb-1">
                      <p className="text-3xl font-bold text-gray-900">
                        {balanceVisible ? formatCurrency(account.balance || 0) : '••••••••'}
                      </p>
                      <div className={`flex items-center text-sm font-medium ${
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
                      <p className="font-bold text-gray-900 capitalize">{account.accountType || account.type}</p>
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
                                className="flex items-center space-x-2 bg-white bg-opacity-80 border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
                  <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              ))
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Recent Transactions - Enhanced */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <History className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                      <p className="text-sm text-gray-500">Your latest transactions</p>
                    </div>
                  </div>
                  <Link
                    to="/transactions"
                    className="group flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl transition-all duration-200 font-semibold"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {mockTransactions.length === 0 ? (
                    <div className="text-center py-12 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50 rounded-2xl"></div>
                      <div className="relative z-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <History className="w-10 h-10 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Yet</h4>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">Start your financial journey by making your first transaction. Transfer funds, make deposits, or explore our services.</p>
                        <div className="flex items-center justify-center space-x-3">
                          <Link
                            to="/transfer"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                          >
                            Transfer Money
                          </Link>
                          <Link
                            to="/deposit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                          >
                            Make Deposit
                          </Link>
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
            <div className="space-y-6">
              {/* Account Details */}
              {selectedAccount && (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
                    <Shield className="w-5 h-5 text-blue-500" />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Account Holder</p>
                      <p className="text-gray-900">{user?.firstName} {user?.lastName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Account Number</p>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900 font-mono">
                          {balanceVisible 
                            ? selectedAccount.accountNumber 
                            : `****${selectedAccount.accountNumber?.slice(-4) || '****'}`
                          }
                        </p>
                        <button
                          onClick={() => setBalanceVisible(!balanceVisible)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {selectedAccount.routingNumber && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Routing Number</p>
                        <p className="text-gray-900 font-mono">
                          {balanceVisible ? selectedAccount.routingNumber : '•••••••••'}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Account Type</p>
                      <p className="text-gray-900 capitalize">{selectedAccount.accountType || selectedAccount.type}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Current Balance</p>
                      <p className="text-xl font-bold text-gray-900">
                        {balanceVisible ? formatCurrency(selectedAccount.balance || 0) : '••••••••'}
                      </p>
                    </div>
                    
                    {selectedAccount.features && Object.keys(selectedAccount.features).some(key => selectedAccount.features[key]) && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Active Features</p>
                        <div className="space-y-1">
                          {Object.entries(selectedAccount.features)
                            .filter(([_, enabled]) => enabled)
                            .map(([feature, _]) => (
                              <div key={feature} className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-700">
                                  {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Account opened: {selectedAccount.createdAt ? 
                          new Date(selectedAccount.createdAt.toDate ? selectedAccount.createdAt.toDate() : selectedAccount.createdAt).toLocaleDateString() 
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Summary - Enhanced */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Monthly Overview</h3>
                      <p className="text-sm text-gray-500">
                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Empty State */}
                <div className="text-center py-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-transparent to-blue-50 rounded-xl"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Start Your Journey</h4>
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                      Begin making transactions to unlock detailed insights and monthly analytics
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => navigate('/transfer')}
                        className="group bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
                      >
                        <Send className="w-4 h-4 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs">Transfer</span>
                      </button>
                      <button
                        onClick={() => navigate('/deposit')}
                        className="group bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
                      >
                        <Plus className="w-4 h-4 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs">Deposit</span>
                      </button>
                    </div>
                    
                    {/* Placeholder Statistics */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">$0</div>
                        <div className="text-xs text-gray-500">Income</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">$0</div>
                        <div className="text-xs text-gray-500">Expenses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">$0</div>
                        <div className="text-xs text-gray-500">Savings</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links - Enhanced */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                    <p className="text-sm text-gray-500">Frequently used features</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link
                    to="/account"
                    className="group flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-200 border border-gray-100 hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">Account Statement</span>
                        <p className="text-xs text-gray-500">Download statements</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </Link>
                  
                  <Link
                    to="/ewallets"
                    className="group flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 rounded-xl transition-all duration-200 border border-gray-100 hover:border-emerald-200 hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg flex items-center justify-center transition-colors">
                        <Wallet className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">Digital Wallets</span>
                        <p className="text-xs text-gray-500">Manage e-wallets</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </Link>
                  
                  <button
                    onClick={() => setShowSecuritySettings(true)}
                    className="group w-full flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl transition-all duration-200 border border-gray-100 hover:border-purple-200 hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
                        <Lock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors">Security Settings</span>
                        <p className="text-xs text-gray-500">Manage account security</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
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