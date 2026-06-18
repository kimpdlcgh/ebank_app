import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Download, ArrowUpRight, ArrowDownLeft,
  ChevronLeft, ChevronRight, X, RefreshCw, AlertCircle
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 10;

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer: 'Transfer',
  payment: 'Payment',
  credit: 'Credit',
  debit: 'Debit',
};

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  review: 'bg-blue-100 text-blue-700',
};

const isCredit = (t: any) =>
  t.type === 'deposit' || t.type === 'credit' ||
  (t.amount > 0 && t.type !== 'withdrawal' && t.type !== 'debit');

const fmt = (val: any) => {
  if (!val) return '—';
  if (val?.toDate) return val.toDate();
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') return new Date(val);
  return null;
};

const fmtDate = (val: any) => {
  const d = fmt(val);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtTime = (val: any) => {
  const d = fmt(val);
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const fmtCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(amount || 0));

const TransactionHistory: React.FC = () => {
  const { user } = useAuth();
  const [allTxns, setAllTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);

  // Real-time Firestore listener — scoped strictly to current user
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    setError('');

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const txns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllTxns(txns);
        setLoading(false);
      },
      (err) => {
        console.error('Transaction fetch error:', err);
        setError('Unable to load transactions. Please try again.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Filter & search
  const filtered = useMemo(() => {
    const now = Date.now();
    const days = parseInt(dateRange, 10);
    const cutoff = isNaN(days) ? 0 : now - days * 86400000;

    return allTxns.filter((t) => {
      const d = fmt(t.createdAt);
      if (cutoff && d && d.getTime() < cutoff) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.description?.toLowerCase().includes(q) ||
          t.reference?.toLowerCase().includes(q) ||
          t.type?.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
      }
      return true;
    });
  }, [allTxns, search, typeFilter, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, typeFilter, statusFilter, dateRange]);

  // CSV export — real data, scoped to filtered results
  const exportCSV = () => {
    if (filtered.length === 0) { toast.error('No transactions to export'); return; }
    const header = ['Date', 'Time', 'Description', 'Type', 'Amount', 'Status', 'Reference'];
    const rows = filtered.map((t) => [
      fmtDate(t.createdAt),
      fmtTime(t.createdAt),
      `"${t.description || ''}"`,
      t.type || '',
      (isCredit(t) ? '' : '-') + Math.abs(t.amount || 0).toFixed(2),
      t.status || '',
      t.reference || t.id || '',
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} transactions`);
  };

  // Monthly totals for summary bar
  const { income, expenses } = useMemo(() => {
    const now = new Date();
    const monthTxns = allTxns.filter((t) => {
      const d = fmt(t.createdAt);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      income: monthTxns.filter(isCredit).reduce((s, t) => s + Math.abs(t.amount || 0), 0),
      expenses: monthTxns.filter((t) => !isCredit(t)).reduce((s, t) => s + Math.abs(t.amount || 0), 0),
    };
  }, [allTxns]);

  return (
    <DashboardLayout title="Transaction History" subtitle="All your account movements in one place">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'This Month Income', value: fmtCurrency(income), color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
            { label: 'This Month Expenses', value: fmtCurrency(expenses), color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
            { label: 'Net', value: fmtCurrency(income - expenses), color: income >= expenses ? 'text-green-600' : 'text-red-500', bg: 'bg-white border-gray-100' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border p-4 ${bg}`}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search description, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
              <option value="payment">Payment</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="review">Under Review</option>
            </select>

            {/* Date range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
              <option value="0">All time</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Transaction list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-400">
              <AlertCircle className="w-8 h-8 mb-3" />
              <p className="text-sm">{error}</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="font-medium text-gray-600 mb-1">No transactions found</p>
              <p className="text-sm text-center max-w-xs">
                {allTxns.length === 0
                  ? 'Your transaction history will appear here once you start making transfers, deposits, or withdrawals.'
                  : 'Try adjusting your filters to see more results.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {paginated.map((txn) => {
                const credit = isCredit(txn);
                return (
                  <button
                    key={txn.id}
                    onClick={() => setSelectedTxn(txn)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${credit ? 'bg-green-100' : 'bg-red-50'}`}>
                      {credit
                        ? <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        : <ArrowUpRight className="w-5 h-5 text-red-400" />}
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {txn.description || TYPE_LABELS[txn.type] || 'Transaction'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>{fmtDate(txn.createdAt)}</span>
                        {fmtTime(txn.createdAt) && <><span>·</span><span>{fmtTime(txn.createdAt)}</span></>}
                        {txn.reference && <><span>·</span><span className="font-mono">{txn.reference}</span></>}
                      </div>
                    </div>

                    {/* Type badge */}
                    <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                      {TYPE_LABELS[txn.type] || txn.type || 'Transaction'}
                    </span>

                    {/* Status */}
                    <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[txn.status] || 'bg-gray-100 text-gray-600'}`}>
                      {txn.status || 'completed'}
                    </span>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold ${credit ? 'text-green-600' : 'text-gray-900'}`}>
                        {credit ? '+' : '-'}{fmtCurrency(txn.amount)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-400">
                Page {currentPage} of {totalPages} · {filtered.length} transactions
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-white text-gray-600'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTxn(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                <button onClick={() => setSelectedTxn(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Amount */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${isCredit(selectedTxn) ? 'bg-green-100' : 'bg-red-50'}`}>
                  {isCredit(selectedTxn)
                    ? <ArrowDownLeft className="w-8 h-8 text-green-600" />
                    : <ArrowUpRight className="w-8 h-8 text-red-400" />}
                </div>
                <p className={`text-3xl font-bold ${isCredit(selectedTxn) ? 'text-green-600' : 'text-gray-900'}`}>
                  {isCredit(selectedTxn) ? '+' : '-'}{fmtCurrency(selectedTxn.amount)}
                </p>
                <p className="text-gray-500 mt-1 text-sm">{selectedTxn.description || TYPE_LABELS[selectedTxn.type] || 'Transaction'}</p>
                <span className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[selectedTxn.status] || 'bg-gray-100 text-gray-600'}`}>
                  {selectedTxn.status || 'completed'}
                </span>
              </div>

              {/* Details grid */}
              <div className="space-y-3 border-t pt-4">
                {[
                  ['Date', fmtDate(selectedTxn.createdAt)],
                  ['Time', fmtTime(selectedTxn.createdAt)],
                  ['Type', TYPE_LABELS[selectedTxn.type] || selectedTxn.type || '—'],
                  ['Reference', selectedTxn.reference || selectedTxn.id || '—'],
                  selectedTxn.fromAccountId && ['From Account', selectedTxn.fromAccountId],
                  selectedTxn.toAccountId && ['To Account', selectedTxn.toAccountId],
                  selectedTxn.currency && ['Currency', selectedTxn.currency],
                ].filter(Boolean).map(([label, value]: any) => (
                  <div key={label} className="flex justify-between items-start">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-medium text-gray-900 text-right max-w-[60%] break-all font-mono">{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedTxn(null)}
                className="w-full mt-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TransactionHistory;
