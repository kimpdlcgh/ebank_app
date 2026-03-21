import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import {
  holdings,
  marketMovers,
  openOrders,
  overviewMetrics,
  watchlist,
} from '../../data/brokerageMockData';

const toneClass = {
  positive: 'text-emerald-600',
  neutral: 'text-slate-500',
  negative: 'text-rose-600',
};

const Dashboard: React.FC = () => {
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
          {overviewMetrics.map((metric) => (
            <Card key={metric.label} className="rounded-2xl border-slate-200 p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
              <p className={`mt-2 text-sm font-medium ${toneClass[metric.tone]}`}>{metric.change}</p>
            </Card>
          ))}
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

            <div className="space-y-4">
              {holdings.slice(0, 4).map((holding) => (
                <div key={holding.symbol} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-base font-semibold text-slate-900">{holding.symbol}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{holding.assetClass}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{holding.name}</p>
                  </div>
                  <div className="grid gap-2 text-sm sm:text-right">
                    <p className="font-semibold text-slate-900">{holding.marketValue}</p>
                    <p className="text-slate-500">{holding.quantity} at {holding.lastPrice}</p>
                    <p className={holding.dayChange.startsWith('+') ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>{holding.dayChange} today</p>
                  </div>
                </div>
              ))}
            </div>
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
              <div className="space-y-3">
                {marketMovers.map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.symbol}</p>
                      <p className="text-xs text-slate-500">{item.assetClass}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{item.price}</p>
                      <p className={item.change.startsWith('+') ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-rose-600'}>{item.change}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Watchlist triggers</h3>
                  <p className="text-sm text-slate-500">Names waiting for your next action</p>
                </div>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {watchlist.map((item) => (
                  <div key={item.symbol} className="rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">{item.symbol}</p>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.assetClass}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.trigger}</p>
                  </div>
                ))}
              </div>
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {openOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{order.symbol}</p>
                    <p className="text-sm text-slate-500">{order.orderType} {order.side.toLowerCase()} order</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{order.status}</span>
                </div>
                <p className="mt-4 text-sm text-slate-700">{order.quantity}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Submitted {order.submittedAt}</p>
              </div>
            ))}
          </div>
        </Card>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-blue-700" />
              <h3 className="text-lg font-semibold text-slate-900">Funding readiness</h3>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Keep brokerage cash and digital wallet balances ready for opportunities. ACH, wire, and stablecoin rails are all supported in the new workflow.
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
              Statements, trade confirms, and tax documents are being grouped into a brokerage document center instead of banking statements only.
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