import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  Clock,
  Shield,
  TrendingUp,
  AlertCircle,
  Loader2,
  Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useInstruments, useUserAccounts, useUserOrders, useUserPositions } from '../../hooks/useFirestore';
import { formatCurrency } from '../../utils/helpers';
import {
  Account,
  BrokerageOrder,
  BrokerageOrderType,
  Instrument,
  OrderSide,
  Position
} from '../../types';

type TimeInForce = 'day' | 'gtc' | 'ioc';

const ORDER_TYPE_LABELS: Record<string, string> = {
  market: 'Market',
  limit: 'Limit',
  stop: 'Stop',
  stop_limit: 'Stop Limit'
};

const formatTimestamp = (value: any): string => {
  if (!value) return '—';
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const querySymbol = (searchParams.get('symbol') || '').toUpperCase();

  const { data: rawInstruments, loading: instrumentsLoading } = useInstruments();
  const { data: rawAccounts, loading: accountsLoading } = useUserAccounts(user?.uid || '');
  const { data: rawPositions } = useUserPositions(user?.uid || '');
  const { data: rawOrders, loading: ordersLoading } = useUserOrders(user?.uid || '');

  const instruments = rawInstruments as unknown as Instrument[];
  const accounts = rawAccounts as unknown as Account[];
  const positions = rawPositions as unknown as Position[];
  const orders = rawOrders as unknown as BrokerageOrder[];

  const tradableInstruments = useMemo(
    () => instruments.filter((instrument) => instrument.isTradable),
    [instruments]
  );

  const [symbol, setSymbol] = useState(querySymbol);
  const [accountId, setAccountId] = useState('');
  const [side, setSide] = useState<OrderSide>(OrderSide.BUY);
  const [orderType, setOrderType] = useState<string>(BrokerageOrderType.MARKET);
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('day');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Prefill/default the symbol once instruments are available, honoring the ?symbol= query param
  useEffect(() => {
    if (tradableInstruments.length === 0) return;
    setSymbol((current) => {
      if (current && tradableInstruments.some((item) => item.symbol === current)) return current;
      if (querySymbol && tradableInstruments.some((item) => item.symbol === querySymbol)) return querySymbol;
      return tradableInstruments[0].symbol;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradableInstruments]);

  // Default the funding account once accounts are available
  useEffect(() => {
    if (accounts.length === 0) return;
    setAccountId((current) => (current && accounts.some((account) => account.id === current) ? current : accounts[0].id));
  }, [accounts]);

  const selectedInstrument = useMemo(
    () => tradableInstruments.find((item) => item.symbol === symbol) || null,
    [tradableInstruments, symbol]
  );

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) || null,
    [accounts, accountId]
  );

  const needsLimitPrice = orderType === BrokerageOrderType.LIMIT || orderType === BrokerageOrderType.STOP_LIMIT;
  const needsStopPrice = orderType === BrokerageOrderType.STOP || orderType === BrokerageOrderType.STOP_LIMIT;

  const referencePrice = useMemo(() => {
    const limit = parseFloat(limitPrice);
    if (needsLimitPrice && !isNaN(limit) && limit > 0) return limit;
    return selectedInstrument?.lastPrice || 0;
  }, [needsLimitPrice, limitPrice, selectedInstrument]);

  const quantityNum = parseFloat(quantity);
  const estimatedValue = !isNaN(quantityNum) && quantityNum > 0 ? quantityNum * referencePrice : 0;

  const heldQuantity = useMemo(() => {
    if (!selectedInstrument) return 0;
    return positions
      .filter((position) => position.symbol === selectedInstrument.symbol)
      .reduce((sum, position) => sum + (position.quantity || 0), 0);
  }, [positions, selectedInstrument]);

  const openOrders = useMemo(() => orders.filter((order) => order.status === 'open'), [orders]);
  const recentOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status !== 'open')
        .sort((a, b) => {
          const aTime = (a.updatedAt as any)?.toMillis ? (a.updatedAt as any).toMillis() : 0;
          const bTime = (b.updatedAt as any)?.toMillis ? (b.updatedAt as any).toMillis() : 0;
          return bTime - aTime;
        })
        .slice(0, 5),
    [orders]
  );

  const resetTicket = () => {
    setQuantity('');
    setLimitPrice('');
    setStopPrice('');
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!user) {
      toast.error('You must be signed in to place an order.');
      return;
    }
    if (!selectedInstrument) {
      setFormError('Select an instrument to trade.');
      return;
    }
    if (!selectedAccount) {
      setFormError('Select an account to fund this trade.');
      return;
    }
    if (!quantityNum || isNaN(quantityNum) || quantityNum <= 0) {
      setFormError('Enter a quantity greater than zero.');
      return;
    }

    const limitPriceNum = parseFloat(limitPrice);
    const stopPriceNum = parseFloat(stopPrice);

    if (needsLimitPrice && (isNaN(limitPriceNum) || limitPriceNum <= 0)) {
      setFormError('Enter a valid limit price.');
      return;
    }
    if (needsStopPrice && (isNaN(stopPriceNum) || stopPriceNum <= 0)) {
      setFormError('Enter a valid stop price.');
      return;
    }

    if (side === OrderSide.BUY) {
      const availableBalance = selectedAccount.balance || 0;
      if (estimatedValue > availableBalance) {
        setFormError(
          `Estimated value (${formatCurrency(estimatedValue)}) exceeds the available balance (${formatCurrency(availableBalance)}) in the selected account.`
        );
        return;
      }
    } else {
      if (quantityNum > heldQuantity) {
        setFormError(`You only hold ${heldQuantity} share(s) of ${selectedInstrument.symbol}; cannot sell ${quantityNum}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'brokerage_orders'), {
        userId: user.uid,
        accountId: selectedAccount.id,
        instrumentId: selectedInstrument.id,
        symbol: selectedInstrument.symbol,
        assetClass: selectedInstrument.assetClass,
        side,
        orderType,
        quantity: quantityNum,
        limitPrice: needsLimitPrice ? limitPriceNum : null,
        stopPrice: needsStopPrice ? stopPriceNum : null,
        estimatedValue,
        status: 'open',
        timeInForce,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success(`${side === OrderSide.BUY ? 'Buy' : 'Sell'} order submitted for ${quantityNum} ${selectedInstrument.symbol}`);
      resetTicket();
    } catch (error: any) {
      console.error('Failed to submit order:', error);
      toast.error(error?.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (order: BrokerageOrder) => {
    setCancellingId(order.id);
    try {
      await updateDoc(doc(db, 'brokerage_orders', order.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
      toast.success(`Order for ${order.symbol} cancelled.`);
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      toast.error(error?.message || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const noAccounts = !accountsLoading && accounts.length === 0;

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

            {instrumentsLoading || accountsLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading trade ticket…
              </div>
            ) : noAccounts ? (
              <div className="rounded-2xl bg-amber-50 p-6 text-sm text-amber-800">
                <p className="font-semibold text-amber-900">An account is required before you can trade.</p>
                <p className="mt-2">Open a brokerage or cash account to fund trades before submitting an order.</p>
              </div>
            ) : tradableInstruments.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">
                No tradable instruments are available right now. Please check back later.
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Instrument</label>
                  <select
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  >
                    {tradableInstruments.map((item) => (
                      <option key={item.id} value={item.symbol}>
                        {item.symbol} • {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Funding account</label>
                  <select
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountType?.toUpperCase()} ****{(account.accountNumber || '').slice(-4)} — {formatCurrency(account.balance || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Side</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([OrderSide.BUY, OrderSide.SELL] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSide(value)}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${side === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-400'}`}
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
                      onChange={(event) => setOrderType(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      {Object.values(BrokerageOrderType).map((value) => (
                        <option key={value} value={value}>
                          {ORDER_TYPE_LABELS[value] || value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                    {side === OrderSide.SELL && (
                      <p className="mt-1 text-xs text-slate-400">Held: {heldQuantity}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Time in force</label>
                    <select
                      value={timeInForce}
                      onChange={(event) => setTimeInForce(event.target.value as TimeInForce)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      <option value="day">Day</option>
                      <option value="gtc">Good til cancelled</option>
                      <option value="ioc">Immediate or cancel</option>
                    </select>
                  </div>
                </div>

                {(needsLimitPrice || needsStopPrice) && (
                  <div className="grid grid-cols-2 gap-4">
                    {needsLimitPrice && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Limit price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={limitPrice}
                          onChange={(event) => setLimitPrice(event.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                        />
                      </div>
                    )}
                    {needsStopPrice && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Stop price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={stopPrice}
                          onChange={(event) => setStopPrice(event.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Selected market</span>
                    <span className="font-semibold text-slate-900">{selectedInstrument?.symbol || '—'}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Reference price</span>
                    <span className="font-semibold text-slate-900">
                      {selectedInstrument ? formatCurrency(selectedInstrument.lastPrice) : '—'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Day change</span>
                    <span className={(selectedInstrument?.dayChangePercent ?? 0) >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                      {selectedInstrument
                        ? `${selectedInstrument.dayChangePercent >= 0 ? '+' : ''}${selectedInstrument.dayChangePercent.toFixed(2)}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                    <span>Estimated value</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(estimatedValue)}</span>
                  </div>
                </div>

                {formError && (
                  <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      `${side === OrderSide.BUY ? 'Buy' : 'Sell'} ${selectedInstrument?.symbol || ''}`
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetTicket} disabled={submitting}>
                    Clear ticket
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Working orders</h3>
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading orders…
                </div>
              ) : openOrders.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  You have no open orders. Orders you submit will appear here until an admin fills or cancels them.
                </div>
              ) : (
                <div className="space-y-3">
                  {openOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{order.symbol}</p>
                          <p className="text-sm capitalize text-slate-500">
                            {order.side} • {ORDER_TYPE_LABELS[order.orderType] || order.orderType}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{order.status}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-700">
                        {order.quantity} shares {order.limitPrice ? `@ ${formatCurrency(order.limitPrice)}` : ''} • Est. {formatCurrency(order.estimatedValue)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wide text-slate-400">{formatTimestamp(order.createdAt)}</p>
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order)}
                          disabled={cancellingId === order.id}
                          className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {cancellingId === order.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {recentOrders.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent activity</p>
                  <div className="space-y-2">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-900">{order.symbol}</span>
                          <span className="ml-2 capitalize text-slate-500">{order.side} • {order.quantity}</span>
                        </div>
                        <span className="text-xs capitalize text-slate-500">{order.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Execution safeguards</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Orders are validated for buying power and holdings before submission, then held as open until an admin reviews and fills them.</li>
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
                Reference prices reflect the latest instrument quote on file. Orders submitted here sit as open until an admin fills, partially fills, or cancels them — there is no live execution against this ticket.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrdersPage;
