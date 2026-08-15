import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Search } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useUserOrders, useUserTransactions } from '../../hooks/useFirestore';
import { BrokerageOrder, Transaction } from '../../types';

const periodFilters = ['All', 'Transactions', 'Trade Confirmations'];

const formatTimestamp = (value: any): string => {
  if (!value) return '—';
  if (value?.toDate) return value.toDate().toLocaleString();
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }
  return '—';
};

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

interface PeriodGroup {
  key: string;
  label: string;
  sortValue: number;
  transactions: Transaction[];
  trades: BrokerageOrder[];
  netCashFlow: number;
}

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: transactionsRaw, loading: transactionsLoading } = useUserTransactions(user?.uid || '');
  const { data: ordersRaw, loading: ordersLoading } = useUserOrders(user?.uid || '');

  const transactions = transactionsRaw as unknown as Transaction[];
  const filledOrders = useMemo(
    () => (ordersRaw as unknown as BrokerageOrder[]).filter((order) => order.status === 'filled'),
    [ordersRaw]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [periodType, setPeriodType] = useState('All');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const loading = transactionsLoading || ordersLoading;

  const periods = useMemo(() => {
    const groups = new Map<string, PeriodGroup>();

    const getGroup = (date: Date): PeriodGroup => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          label: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          sortValue: date.getFullYear() * 12 + date.getMonth(),
          transactions: [],
          trades: [],
          netCashFlow: 0,
        };
        groups.set(key, group);
      }
      return group;
    };

    transactions.forEach((txn) => {
      const date = toDate(txn.createdAt);
      if (!date) return;
      const group = getGroup(date);
      group.transactions.push(txn);
      group.netCashFlow += txn.amount || 0;
    });

    filledOrders.forEach((order) => {
      const date = toDate(order.createdAt);
      if (!date) return;
      const group = getGroup(date);
      group.trades.push(order);
    });

    return Array.from(groups.values()).sort((a, b) => b.sortValue - a.sortValue);
  }, [transactions, filledOrders]);

  const filteredPeriods = useMemo(() => {
    return periods.filter((period) => {
      const matchesSearch = period.label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        periodType === 'All' ||
        (periodType === 'Transactions' && period.transactions.length > 0) ||
        (periodType === 'Trade Confirmations' && period.trades.length > 0);
      return matchesSearch && matchesType;
    });
  }, [periods, searchTerm, periodType]);

  const toggleExpanded = (key: string) => {
    setExpandedKey((current) => (current === key ? null : key));
  };

  return (
    <DashboardLayout title="Documents" subtitle="Monthly activity statements and trade confirmations, built from your account history">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by month (e.g. August 2026)"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {periodFilters.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPeriodType(type)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${periodType === type ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Monthly statements</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'Loading…' : `${filteredPeriods.length} period(s) available`}
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-slate-500">Loading your history…</p>
            </div>
          ) : periods.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-base font-medium text-slate-900">No account history yet</p>
              <p className="mt-2 text-sm text-slate-500">Once you have transactions or trades, monthly statements will appear here.</p>
            </div>
          ) : filteredPeriods.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-base font-medium text-slate-900">No matching periods</p>
              <p className="mt-2 text-sm text-slate-500">Try a different search term or filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredPeriods.map((period) => {
                const isExpanded = expandedKey === period.key;
                return (
                  <div key={period.key}>
                    <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-slate-100 p-3">
                          <FileText className="h-5 w-5 text-slate-700" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-900">{period.label} statement</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {period.transactions.length} transaction(s) · {period.trades.length} trade confirmation(s)
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                            Net cash flow:{' '}
                            <span className={period.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {formatCurrency(period.netCashFlow)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Button variant="outline" onClick={() => toggleExpanded(period.key)}>
                          {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                          View
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-6 border-t border-slate-100 bg-slate-50 px-6 py-5">
                        {(periodType === 'All' || periodType === 'Transactions') && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Transactions</h3>
                            {period.transactions.length === 0 ? (
                              <p className="mt-2 text-sm text-slate-500">No transactions this period.</p>
                            ) : (
                              <div className="mt-2 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                  <thead>
                                    <tr className="text-xs uppercase tracking-wide text-slate-400">
                                      <th className="py-2 pr-4">Date</th>
                                      <th className="py-2 pr-4">Type</th>
                                      <th className="py-2 pr-4">Description</th>
                                      <th className="py-2 pr-4">Amount</th>
                                      <th className="py-2 pr-4">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {period.transactions
                                      .slice()
                                      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
                                      .map((txn) => (
                                        <tr key={txn.id}>
                                          <td className="py-2 pr-4 text-slate-500">{formatTimestamp(txn.createdAt)}</td>
                                          <td className="py-2 pr-4 capitalize text-slate-700">{txn.type.replace('_', ' ')}</td>
                                          <td className="py-2 pr-4 text-slate-700">{txn.description || '—'}</td>
                                          <td className={`py-2 pr-4 font-medium ${txn.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(txn.amount)}
                                          </td>
                                          <td className="py-2 pr-4 capitalize text-slate-500">{txn.status}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {(periodType === 'All' || periodType === 'Trade Confirmations') && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Trade confirmations</h3>
                            {period.trades.length === 0 ? (
                              <p className="mt-2 text-sm text-slate-500">No filled trades this period.</p>
                            ) : (
                              <div className="mt-2 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                  <thead>
                                    <tr className="text-xs uppercase tracking-wide text-slate-400">
                                      <th className="py-2 pr-4">Date</th>
                                      <th className="py-2 pr-4">Symbol</th>
                                      <th className="py-2 pr-4">Side</th>
                                      <th className="py-2 pr-4">Quantity</th>
                                      <th className="py-2 pr-4">Est. Value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {period.trades
                                      .slice()
                                      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
                                      .map((order) => (
                                        <tr key={order.id}>
                                          <td className="py-2 pr-4 text-slate-500">{formatTimestamp(order.createdAt)}</td>
                                          <td className="py-2 pr-4 font-medium text-slate-900">{order.symbol}</td>
                                          <td className={`py-2 pr-4 capitalize ${order.side === 'buy' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {order.side}
                                          </td>
                                          <td className="py-2 pr-4 text-slate-700">{order.quantity}</td>
                                          <td className="py-2 pr-4 text-slate-700">{formatCurrency(order.estimatedValue || 0)}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DocumentsPage;
