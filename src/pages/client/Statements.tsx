import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  FileText, Download, Eye, Calendar, Search, ChevronDown, RefreshCw, X
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const isCredit = (t: any) =>
  t.type === 'deposit' || t.type === 'credit' ||
  (t.amount > 0 && t.type !== 'withdrawal' && t.type !== 'debit');

interface Statement {
  id: string;
  period: string;
  month: number;
  year: number;
  type: 'Monthly';
  income: number;
  expenses: number;
  net: number;
  txnCount: number;
  transactions: any[];
}

interface PreviewState {
  statement: Statement | null;
}

const Statements: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [preview, setPreview] = useState<PreviewState>({ statement: null });

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

  // Generate monthly statements from real transaction data
  const statements: Statement[] = useMemo(() => {
    const map: Record<string, any[]> = {};
    transactions.forEach((t) => {
      const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map[key]) map[key] = [];
      map[key].push({ ...t, _date: d });
    });
    return Object.entries(map)
      .map(([key, txns]) => {
        const [year, month] = key.split('-').map(Number);
        const income = txns.filter(isCredit).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
        const expenses = txns.filter((t) => !isCredit(t)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
        return {
          id: key,
          period: `${MONTH_NAMES[month]} ${year}`,
          month,
          year,
          type: 'Monthly' as const,
          income,
          expenses,
          net: income - expenses,
          txnCount: txns.length,
          transactions: txns,
        };
      })
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [transactions]);

  const availableYears = useMemo(() => {
    const years = new Set(statements.map((s) => s.year.toString()));
    if (years.size === 0) years.add(new Date().getFullYear().toString());
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [statements]);

  const filtered = useMemo(() =>
    statements.filter((s) => {
      if (s.year.toString() !== selectedYear) return false;
      if (searchTerm && !s.period.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    }),
    [statements, selectedYear, searchTerm]
  );

  const downloadCSV = (stmt: Statement) => {
    const header = ['Date', 'Time', 'Description', 'Type', 'Amount', 'Status'];
    const rows = stmt.transactions.map((t) => {
      const d = t._date || (t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0));
      return [
        isNaN(d.getTime()) ? '' : d.toLocaleDateString(),
        isNaN(d.getTime()) ? '' : d.toLocaleTimeString(),
        `"${t.description || t.type || ''}"`,
        t.type || '',
        (isCredit(t) ? '' : '-') + Math.abs(t.amount || 0).toFixed(2),
        t.status || 'completed',
      ];
    });
    const summary = [
      [],
      ['SUMMARY'],
      [`Period,${stmt.period}`],
      [`Total Income,${stmt.income.toFixed(2)}`],
      [`Total Expenses,${stmt.expenses.toFixed(2)}`],
      [`Net,${stmt.net.toFixed(2)}`],
    ].map((r) => (Array.isArray(r) ? r.join(',') : r));
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n') + '\n' + summary.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${stmt.year}-${String(stmt.month + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Statement for ${stmt.period} downloaded`);
  };

  return (
    <DashboardLayout title="Statements" subtitle="Download and view your account statements">
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Statements</h3>
              <p className="text-sm text-gray-600">Statements are automatically generated from your transaction history.</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex items-center"
                onClick={() => {
                  if (filtered.length > 0) {
                    filtered.forEach((s) => downloadCSV(s));
                  } else {
                    toast.error('No statements for the selected year');
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download All ({selectedYear})
              </Button>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by month..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </Card>

        {/* Statements List */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Available Statements
            </h3>
            <p className="text-sm text-gray-600 mt-1">{filtered.length} statement{filtered.length !== 1 ? 's' : ''} for {selectedYear}</p>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">Loading statements...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Statements for {selectedYear}</h4>
                <p className="text-gray-500 text-sm">
                  {statements.length === 0
                    ? 'Statements are generated automatically once you have transaction activity.'
                    : 'Try selecting a different year.'}
                </p>
              </div>
            ) : (
              filtered.map((statement) => (
                <div key={statement.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">{statement.type} Statement</h4>
                        <p className="text-sm text-gray-600 mb-2">{statement.period}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span>{statement.txnCount} transaction{statement.txnCount !== 1 ? 's' : ''}</span>
                          <span className="text-green-600 font-medium">Income: {fmt(statement.income)}</span>
                          <span className="text-red-500 font-medium">Expenses: {fmt(statement.expenses)}</span>
                          <span className={`font-medium ${statement.net >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>Net: {fmt(statement.net)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreview({ statement })}
                        className="flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadCSV(statement)}
                        className="flex items-center"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Statement Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statement Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">What's Included</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Account balance information</li>
                <li>• All transactions for the period</li>
                <li>• Income and expense totals</li>
                <li>• Transfer and payment history</li>
                <li>• Account summary and net</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Download Format</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• CSV format compatible with Excel and Google Sheets</li>
                <li>• Includes full transaction detail</li>
                <li>• Summary totals at the end of each file</li>
                <li>• Sorted newest-first within each month</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
            <p className="text-sm text-blue-700">
              If you need older statements or have questions, please contact customer support via the Help & Support section.
            </p>
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      {preview.statement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreview({ statement: null })}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold">{preview.statement.period} Statement</h3>
                <p className="text-sm text-gray-500">{preview.statement.txnCount} transactions</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadCSV(preview.statement!)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
                <button onClick={() => setPreview({ statement: null })} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="px-6 py-4 bg-gray-50 grid grid-cols-3 gap-4 border-b">
              {[
                { label: 'Income', value: fmt(preview.statement.income), color: 'text-green-600' },
                { label: 'Expenses', value: fmt(preview.statement.expenses), color: 'text-red-500' },
                { label: 'Net', value: fmt(preview.statement.net), color: preview.statement.net >= 0 ? 'text-blue-600' : 'text-orange-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-base font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Transactions */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-2 text-xs text-gray-500 font-medium">Date</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Description</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Type</th>
                    <th className="text-right px-6 py-2 text-xs text-gray-500 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.statement.transactions.map((t) => {
                    const d = t._date || (t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0));
                    const credit = isCredit(t);
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                          {isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-gray-900 max-w-[180px] truncate">
                          {t.description || t.type || 'Transaction'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{t.type || '—'}</td>
                        <td className={`px-6 py-3 text-right font-medium ${credit ? 'text-green-600' : 'text-gray-900'}`}>
                          {credit ? '+' : '-'}{fmt(Math.abs(t.amount || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Statements;
