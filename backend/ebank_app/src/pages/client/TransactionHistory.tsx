import React, { useMemo, useState } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useUserTransactions } from '../../hooks/useFirestore';
import { Transaction } from '../../types';

const typeFilters: { label: string; value: string }[] = [
  { label: 'All activity', value: 'all' },
  { label: 'Deposit', value: 'deposit' },
  { label: 'Withdrawal', value: 'withdrawal' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Payment', value: 'payment' },
  { label: 'Trade Buy', value: 'trade_buy' },
  { label: 'Trade Sell', value: 'trade_sell' },
];

const typeLabels: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer: 'Transfer',
  payment: 'Payment',
  trade_buy: 'Trade Buy',
  trade_sell: 'Trade Sell',
};

const formatTimestamp = (value: any): string => {
  if (!value) return '—';
  if (value?.toDate) return value.toDate().toLocaleString();
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }
  return '—';
};

const formatAmount = (amount: number, currency: string) => {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${Math.abs(amount).toLocaleString('en-US', { style: 'currency', currency: currency || 'USD' })}`;
};

const ActivityPage: React.FC = () => {
  const { user } = useAuth();
  const { data: transactionsRaw, loading } = useUserTransactions(user?.uid || '');
  const transactions = transactionsRaw as unknown as Transaction[];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTime = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime();
      const bTime = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime();
      return (bTime || 0) - (aTime || 0);
    });
  }, [transactions]);

  const filteredActivity = useMemo(() => {
    return sortedTransactions.filter((item) => {
      const haystack = `${item.description || ''} ${item.reference || ''}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || item.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [sortedTransactions, searchTerm, selectedType]);

  const handleExport = () => {
    const header = ['Date', 'Type', 'Description', 'Amount', 'Status'];
    const rows = filteredActivity.map((item) => [
      formatTimestamp(item.createdAt),
      typeLabels[item.type] || item.type,
      (item.description || '').replace(/"/g, '""'),
      item.amount.toString(),
      item.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const exportFileDefaultName = `activity_export_${new Date().toISOString().split('T')[0]}.csv`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success('Ledger exported');
  };

  return (
    <DashboardLayout title="Activity" subtitle="Cash ledger, executions, income events, and operational fees">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search activity"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="relative min-w-52">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedType}
                  onChange={(event) => setSelectedType(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
                >
                  {typeFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={filteredActivity.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export ledger
            </button>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent account activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'Loading…' : `${filteredActivity.length} item(s) match your current filters`}
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-slate-500">Loading activity…</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredActivity.map((item) => (
                <div key={item.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {typeLabels[item.type] || item.type}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-slate-400">{formatTimestamp(item.createdAt)}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          item.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'failed' || item.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-slate-900">{item.description || 'Transaction'}</p>
                    <p className="text-sm text-slate-500">Ref: {item.reference || item.id}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className={`text-lg font-semibold ${item.amount > 0 ? 'text-emerald-600' : item.amount < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {formatAmount(item.amount, item.currency)}
                    </p>
                    <p className="text-sm text-slate-500">Booked to brokerage cash ledger</p>
                  </div>
                </div>
              ))}

              {filteredActivity.length === 0 && sortedTransactions.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-base font-medium text-slate-900">No activity yet</p>
                  <p className="mt-2 text-sm text-slate-500">Once you make a deposit, withdrawal, or trade, it will show up here.</p>
                </div>
              )}

              {filteredActivity.length === 0 && sortedTransactions.length > 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-base font-medium text-slate-900">No matching activity</p>
                  <p className="mt-2 text-sm text-slate-500">Try broadening your filters or search phrase.</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityPage;
