import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  FileText,
  Inbox,
  Loader2,
  PieChart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import {
  useUserAccounts,
  useUserPositions,
  useInstruments,
  useUserWatchlist,
  useUserOrders,
} from '../../hooks/useFirestore';
import { formatCurrency } from '../../utils/helpers';
import type { Account, Position, Instrument, WatchlistItem, BrokerageOrder } from '../../types';

const toneClass: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'text-emerald-600',
  neutral: 'text-slate-500',
  negative: 'text-rose-600',
};

const assetClassLabels: Record<string, string> = {
  stock: 'Stocks',
  bond: 'Bonds',
  etf: 'ETFs',
  commodity: 'Commodities',
  crypto: 'Crypto',
};

const assetClassLabel = (assetClass?: string) =>
  (assetClass && assetClassLabels[assetClass]) ||
  (assetClass ? assetClass.charAt(0).toUpperCase() + assetClass.slice(1) : 'Asset');

const signedPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const signedCurrency = (value: number) => `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;

const SectionLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
    <Loader2 className="h-4 w-4 animate-spin" />
    {label}
  </div>
);

const SectionEmpty: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
    <Inbox className="h-5 w-5 text-slate-400" />
    <p className="text-sm text-slate-500">{message}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const { data: accountsData, loading: accountsLoading } = useUserAccounts(uid);
  const { data: positionsData, loading: positionsLoading } = useUserPositions(uid);
  const { data: instrumentsData, loading: instrumentsLoading } = useInstruments();
  const { data: watchlistData, loading: watchlistLoading } = useUserWatchlist(uid);
  const { data: ordersData, loading: ordersLoading } = useUserOrders(uid);

  const accounts = (accountsData || []) as Account[];
  const positions = (positionsData || []) as Position[];
  const instruments = (instrumentsData || []) as Instrument[];
  const watchlist = (watchlistData || []) as WatchlistItem[];
  const orders = (ordersData || []) as BrokerageOrder[];

  const totalCash = accounts.reduce((sum, account) => sum + (Number(account.balance) || 0), 0);
  const totalPortfolioValue = positions.reduce((sum, position) => sum + (Number(position.marketValue) || 0), 0);
  const openOrders = orders.filter((order) => order.status === 'open');

  // Day's change: derive from matching instrument day-change applied to each position's quantity.
  // Only computed when every held position has a matching, priced instrument — otherwise we
  // show "not available" rather than fabricate a number.
  const instrumentBySymbol = new Map(instruments.map((instrument) => [instrument.symbol, instrument]));
  let dayChangeValue = 0;
  let dayChangeComputable = !instrumentsLoading && positions.length > 0;
  positions.forEach((position) => {
    const instrument = instrumentBySymbol.get(position.symbol);
    if (instrument && typeof instrument.dayChange === 'number') {
      dayChangeValue += instrument.dayChange * (Number(position.quantity) || 0);
    } else {
      dayChangeComputable = false;
    }
  });

  const overviewLoading = accountsLoading || positionsLoading || ordersLoading;

  const topHoldings = [...positions]
    .sort((a, b) => (Number(b.marketValue) || 0) - (Number(a.marketValue) || 0))
    .slice(0, 4);

  const marketPulse = [...instruments]
    .sort((a, b) => Math.abs(Number(b.dayChangePercent) || 0) - Math.abs(Number(a.dayChangePercent) || 0))
    .slice(0, 4);

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Multi-asset brokerage overview across equities, bonds, ETFs, commodities, and crypto"
    >
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.28),_transparent_32%),linear-gradient(135deg,#0f172a,#1e293b_58%,#111827)] p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-300">Safeguard Securities</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Portfolio command center for cross-asset investing.</h2>
              <p className="text-sm leading-6 text-slate-300 sm:text-base">
                Monitor allocation, stage new orders, review market regime shifts, and keep funding ready for the next move.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link to="/portfolio" className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur transition hover:bg-white/15">
                <PieChart className="mb-3 h-5 w-5" />
                <p className="text-sm font-semibold">Portfolio</p>
                <p className="mt-1 text-xs text-slate-300">Review holdings and allocation</p>
              </Link>
              <Link to="/orders" className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur transition hover:bg-white/15">
                <TrendingUp className="mb-3 h-5 w-5" />
                <p className="text-sm font-semibold">Orders</p>
                <p className="mt-1 text-xs text-slate-300">Enter and manage trades</p>
              </Link>
              <Link to="/funding" className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur transition hover:bg-white/15">
                <Wallet className="mb-3 h-5 w-5" />
                <p className="text-sm font-semibold">Funding</p>
                <p className="mt-1 text-xs text-slate-300">Move cash and digital assets</p>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Portfolio Value</p>
            {overviewLoading ? (
              <p className="mt-3 text-sm text-slate-400">Loading…</p>
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(totalPortfolioValue)}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {positions.length > 0 ? `${positions.length} holding${positions.length === 1 ? '' : 's'}` : 'No holdings yet'}
                </p>
              </>
            )}
          </Card>

          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Cash</p>
            {overviewLoading ? (
              <p className="mt-3 text-sm text-slate-400">Loading…</p>
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(totalCash)}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {accounts.length > 0 ? `${accounts.length} account${accounts.length === 1 ? '' : 's'}` : 'No accounts yet'}
                </p>
              </>
            )}
          </Card>

          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Day&apos;s Change</p>
            {overviewLoading || instrumentsLoading ? (
              <p className="mt-3 text-sm text-slate-400">Loading…</p>
            ) : dayChangeComputable ? (
              <>
                <p className={`mt-3 text-3xl font-semibold ${dayChangeValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {signedCurrency(dayChangeValue)}
                </p>
                <p className={`mt-2 text-sm font-medium ${toneClass[dayChangeValue >= 0 ? 'positive' : 'negative']}`}>
                  Today across your positions
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold text-slate-400">—</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {positions.length === 0 ? 'No holdings yet' : 'Not available'}
                </p>
              </>
            )}
          </Card>

          <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Open Orders</p>
            {overviewLoading ? (
              <p className="mt-3 text-sm text-slate-400">Loading…</p>
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{openOrders.length}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {orders.length > 0 ? `${orders.length} total order${orders.length === 1 ? '' : 's'}` : 'No orders yet'}
                </p>
              </>
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Top holdings</h3>
                <p className="text-sm text-slate-500">Current leaders by market value across the portfolio</p>
              </div>
              <Link to="/portfolio" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
                View portfolio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {positionsLoading ? (
              <SectionLoading label="Loading holdings…" />
            ) : topHoldings.length === 0 ? (
              <SectionEmpty message="You don't have any holdings yet. Place your first trade to see it here." />
            ) : (
              <div className="space-y-4">
                {topHoldings.map((holding) => {
                  const instrument = instrumentBySymbol.get(holding.symbol);
                  const dayChangePercent = instrument?.dayChangePercent;
                  return (
                    <div key={holding.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-base font-semibold text-slate-900">{holding.symbol}</p>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{assetClassLabel(holding.assetClass)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{holding.name}</p>
                      </div>
                      <div className="grid gap-2 text-sm sm:text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(holding.marketValue)}</p>
                        <p className="text-slate-500">{holding.quantity.toLocaleString()} at {formatCurrency(holding.lastPrice)}</p>
                        <p className={typeof dayChangePercent === 'number' ? (dayChangePercent >= 0 ? 'font-medium text-emerald-600' : 'font-medium text-rose-600') : 'font-medium text-slate-400'}>
                          {typeof dayChangePercent === 'number' ? `${signedPercent(dayChangePercent)} today` : 'Change unavailable'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Market pulse</h3>
                  <p className="text-sm text-slate-500">Selected movers across asset classes</p>
                </div>
                <Link to="/markets" className="text-sm font-medium text-blue-700 hover:text-blue-800">Open markets</Link>
              </div>
              {instrumentsLoading ? (
                <SectionLoading label="Loading markets…" />
              ) : marketPulse.length === 0 ? (
                <SectionEmpty message="No market data available right now." />
              ) : (
                <div className="space-y-3">
                  {marketPulse.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.symbol}</p>
                        <p className="text-xs text-slate-500">{assetClassLabel(item.assetClass)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(item.lastPrice)}</p>
                        <p className={item.dayChangePercent >= 0 ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-rose-600'}>
                          {signedPercent(item.dayChangePercent)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Watchlist</h3>
                  <p className="text-sm text-slate-500">Names you're tracking for your next move</p>
                </div>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              {watchlistLoading ? (
                <SectionLoading label="Loading watchlist…" />
              ) : watchlist.length === 0 ? (
                <SectionEmpty message="Add symbols from Markets to build your watchlist." />
              ) : (
                <div className="space-y-3">
                  {watchlist.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{item.symbol}</p>
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{assetClassLabel(item.assetClass)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <p className="text-slate-600">{formatCurrency(item.lastPrice)}</p>
                        <p className={item.dayChangePercent >= 0 ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>
                          {signedPercent(item.dayChangePercent)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </section>

        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Open orders</h3>
              <p className="text-sm text-slate-500">Working orders and partial fills that still need attention</p>
            </div>
            <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
              Trade ticket
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {ordersLoading ? (
            <SectionLoading label="Loading orders…" />
          ) : openOrders.length === 0 ? (
            <SectionEmpty message="No open orders right now. Place a trade to see it here." />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {openOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{order.symbol}</p>
                      <p className="text-sm text-slate-500">{order.orderType} {order.side} order</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{order.status.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-700">{order.quantity.toLocaleString()} units</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                    Submitted {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-blue-700" />
              <h3 className="text-lg font-semibold text-slate-900">Funding readiness</h3>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Keep brokerage cash ready for opportunities. Move funds between your accounts to stage your next trade.
            </p>
            <Link to="/funding" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
              Manage funding
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-700" />
              <h3 className="text-lg font-semibold text-slate-900">Reporting stack</h3>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Statements, trade confirms, and tax documents are available in your document center.
            </p>
            <Link to="/documents" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
              Open documents
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
