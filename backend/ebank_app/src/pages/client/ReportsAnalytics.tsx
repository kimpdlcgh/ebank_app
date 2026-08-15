import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, PieChart, Repeat } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useInstruments, useUserOrders, useUserPositions } from '../../hooks/useFirestore';
import { BrokerageOrder, Instrument, Position } from '../../types';

const assetClassLabels: Record<string, string> = {
  stock: 'Stocks',
  bond: 'Bonds',
  etf: 'ETFs',
  commodity: 'Commodities',
  crypto: 'Crypto',
};

const barColors: Record<string, string> = {
  stock: 'bg-blue-600',
  bond: 'bg-emerald-600',
  etf: 'bg-violet-600',
  commodity: 'bg-amber-500',
  crypto: 'bg-rose-500',
};

const toMillis = (value: any): number => {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const ResearchPage: React.FC = () => {
  const { user } = useAuth();
  const { data: positionsRaw, loading: positionsLoading } = useUserPositions(user?.uid || '');
  const { data: ordersRaw, loading: ordersLoading } = useUserOrders(user?.uid || '');
  const { data: instrumentsRaw, loading: instrumentsLoading } = useInstruments();

  const positions = positionsRaw as unknown as Position[];
  const orders = ordersRaw as unknown as BrokerageOrder[];
  const instruments = instrumentsRaw as unknown as Instrument[];

  const allocation = useMemo(() => {
    const totals = new Map<string, number>();
    let grandTotal = 0;
    positions.forEach((position) => {
      const value = position.marketValue || 0;
      totals.set(position.assetClass, (totals.get(position.assetClass) || 0) + value);
      grandTotal += value;
    });
    return {
      grandTotal,
      breakdown: Array.from(totals.entries())
        .map(([assetClass, value]) => ({
          assetClass,
          value,
          percent: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value),
    };
  }, [positions]);

  const movers = useMemo(() => {
    const tradable = instruments.filter((instrument) => typeof instrument.dayChangePercent === 'number');
    const sorted = [...tradable].sort((a, b) => b.dayChangePercent - a.dayChangePercent);
    return {
      gainers: sorted.slice(0, 3),
      losers: sorted.slice(-3).reverse(),
    };
  }, [instruments]);

  const activitySummary = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentFilled = orders.filter(
      (order) => order.status === 'filled' && toMillis(order.createdAt) >= cutoff
    );
    const buys = recentFilled.filter((order) => order.side === 'buy').length;
    const sells = recentFilled.filter((order) => order.side === 'sell').length;
    return { total: recentFilled.length, buys, sells };
  }, [orders]);

  const loading = positionsLoading || ordersLoading || instrumentsLoading;

  return (
    <DashboardLayout title="Research" subtitle="Portfolio composition, market movers, and your recent trading activity">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <PieChart className="h-5 w-5 text-blue-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Allocation</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">How your holdings are split across asset classes, based on current market value.</p>
          </Card>
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <BarChart3 className="h-5 w-5 text-blue-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Today&apos;s movers</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">The biggest gainers and decliners across all tradable instruments today. Not personalized advice.</p>
          </Card>
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <Repeat className="h-5 w-5 text-blue-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Your activity</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">A summary of your filled trades over the last 30 days.</p>
          </Card>
        </section>

        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Allocation breakdown</h2>
            <p className="mt-1 text-sm text-slate-500">Your holdings grouped by asset class</p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : allocation.breakdown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-900">No holdings yet</p>
              <p className="mt-2 text-sm text-slate-500">Once you open a position, your allocation will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allocation.breakdown.map((item) => (
                <div key={item.assetClass}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{assetClassLabels[item.assetClass] || item.assetClass}</span>
                    <span className="text-slate-500">
                      {formatCurrency(item.value)} · {item.percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${barColors[item.assetClass] || 'bg-slate-500'}`}
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-2 border-t border-slate-100 pt-3 text-sm text-slate-500">
                Total portfolio market value: <span className="font-semibold text-slate-900">{formatCurrency(allocation.grandTotal)}</span>
              </div>
            </div>
          )}
        </Card>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Top gainers today</h2>
            </div>
            {instrumentsLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : movers.gainers.length === 0 ? (
              <p className="text-sm text-slate-500">No instrument data available.</p>
            ) : (
              <ul className="space-y-3">
                {movers.gainers.map((instrument) => (
                  <li key={instrument.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{instrument.symbol}</p>
                      <p className="text-xs text-slate-500">{instrument.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      +{instrument.dayChangePercent.toFixed(2)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-rose-600" />
              <h2 className="text-lg font-semibold text-slate-900">Top decliners today</h2>
            </div>
            {instrumentsLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : movers.losers.length === 0 ? (
              <p className="text-sm text-slate-500">No instrument data available.</p>
            ) : (
              <ul className="space-y-3">
                {movers.losers.map((instrument) => (
                  <li key={instrument.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{instrument.symbol}</p>
                      <p className="text-xs text-slate-500">{instrument.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-rose-600">
                      {instrument.dayChangePercent.toFixed(2)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Your trading activity (last 30 days)</h2>
            <p className="mt-1 text-sm text-slate-500">Filled orders only</p>
          </div>

          {ordersLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : activitySummary.total === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-900">No trades in the last 30 days</p>
              <p className="mt-2 text-sm text-slate-500">Filled orders will be summarized here once you start trading.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-center">
                <p className="text-2xl font-semibold text-slate-900">{activitySummary.total}</p>
                <p className="mt-1 text-sm text-slate-500">Total filled trades</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-center">
                <p className="text-2xl font-semibold text-emerald-600">{activitySummary.buys}</p>
                <p className="mt-1 text-sm text-slate-500">Buys</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-center">
                <p className="text-2xl font-semibold text-rose-600">{activitySummary.sells}</p>
                <p className="mt-1 text-sm text-slate-500">Sells</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ResearchPage;
