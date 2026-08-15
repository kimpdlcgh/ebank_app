import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  X,
  ListOrdered
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  doc,
  collection,
  getDoc,
  updateDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import AdminLayout from '../../components/Layout/AdminLayout';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useAllOrders } from '../../hooks/useFirestore';
import { logAdminAction } from '../../utils/auditLog';
import {
  BrokerageOrder,
  BrokerageOrderStatus,
  Account,
  Position,
  Instrument,
  TransactionType,
  TransactionStatus
} from '../../types';

type StatusFilter = 'all' | BrokerageOrderStatus;
type SideFilter = 'all' | 'buy' | 'sell';

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

const isToday = (value: any): boolean => {
  if (!value) return false;
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const formatMoney = (value: number | undefined | null): string => {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'open': return 'bg-blue-100 text-blue-800';
    case 'partially_filled': return 'bg-yellow-100 text-yellow-800';
    case 'filled': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getSideColor = (side: string): string => {
  return side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

const ManageBrokerageOrders: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { data: rawOrders, loading } = useAllOrders();
  const orders = rawOrders as unknown as BrokerageOrder[];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');

  const [fillModalOrder, setFillModalOrder] = useState<BrokerageOrder | null>(null);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [instrumentLoading, setInstrumentLoading] = useState(false);
  const [fillPrice, setFillPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null);

  // Load the instrument's current price when the fill modal opens
  useEffect(() => {
    if (!fillModalOrder) {
      setInstrument(null);
      setFillPrice('');
      return;
    }

    let cancelled = false;
    setInstrumentLoading(true);

    getDoc(doc(db, 'instruments', fillModalOrder.instrumentId))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Instrument;
          setInstrument({ ...data, id: snap.id });
          setFillPrice(String(data.lastPrice ?? fillModalOrder.limitPrice ?? ''));
        } else {
          setInstrument(null);
          setFillPrice(String(fillModalOrder.limitPrice ?? ''));
        }
      })
      .catch((error) => {
        console.error('Failed to load instrument for fill modal:', error);
        if (!cancelled) {
          setInstrument(null);
          setFillPrice(String(fillModalOrder.limitPrice ?? ''));
        }
      })
      .finally(() => {
        if (!cancelled) setInstrumentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fillModalOrder]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orders
      .filter((order) => {
        const matchesSearch =
          !term ||
          order.symbol?.toLowerCase().includes(term) ||
          order.userId?.toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesSide = sideFilter === 'all' || order.side === sideFilter;
        return matchesSearch && matchesStatus && matchesSide;
      })
      .sort((a, b) => {
        const aTime = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : 0;
        const bTime = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : 0;
        return bTime - aTime;
      });
  }, [orders, searchTerm, statusFilter, sideFilter]);

  const totalOpenOrders = useMemo(
    () => orders.filter((o) => o.status === 'open' || o.status === 'partially_filled').length,
    [orders]
  );
  const totalFilledToday = useMemo(
    () => orders.filter((o) => o.status === 'filled' && isToday(o.updatedAt)).length,
    [orders]
  );
  const totalOrderVolume = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + (o.estimatedValue || 0), 0),
    [filteredOrders]
  );

  const openFillModal = (order: BrokerageOrder) => {
    setFillModalOrder(order);
  };

  const closeFillModal = () => {
    if (submitting) return;
    setFillModalOrder(null);
  };

  const handleConfirmFill = async () => {
    if (!fillModalOrder) return;

    const fillPriceNum = parseFloat(fillPrice);
    if (!fillPriceNum || isNaN(fillPriceNum) || fillPriceNum <= 0) {
      toast.error('Enter a valid fill price');
      return;
    }

    const order = fillModalOrder;
    setSubmitting(true);

    try {
      await runTransaction(db, async (tx) => {
        const orderRef = doc(db, 'brokerage_orders', order.id);
        const accountRef = doc(db, 'accounts', order.accountId);
        const positionRef = doc(db, 'positions', `${order.accountId}_${order.instrumentId}`);

        const [orderSnap, accountSnap, positionSnap] = await Promise.all([
          tx.get(orderRef),
          tx.get(accountRef),
          tx.get(positionRef)
        ]);

        if (!orderSnap.exists()) {
          throw new Error('Order no longer exists');
        }
        const currentStatus = orderSnap.data().status;
        if (currentStatus !== 'open' && currentStatus !== 'partially_filled') {
          throw new Error('Order is no longer open');
        }
        if (!accountSnap.exists()) {
          throw new Error('Account not found');
        }

        const accountData = accountSnap.data() as Account;
        const total = fillPriceNum * order.quantity;

        if (order.side === 'buy') {
          const currentBalance = accountData.balance || 0;
          if (currentBalance < total) {
            throw new Error('Insufficient account balance to fill this order');
          }
          const newBalance = currentBalance - total;

          let newQuantity: number;
          let newAverageCost: number;
          let existingAllocationPercent = 0;
          if (positionSnap.exists()) {
            const pos = positionSnap.data() as Position;
            const existingQty = pos.quantity || 0;
            const existingAvgCost = pos.averageCost || 0;
            existingAllocationPercent = pos.allocationPercent || 0;
            newQuantity = existingQty + order.quantity;
            newAverageCost = ((existingQty * existingAvgCost) + (order.quantity * fillPriceNum)) / newQuantity;
          } else {
            newQuantity = order.quantity;
            newAverageCost = fillPriceNum;
          }

          const marketValue = newQuantity * fillPriceNum;
          const costBasis = newQuantity * newAverageCost;
          const unrealizedPnL = marketValue - costBasis;
          const unrealizedPnLPercent = costBasis !== 0 ? (unrealizedPnL / costBasis) * 100 : 0;

          tx.set(positionRef, {
            accountId: order.accountId,
            userId: order.userId,
            instrumentId: order.instrumentId,
            symbol: order.symbol,
            name: instrument?.name || order.symbol,
            assetClass: instrument?.assetClass || order.assetClass,
            quantity: newQuantity,
            averageCost: newAverageCost,
            lastPrice: fillPriceNum,
            marketValue,
            allocationPercent: existingAllocationPercent,
            unrealizedPnL,
            unrealizedPnLPercent,
            updatedAt: serverTimestamp()
          }, { merge: true });

          tx.update(accountRef, { balance: newBalance, updatedAt: serverTimestamp() });
        } else {
          // sell
          if (!positionSnap.exists()) {
            throw new Error('Insufficient position quantity to fill this sell order');
          }
          const pos = positionSnap.data() as Position;
          const existingQty = pos.quantity || 0;
          if (existingQty < order.quantity) {
            throw new Error('Insufficient position quantity to fill this sell order');
          }

          const newBalance = (accountData.balance || 0) + total;
          const remainingQty = existingQty - order.quantity;

          if (remainingQty === 0) {
            tx.delete(positionRef);
          } else {
            const averageCost = pos.averageCost || 0;
            const marketValue = remainingQty * fillPriceNum;
            const costBasis = remainingQty * averageCost;
            const unrealizedPnL = marketValue - costBasis;
            const unrealizedPnLPercent = costBasis !== 0 ? (unrealizedPnL / costBasis) * 100 : 0;

            tx.update(positionRef, {
              quantity: remainingQty,
              lastPrice: fillPriceNum,
              marketValue,
              unrealizedPnL,
              unrealizedPnLPercent,
              updatedAt: serverTimestamp()
            });
          }

          tx.update(accountRef, { balance: newBalance, updatedAt: serverTimestamp() });
        }

        tx.update(orderRef, { status: 'filled', updatedAt: serverTimestamp() });

        const txnRef = doc(collection(db, 'transactions'));
        tx.set(txnRef, {
          userId: order.userId,
          type: order.side === 'buy' ? TransactionType.TRADE_BUY : TransactionType.TRADE_SELL,
          status: TransactionStatus.COMPLETED,
          amount: order.side === 'buy' ? -total : total,
          currency: 'USD',
          description: `${order.side === 'buy' ? 'Bought' : 'Sold'} ${order.quantity} ${order.symbol} @ $${fillPriceNum}`,
          reference: order.id,
          createdAt: serverTimestamp(),
          completedAt: serverTimestamp()
        });
      });

      await logAdminAction({
        action: 'brokerage_order.filled',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'brokerage_order',
        targetId: order.id,
        targetLabel: order.symbol,
        details: { fillPrice: fillPriceNum, quantity: order.quantity, side: order.side }
      });

      toast.success(`Order filled: ${order.side === 'buy' ? 'Bought' : 'Sold'} ${order.quantity} ${order.symbol} @ $${fillPriceNum}`);
      setFillModalOrder(null);
    } catch (error: any) {
      console.error('Failed to fill order:', error);
      toast.error(error?.message || 'Failed to fill order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (order: BrokerageOrder, status: 'cancelled' | 'rejected') => {
    setActioningOrderId(order.id);
    try {
      await updateDoc(doc(db, 'brokerage_orders', order.id), {
        status,
        updatedAt: serverTimestamp()
      });

      await logAdminAction({
        action: status === 'cancelled' ? 'brokerage_order.cancelled' : 'brokerage_order.rejected',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'brokerage_order',
        targetId: order.id,
        targetLabel: order.symbol,
        details: { side: order.side, quantity: order.quantity }
      });

      toast.success(`Order ${status}`);
    } catch (error: any) {
      console.error(`Failed to ${status} order:`, error);
      toast.error(error?.message || `Failed to ${status} order`);
    } finally {
      setActioningOrderId(null);
    }
  };

  return (
    <AdminLayout title="Brokerage Orders" subtitle="Review and manually fill, cancel, or reject client trade orders">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Orders</p>
                <p className="text-2xl font-bold text-gray-900">{totalOpenOrders}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting admin action</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ListOrdered className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filled Today</p>
                <p className="text-2xl font-bold text-gray-900">{totalFilledToday}</p>
                <p className="text-xs text-gray-500 mt-1">Orders filled since midnight</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Order Volume</p>
                <p className="text-2xl font-bold text-gray-900">${formatMoney(totalOrderVolume)}</p>
                <p className="text-xs text-gray-500 mt-1">Estimated value, current filters</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by symbol or client user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="partially_filled">Partially Filled</option>
              <option value="filled">Filled</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as SideFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sides</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Orders ({filteredOrders.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading orders...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No brokerage orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.userId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSideColor(order.side)}`}>
                            {order.side === 'buy' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {order.side}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{order.symbol}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">{order.orderType?.replace('_', ' ')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.limitPrice ? `$${formatMoney(order.limitPrice)}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${formatMoney(order.estimatedValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {order.status === 'open' || order.status === 'partially_filled' ? (
                          <div className="flex items-center gap-3 justify-end">
                            <button
                              onClick={() => openFillModal(order)}
                              className="text-green-600 hover:text-green-900 flex items-center gap-1"
                              title="Fill order"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Fill
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(order, 'cancelled')}
                              disabled={actioningOrderId === order.id}
                              className="text-gray-600 hover:text-gray-900 flex items-center gap-1 disabled:opacity-50"
                              title="Cancel order"
                            >
                              <Ban className="w-4 h-4" />
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(order, 'rejected')}
                              disabled={actioningOrderId === order.id}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1 disabled:opacity-50"
                              title="Reject order"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            No actions
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fill Order Modal */}
      {fillModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Fill Order — {fillModalOrder.symbol}
              </h3>
              <button onClick={closeFillModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Client</span>
                  <span className="font-medium">{fillModalOrder.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Side</span>
                  <span className="font-medium capitalize">{fillModalOrder.side}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quantity</span>
                  <span className="font-medium">{fillModalOrder.quantity}</span>
                </div>
                {fillModalOrder.limitPrice && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Limit Price</span>
                    <span className="font-medium">${formatMoney(fillModalOrder.limitPrice)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fill Price {instrumentLoading && <span className="text-gray-400">(loading current price...)</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fillPrice}
                    onChange={(e) => setFillPrice(e.target.value)}
                    disabled={instrumentLoading}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {instrument && (
                  <p className="text-xs text-gray-500 mt-1">
                    Current market price: ${formatMoney(instrument.lastPrice)}
                  </p>
                )}
              </div>

              {fillPrice && !isNaN(parseFloat(fillPrice)) && (
                <div className="text-sm text-gray-600">
                  Estimated total: <span className="font-semibold text-gray-900">
                    ${formatMoney(parseFloat(fillPrice) * fillModalOrder.quantity)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleConfirmFill}
                disabled={submitting || instrumentLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Filling...' : 'Confirm Fill'}
              </button>
              <button
                onClick={closeFillModal}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageBrokerageOrders;
