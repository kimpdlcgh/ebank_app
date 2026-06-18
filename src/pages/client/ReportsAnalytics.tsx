import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import {
  BarChart3, PieChart, TrendingUp, Download,
  Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Target, RefreshCw
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const CATEGORY_COLORS: Record<string, string> = {
  deposit: 'bg-green-500',
  withdrawal: 'bg-red-500',
  transfer: 'bg-blue-500',
  payment: 'bg-yellow-500',
  credit: 'bg-emerald-500',
  debit: 'bg-orange-500',
  other: 'bg-gray-400',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isCredit = (t: any) =>
  t.type === 'deposit' || t.type === 'credit' ||
  (t.amount > 0 && t.type !== 'withdrawal' && t.type !== 'debit');

const ReportsAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'accounts'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [user?.uid]);

  const now = new Date();

  const thisMonthTxns = useMemo(() => transactions.filter((t) => {
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [transactions]);

  const lastMonthTxns = useMemo(() => transactions.filter((t) => {
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }), [transactions]);

  const monthlyIncome = useMemo(() => thisMonthTxns.filter(isCredit).reduce((s, t) => s + Math.abs(t.amount || 0), 0), [thisMonthTxns]);
  const monthlyExpenses = useMemo(() => thisMonthTxns.filter((t) => !isCredit(t)).reduce((s, t) => s + Math.abs(t.amount || 0), 0), [thisMonthTxns]);
  const lastMonthIncome = useMemo(() => lastMonthTxns.filter(isCredit).reduce((s, t) => s + Math.abs(t.amount || 0), 0), [lastMonthTxns]);
  const lastMonthExpenses = useMemo(() => lastMonthTxns.filter((t) => !isCredit(t)).reduce((s, t) => s + Math.abs(t.amount || 0), 0), [lastMonthTxns]);

  const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
  const netWorth = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  const incomePctChange = lastMonthIncome > 0 ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
  const expPctChange = lastMonthExpenses > 0 ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;

  // Spending by type
  const spendingByType = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthTxns.filter((t) => !isCredit(t)).forEach((t) => {
      const key = t.type || 'other';
      map[key] = (map[key] || 0) + Math.abs(t.amount || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([type, amount]) => ({ type, amount, percentage: pct(amount, total) }));
  }, [thisMonthTxns]);

  // Last 6 months trends
  const monthlyTrends = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = MONTH_NAMES[d.getMonth()];
      const year = d.getFullYear();
      const txns = transactions.filter((t) => {
        const td = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      const income = txns.filter(isCredit).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const expenses = txns.filter((t) => !isCredit(t)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      return { label: `${month} ${year}`, income, expenses, savings: income - expenses };
    });
  }, [transactions]);

  // CSV export for current month
  const exportCSV = () => {
    if (transactions.length === 0) { toast.error('No data to export'); return; }
    const header = ['Date', 'Type', 'Amount', 'Status', 'Description'];
    const rows = transactions.map((t) => {
      const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
      return [
        isNaN(d.getTime()) ? '' : d.toLocaleDateString(),
        t.type || '',
        (isCredit(t) ? '' : '-') + Math.abs(t.amount || 0).toFixed(2),
        t.status || '',
        `"${t.description || ''}"`,
      ];
    });
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  return (
    <DashboardLayout title="Reports & Analytics" subtitle="View your financial insights and spending patterns">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mr-3" />
            <span>Loading your data...</span>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Income</p>
                    <p className="text-2xl font-bold text-green-600">{fmt(monthlyIncome)}</p>
                    <p className={`text-xs flex items-center mt-1 ${incomePctChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {incomePctChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                      {lastMonthIncome > 0 ? `${incomePctChange >= 0 ? '+' : ''}${incomePctChange.toFixed(1)}% vs last month` : 'No prior month data'}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                    <p className="text-2xl font-bold text-red-600">{fmt(monthlyExpenses)}</p>
                    <p className={`text-xs flex items-center mt-1 ${expPctChange <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {expPctChange <= 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                      {lastMonthExpenses > 0 ? `${expPctChange >= 0 ? '+' : ''}${expPctChange.toFixed(1)}% vs last month` : 'No prior month data'}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Savings Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{savingsRate}%</p>
                    <p className={`text-xs flex items-center mt-1 ${savingsRate >= 20 ? 'text-blue-500' : 'text-orange-500'}`}>
                      <Target className="w-3 h-3 mr-1" />
                      {savingsRate >= 20 ? 'Above 20% target' : 'Below 20% target'}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <PieChart className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-900">{fmt(netWorth)}</p>
                    <p className="text-xs text-gray-500 mt-1">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Reports Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spending by type */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Spending Analysis</h3>
                  <button onClick={exportCSV} className="flex items-center text-sm text-blue-600 hover:text-blue-700">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </button>
                </div>
                {spendingByType.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No spending data for this month.</p>
                ) : (
                  <div className="space-y-4">
                    {spendingByType.map(({ type, amount, percentage }) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[type] || 'bg-gray-400'} mr-3`}></div>
                          <span className="text-sm text-gray-600 capitalize">{type}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${CATEGORY_COLORS[type] || 'bg-gray-400'}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-20 text-right">{fmt(amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Monthly Trends */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
                  <span className="text-xs text-gray-400">Last 6 months</span>
                </div>
                <div className="space-y-4">
                  {monthlyTrends.map((item) => (
                    <div key={item.label} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">{item.label}</span>
                        <span className={`text-sm font-medium ${item.savings >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(item.savings)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>Income: {fmt(item.income)}</div>
                        <div>Expenses: {fmt(item.expenses)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Available Reports */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'Transaction CSV', description: 'Download all transactions as CSV', icon: Calendar, action: 'Download', onClick: exportCSV },
                  { title: 'Monthly Summary', description: 'Income vs. expenses this month', icon: BarChart3, action: 'Coming Soon', onClick: undefined },
                  { title: 'Spending Report', description: 'Category-wise expense breakdown', icon: PieChart, action: 'Coming Soon', onClick: undefined },
                  { title: 'Cash Flow Analysis', description: 'Money in vs money out', icon: DollarSign, action: 'Coming Soon', onClick: undefined },
                  { title: 'Account Statement', description: 'Detailed account statement', icon: TrendingUp, action: 'View Statements', onClick: () => window.location.hash = '#/statements' },
                  { title: 'Custom Report', description: 'Contact support for custom reports', icon: Target, action: 'Contact Support', onClick: undefined },
                ].map((report) => (
                  <div key={report.title} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <report.icon className="h-6 w-6 text-blue-600" />
                      <button
                        onClick={report.onClick}
                        disabled={!report.onClick}
                        className={`text-xs font-medium ${report.onClick ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 cursor-not-allowed'}`}
                      >
                        {report.action}
                      </button>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{report.title}</h4>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsAnalytics;
