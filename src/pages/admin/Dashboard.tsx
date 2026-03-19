import React, { useMemo } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings,
  Shield,
  FileText,
  BarChart3
} from 'lucide-react';
import { useFirestore } from '../../hooks/useFirestore';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: users, loading: usersLoading } = useFirestore('users', (query) => query.orderByField('createdAt', 'desc'));
  const { data: accounts, loading: accountsLoading } = useFirestore('accounts', (query) => query.orderByField('createdAt', 'desc'));
  const { data: transactions } = useFirestore('transactions', (query) => query.orderByField('createdAt', 'desc'));
  const { data: notifications, loading: notificationsLoading } = useFirestore(
    'admin_notifications',
    (query) => query.orderByField('timestamp', 'desc').limitTo(10),
    { realTime: true, cacheEnabled: false }
  );
  const { data: passwordResetRequests } = useFirestore(
    'password_reset_requests',
    (query) => query.orderByField('submittedAt', 'desc').limitTo(10),
    { realTime: true, cacheEnabled: false }
  );

  const formatTimestamp = (value: any) => {
    if (!value) return '—';
    if (value?.toDate) return value.toDate().toLocaleString();
    if (typeof value === 'number' || typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
    }
    return '—';
  };

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.status === 'approved' || user.status === 'active' || user.isActive).length;
    const totalAccounts = accounts.length;
    const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    const pendingTransactions = transactions.filter((txn) => txn.status === 'pending' || txn.status === 'review').length;
    const completedTransactions = transactions.filter((txn) => txn.status === 'completed').length;

    const now = Date.now();
    const monthlyNewUsers = users.filter((user) => {
      const createdAt = user.createdAt?.toDate ? user.createdAt.toDate().getTime() : user.createdAt;
      if (!createdAt) return false;
      return now - createdAt < 30 * 24 * 60 * 60 * 1000;
    }).length;

    const monthlyGrowth = totalUsers > 0 ? Math.round((monthlyNewUsers / totalUsers) * 100) : 0;
    const systemHealth = Math.max(85, 100 - pendingTransactions * 2);

    return {
      totalUsers,
      activeUsers,
      totalAccounts,
      totalBalance,
      pendingTransactions,
      completedTransactions,
      monthlyGrowth,
      systemHealth
    };
  }, [users, accounts, transactions]);

  const recentActivities = useMemo(() => {
    return notifications.map((notification) => {
      const type = notification.type === 'account_created'
        ? 'user_signup'
        : notification.type === 'password_reset'
          ? 'security'
          : notification.type === 'security_alert'
            ? 'security'
            : 'system';

      const status = notification.priority === 'critical'
        ? 'error'
        : notification.priority === 'high'
          ? 'warning'
          : 'info';

      return {
        id: notification.id,
        type,
        status,
        description: `${notification.title} — ${notification.message}`,
        timestamp: formatTimestamp(notification.timestamp)
      };
    });
  }, [notifications]);

  const pendingApprovals = useMemo(() => {
    const pendingAccounts = accounts
      .filter((account) => account.status === 'pending_approval')
      .slice(0, 5)
      .map((account) => ({
        id: account.id,
        type: 'Account Approval',
        priority: 'high',
        user: account.accountName || account.accountHolderName || account.userEmail || 'Unknown client',
        amount: account.balance ? `$${account.balance.toLocaleString()}` : undefined,
        submittedAt: formatTimestamp(account.createdAt),
        action: () => navigate('/admin/accounts')
      }));

    const pendingPasswordResets = passwordResetRequests
      .filter((request) => request.status === 'pending')
      .slice(0, 5)
      .map((request) => ({
        id: request.id,
        type: 'Password Reset Request',
        priority: request.reason === 'account_compromised' || request.reason === 'security_concern' ? 'high' : 'medium',
        user: `${request.firstName} ${request.lastName}`,
        submittedAt: formatTimestamp(request.submittedAt),
        action: () => navigate('/admin/password-resets')
      }));

    return [...pendingAccounts, ...pendingPasswordResets].slice(0, 6);
  }, [accounts, passwordResetRequests, navigate]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return Users;
      case 'transaction': return Activity;
      case 'account': return CreditCard;
      case 'security': return Shield;
      case 'system': return Settings;
      default: return AlertTriangle;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <AdminLayout 
      title="System Dashboard" 
      subtitle="Comprehensive overview of your banking platform"
    >
      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +{stats.monthlyGrowth}% this month
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalBalance.toLocaleString()}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Healthy growth
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts.toLocaleString()}</p>
                <p className="text-xs text-blue-500 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : '0.0'}% active
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-2xl font-bold text-gray-900">{stats.systemHealth}%</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All systems operational
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                {notificationsLoading ? (
                  <div className="text-sm text-gray-500">Loading activity...</div>
                ) : recentActivities.length === 0 ? (
                  <div className="text-sm text-gray-500">No recent activity yet.</div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => {
                      const IconComponent = getActivityIcon(activity.type);
                      return (
                        <div key={activity.id} className="flex items-center space-x-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getActivityColor(activity.status)}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{activity.description}</p>
                            <p className="text-xs text-gray-500">{activity.timestamp}</p>
                          </div>
                          <Button variant="outline" size="sm" className="flex items-center" onClick={() => navigate('/admin/password-resets')}>
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-6">
                  <Button variant="outline" className="w-full" onClick={() => navigate('/admin/password-resets')}>
                    View All Activity
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Pending Approvals */}
          <div>
            <Card className="h-full">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {pendingApprovals.length}
                </span>
              </div>
              <div className="p-6">
                {accountsLoading && usersLoading ? (
                  <div className="text-sm text-gray-500">Loading approvals...</div>
                ) : pendingApprovals.length === 0 ? (
                  <div className="text-sm text-gray-500">No pending approvals.</div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{item.type}</h4>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            item.priority === 'high' ? 'bg-red-100 text-red-800' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">User: {item.user}</p>
                        {'amount' in item && item.amount && (
                          <p className="text-sm text-gray-600 mb-2">Amount: {item.amount}</p>
                        )}
                        <p className="text-xs text-gray-500 mb-3">{item.submittedAt}</p>
                        <div className="flex space-x-2">
                          <Button size="sm" className="flex-1" onClick={item.action}>Review</Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={item.action}>Open</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Manage Users</h3>
              <p className="text-sm text-gray-600 mb-4">View and manage user accounts</p>
              <Button className="w-full" onClick={() => navigate('/admin/users')}>Go to Users</Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Transactions</h3>
              <p className="text-sm text-gray-600 mb-4">Monitor all transactions</p>
              <Button className="w-full" onClick={() => navigate('/admin/transactions')}>View Transactions</Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600 mb-4">View detailed reports</p>
              <Button className="w-full" onClick={() => navigate('/admin/analytics')}>View Analytics</Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">System Settings</h3>
              <p className="text-sm text-gray-600 mb-4">Configure system settings</p>
              <Button className="w-full" onClick={() => navigate('/admin/settings')}>Open Settings</Button>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;