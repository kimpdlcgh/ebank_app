import React, { useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../utils/auditLog';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';
import {
  Activity,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  X
} from 'lucide-react';

const ManageTransactions: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { data: transactions, loading } = useFirestore(
    'transactions',
    (query) => query.orderByField('createdAt', 'desc').limitTo(500),
    { realTime: true, cacheEnabled: false }
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewTxn, setViewTxn] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const formatTimestamp = (value: any) => {
    if (!value) return '—';
    if (value?.toDate) return value.toDate().toLocaleString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  };

  const filteredTransactions = transactions.filter((txn: any) => {
    const haystack = `${txn.id} ${txn.reference || ''} ${txn.description || ''} ${txn.userId || ''}`.toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
    const matchesType = typeFilter === 'all' || txn.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalAmount = filteredTransactions.reduce((sum: number, txn: any) => sum + Math.abs(txn.amount || 0), 0);
  const completedTxns = filteredTransactions.filter((txn: any) => txn.status === 'completed').length;
  const pendingTxns = filteredTransactions.filter((txn: any) => txn.status === 'pending').length;
  const successRate = filteredTransactions.length > 0 ? (completedTxns / filteredTransactions.length) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'pending': return Clock;
      case 'failed': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return ArrowDownRight;
      case 'withdrawal': return ArrowUpRight;
      case 'transfer': return RefreshCw;
      case 'trade_buy': return ArrowUpRight;
      case 'trade_sell': return ArrowDownRight;
      default: return DollarSign;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-green-600';
      case 'withdrawal': return 'text-red-600';
      case 'transfer': return 'text-blue-600';
      case 'trade_buy': return 'text-purple-600';
      case 'trade_sell': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const handleApprove = async (txn: any) => {
    setUpdatingId(txn.id);
    try {
      await updateDoc(doc(db, 'transactions', txn.id), {
        status: 'completed',
        completedAt: serverTimestamp()
      });
      await logAdminAction({
        action: 'transaction.approved',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'transaction',
        targetId: txn.id,
        targetLabel: txn.reference || txn.id,
        details: { type: txn.type, amount: txn.amount }
      });
      toast.success('Transaction marked completed');
    } catch (error) {
      console.error('Failed to approve transaction:', error);
      toast.error('Failed to update transaction');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredTransactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    toast.success('Transactions exported');
  };

  return (
    <AdminLayout
      title="Transaction Management"
      subtitle="Monitor and manage all system transactions"
    >
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
                <p className="text-xs text-blue-500 mt-1">All transaction types</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Transaction value
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingTxns}</p>
                <p className="text-xs text-yellow-600 flex items-center mt-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Requires attention
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{successRate.toFixed(1)}%</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completion rate
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search transactions, users, or references..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="transfer">Transfers</option>
                <option value="trade_buy">Trade Buys</option>
                <option value="trade_sell">Trade Sells</option>
              </select>
            </div>

            <Button variant="outline" className="flex items-center" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Transactions ({filteredTransactions.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-500">Transactions will appear here as clients deposit, withdraw, and trade.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((txn: any) => {
                    const StatusIcon = getStatusIcon(txn.status);
                    const TypeIcon = getTypeIcon(txn.type);
                    return (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <TypeIcon className={`h-5 w-5 ${getTypeColor(txn.type)}`} />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 capitalize">{txn.type?.replace('_', ' ')}</div>
                              <div className="text-xs text-gray-400">{txn.reference || txn.description || txn.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {txn.userId || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            ${Math.abs(txn.amount || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 text-gray-400 mr-1" />
                            {formatTimestamp(txn.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="outline" size="sm" className="flex items-center" onClick={() => setViewTxn(txn)}>
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            {txn.status === 'pending' && (
                              <Button
                                size="sm"
                                className="flex items-center"
                                disabled={updatingId === txn.id}
                                onClick={() => handleApprove(txn)}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {updatingId === txn.id ? 'Saving...' : 'Approve'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {viewTxn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
              <button onClick={() => setViewTxn(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">ID</span><span className="font-mono text-gray-900">{viewTxn.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize text-gray-900">{viewTxn.type?.replace('_', ' ')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="capitalize text-gray-900">{viewTxn.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="text-gray-900">${Math.abs(viewTxn.amount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="text-gray-900">{viewTxn.userId || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="text-gray-900">{viewTxn.reference || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Description</span><span className="text-gray-900 text-right max-w-xs">{viewTxn.description || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-900">{formatTimestamp(viewTxn.createdAt)}</span></div>
              {viewTxn.completedAt && (
                <div className="flex justify-between"><span className="text-gray-500">Completed</span><span className="text-gray-900">{formatTimestamp(viewTxn.completedAt)}</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageTransactions;
