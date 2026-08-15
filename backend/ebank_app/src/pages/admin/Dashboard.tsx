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
  BarChart3,
  Tags,
  LineChart,
  ClipboardList,
  UsersRound,
  ScrollText,
  Briefcase
} from 'lucide-react';
import { useFirestore, useAllPositions, useAllOrders, useAuditLogs } from '../../hooks/useFirestore';

const CATEGORY_COLORS = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#dc2626', '#0891b2'];

const Sparkbars: React.FC<{ values: number[]; color: string; height?: number }> = ({ values, color, height = 64 }) => {
  const max = Math.max(1, ...values);
  const barWidth = 100 / values.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {values.map((value, index) => {
        const barHeight = Math.max(1, (value / max) * (height - 4));
        return (
          <rect
            key={index}
            x={index * barWidth + barWidth * 0.15}
            y={height - barHeight}
            width={barWidth * 0.7}
            height={barHeight}
            rx={1.5}
            fill={color}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
};

const CategoryBars: React.FC<{ items: { label: string; value: number }[] }> = ({ items }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-2 text-gray-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
              <span className="capitalize">{item.label}</span>
            </span>
            <span className="font-medium text-gray-900">{item.value}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

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
  const { data: positions } = useAllPositions();
  const { data: orders } = useAllOrders();
  const { data: auditLogs, loading: auditLoading } = useAuditLogs();

  const formatTimestamp = (value: any) => {
    if (!value) return '—';
    if (value?.toDate) return value.toDate().toLocaleString();
    if (typeof value === 'number' || typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
    }
    return '—';
  };

  const toMillis = (value: any): number | null => {
    if (!value) return null;
    if (value?.toDate) return value.toDate().getTime();
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    }
    return null;
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

  const totalAUM = useMemo(() => positions.reduce((sum, p) => sum + (p.marketValue || 0), 0), [positions]);
  const openOrdersCount = useMemo(() => orders.filter((o) => o.status === 'open').length, [orders]);

  const last30Days = useMemo(() => {
    const days: { key: string; label: string; start: number; end: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      days.push({ key: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), start, end });
    }
    return days;
  }, []);

  const signupsTrend = useMemo(() => {
    return last30Days.map((day) => {
      const count = users.filter((user) => {
        const ms = toMillis(user.createdAt);
        return ms !== null && ms >= day.start && ms < day.end;
      }).length;
      return { ...day, value: count };
    });
  }, [users, last30Days]);

  const volumeTrend = useMemo(() => {
    return last30Days.map((day) => {
      const total = transactions
        .filter((txn) => {
          const ms = toMillis(txn.createdAt);
          return ms !== null && ms >= day.start && ms < day.end;
        })
        .reduce((sum, txn) => sum + Math.abs(txn.amount || 0), 0);
      return { ...day, value: total };
    });
  }, [transactions, last30Days]);

  const accountsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    accounts.forEach((account) => {
      const key = account.accountType || 'unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [accounts]);

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

  const recentAuditEntries = useMemo(() => auditLogs.slice(0, 5), [auditLogs]);

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

  const formatAction = (action: string) => action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const quickActions = [
    { label: 'Manage Users', description: 'View and manage admin & client accounts', icon: Users, color: 'blue', path: '/admin/clients', cta: 'Go to Clients' },
    { label: 'Transactions', description: 'Monitor all transactions', icon: Activity, color: 'green', path: '/admin/transactions', cta: 'View Transactions' },
    { label: 'Analytics', description: 'View detailed reports', icon: BarChart3, color: 'purple', path: '/admin/analytics', cta: 'View Analytics' },
    { label: 'Account Categories', description: 'Manage account/product types', icon: Tags, color: 'orange', path: '/admin/categories', cta: 'Manage Categories' },
    { label: 'Instruments', description: 'Manage tradable securities & prices', icon: LineChart, color: 'indigo', path: '/admin/instruments', cta: 'Manage Instruments' },
    { label: 'Brokerage Orders', description: 'Review and fill client trade orders', icon: ClipboardList, color: 'teal', path: '/admin/brokerage-orders', cta: 'View Orders' },
    { label: 'Clients', description: 'Client 360: accounts, holdings, notes', icon: UsersRound, color: 'pink', path: '/admin/clients', cta: 'Browse Clients' },
    { label: 'Audit Log', description: 'Track administrative actions', icon: ScrollText, color: 'slate', path: '/admin/audit-log', cta: 'View Audit Log' },
    { label: 'System Settings', description: 'Configure system settings', icon: Settings, color: 'gray', path: '/admin/settings', cta: 'Open Settings' }
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    teal: 'bg-teal-100 text-teal-600',
    pink: 'bg-pink-100 text-pink-600',
    slate: 'bg-slate-100 text-slate-600',
    gray: 'bg-gray-100 text-gray-600'
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
                <p className="text-sm font-medium text-gray-600">Total AUM</p>
                <p className="text-2xl font-bold text-gray-900">${totalAUM.toLocaleString()}</p>
                <p className="text-xs text-teal-600 flex items-center mt-1">
                  <ClipboardList className="w-3 h-3 mr-1" />
                  {openOrdersCount} open order{openOrdersCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">New signups</h3>
                <p className="text-sm text-gray-500">Last 30 days</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{signupsTrend.reduce((s, d) => s + d.value, 0)}</p>
            </div>
            <Sparkbars values={signupsTrend.map((d) => d.value)} color="#2563eb" />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{signupsTrend[0]?.label}</span>
              <span>{signupsTrend[signupsTrend.length - 1]?.label}</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Transaction volume</h3>
                <p className="text-sm text-gray-500">Last 30 days</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${volumeTrend.reduce((s, d) => s + d.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <Sparkbars values={volumeTrend.map((d) => d.value)} color="#059669" />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{volumeTrend[0]?.label}</span>
              <span>{volumeTrend[volumeTrend.length - 1]?.label}</span>
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

        {/* Accounts by category + Recent admin activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Accounts by category</h3>
            {accountsByCategory.length === 0 ? (
              <div className="text-sm text-gray-500">No accounts yet.</div>
            ) : (
              <CategoryBars items={accountsByCategory} />
            )}
          </Card>

          <Card className="lg:col-span-2">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Recent Admin Activity</h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/audit-log')}>
                View Audit Log
              </Button>
            </div>
            <div className="p-6">
              {auditLoading ? (
                <div className="text-sm text-gray-500">Loading activity...</div>
              ) : recentAuditEntries.length === 0 ? (
                <div className="text-sm text-gray-500">No admin activity recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {recentAuditEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-gray-900 font-medium">{formatAction(entry.action)}</p>
                        <p className="text-xs text-gray-500">
                          {entry.actorEmail || 'System'}{entry.targetLabel ? ` — ${entry.targetLabel}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{formatTimestamp(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => (
              <Card key={action.path} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(action.path)}>
                <div className="text-center">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 ${colorClasses[action.color]}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{action.label}</h3>
                  <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                  <Button className="w-full" onClick={(e) => { e.stopPropagation(); navigate(action.path); }}>{action.cta}</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
