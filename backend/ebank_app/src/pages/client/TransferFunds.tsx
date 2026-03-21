import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Clock, Shield, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { marketMovers, openOrders } from '../../data/brokerageMockData';

const OrdersPage: React.FC = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [orderType, setOrderType] = useState<'Market' | 'Limit' | 'Stop'>('Limit');
  const [quantity, setQuantity] = useState('50');
  const [price, setPrice] = useState('214.00');

  const selectedInstrument = useMemo(
    () => marketMovers.find((item) => item.symbol === symbol) || marketMovers[0],
    [symbol]
  );

  return (
    <DashboardLayout title="Orders" subtitle="Trade ticket, working orders, and execution preparation across asset classes">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <ArrowLeftRight className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Trade ticket</h2>
                <p className="text-sm text-slate-500">Stage market, limit, and stop orders for the selected instrument.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Instrument</label>
                <select
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                >
                  {marketMovers.map((item) => (
                    <option key={item.symbol} value={item.symbol}>{item.symbol} • {item.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Side</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Buy', 'Sell'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSide(value)}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${side === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-400'}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Order type</label>
                  <select
                    value={orderType}
                    onChange={(event) => setOrderType(event.target.value as 'Market' | 'Limit' | 'Stop')}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  >
                    <option value="Market">Market</option>
                    <option value="Limit">Limit</option>
                    <option value="Stop">Stop</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Quantity</label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Price trigger</label>
                  <input
                    type="text"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Selected market</span>
                  <span className="font-semibold text-slate-900">{selectedInstrument.symbol}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Reference price</span>
                  <span className="font-semibold text-slate-900">{selectedInstrument.price}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Day change</span>
                  <span className={selectedInstrument.change.startsWith('+') ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{selectedInstrument.change}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button>{side} {symbol}</Button>
                <Button variant="outline">Save as template</Button>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Working orders</h3>
              </div>
              <div className="space-y-3">
                {openOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{order.symbol}</p>
                        <p className="text-sm text-slate-500">{order.side} • {order.orderType}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{order.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{order.quantity}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{order.submittedAt}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Execution safeguards</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Order validation, buying power checks, and instrument eligibility must be enforced on the backend before release.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Crypto and commodity products may need separate market session and venue restrictions.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Suitability and risk acknowledgements should be attached to leveraged or complex products.</li>
              </ul>
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Market context</h3>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Use this panel for pre-trade checks, quote freshness, and volatility snapshots before wiring a live execution backend.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrdersPage;