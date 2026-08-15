import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layers, PieChart, Shield, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPositions } from '../../hooks/useFirestore';
import { Position } from '../../types';
import { cn, formatCurrency } from '../../utils/helpers';

const Portfolio: React.FC = () => {
  const { user } = useAuth();
  const { data, loading } = useUserPositions(user?.uid || '');
  const positions = data as unknown as Position[];

  const totalMarketValue = useMemo(
    () => positions.reduce((sum, position) => sum + (position.marketValue || 0), 0),
    [positions]
  );

  const totalUnrealizedPnL = useMemo(
    () => positions.reduce((sum, position) => sum + (position.unrealizedPnL || 0), 0),
    [positions]
  );

  const distinctAssetClasses = useMemo(
    () => new Set(positions.map((position) => position.assetClass)).size,
    [positions]
  );

  const getAllocation = (position: Position) => {
    if (typeof position.allocationPercent === 'number' && position.allocationPercent > 0) {
      return position.allocationPercent;
    }
    return totalMarketValue > 0 ? (position.marketValue / totalMarketValue) * 100 : 0;
  };

  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0)),
    [positions]
  );

  return (
    <DashboardLayout title="Portfolio" subtitle="Asset allocation, cross-asset exposure, and income-producing positions">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <PieChart className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current holdings</h2>
                <p className="text-sm text-slate-500">Live portfolio view across stocks, bonds, ETFs, commodities, and crypto</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                ))}
              </div>
            ) : sortedPositions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <p className="text-base font-semibold text-slate-900">No holdings yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Your portfolio is empty. Browse the markets to place your first trade.
                </p>
                <Link
                  to="/markets"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Explore markets
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedPositions.map((position) => {
                  const allocation = getAllocation(position);
                  const isPositive = position.unrealizedPnL >= 0;
                  return (
                    <div key={position.id} className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="text-base font-semibold text-slate-900">{position.symbol}</p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{position.assetClass}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{position.name}</p>
                        </div>

                        <div className="grid gap-3 text-sm sm:grid-cols-4 sm:gap-6 lg:text-right">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Quantity</p>
                            <p className="mt-1 font-semibold text-slate-900">{position.quantity}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Last price</p>
                            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(position.lastPrice)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Market value</p>
                            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(position.marketValue)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Unrealized P&amp;L</p>
                            <p className={cn('mt-1 font-semibold', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                              {isPositive ? '+' : ''}
                              {formatCurrency(position.unrealizedPnL)} ({isPositive ? '+' : ''}
                              {position.unrealizedPnLPercent.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                          <span>Allocation</span>
                          <span>{allocation.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.min(allocation, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Portfolio summary</h3>
              </div>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-slate-400" /> Total market value</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totalMarketValue)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="flex items-center gap-2">
                    {totalUnrealizedPnL >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-slate-400" />
                    )}
                    Unrealized P&amp;L
                  </span>
                  <span className={cn('font-semibold', totalUnrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {totalUnrealizedPnL >= 0 ? '+' : ''}
                    {formatCurrency(totalUnrealizedPnL)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="flex items-center gap-2"><Layers className="h-4 w-4 text-slate-400" /> Asset classes held</span>
                  <span className="font-semibold text-slate-900">{distinctAssetClasses}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span>Number of positions</span>
                  <span className="font-semibold text-slate-900">{positions.length}</span>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Risk controls</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Single-position concentration guardrails can be surfaced here next.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Margin utilization and stress testing should be added once live portfolio math is wired in.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Tax-lot aware performance reporting belongs in the next reporting phase.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Portfolio;