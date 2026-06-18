import React, { useState, useMemo } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import {
  Users, Search, ChevronRight, X, User, CreditCard,
  Activity, Wallet, Mail, Phone, Calendar, Shield,
  TrendingUp, TrendingDown, DollarSign, ArrowLeft
} from 'lucide-react';

const fmt = (val: any) => {
  if (!val) return '—';
  if (val?.toDate) return val.toDate().toLocaleDateString();
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString();
  }
  return '—';
};

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const ClientAccountViewer: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const { data: users, loading: usersLoading } = useFirestore('users');
  const { data: accounts } = useFirestore('accounts');
  const { data: transactions } = useFirestore('transactions');
  const { data: wallets } = useFirestore('wallets');
  const { data: profiles } = useFirestore('profiles');

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const clients = useMemo(() =>
    users.filter((u: any) => u.role === 'client' || (!u.role && !u.adminProfile)),
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clients;
    return clients.filter((u: any) =>
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const selectedClient = useMemo(() =>
    selectedUid ? users.find((u: any) => u.uid === selectedUid) : null,
    [selectedUid, users]
  );

  const clientAccounts = useMemo(() =>
    accounts.filter((a: any) => a.userId === selectedUid || a.uid === selectedUid),
    [accounts, selectedUid]
  );

  const clientTransactions = useMemo(() => {
    const txns = transactions.filter((t: any) =>
      t.userId === selectedUid || t.uid === selectedUid ||
      clientAccounts.some((a: any) => a.id === t.accountId)
    );
    return txns.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime - aTime;
    }).slice(0, 20);
  }, [transactions, selectedUid, clientAccounts]);

  const clientWallet = useMemo(() =>
    wallets.find((w: any) => w.userId === selectedUid || w.uid === selectedUid || w.id === selectedUid),
    [wallets, selectedUid]
  );

  const clientProfile = useMemo(() =>
    profiles.find((p: any) => p.uid === selectedUid || p.id === selectedUid),
    [profiles, selectedUid]
  );

  const totalBalance = clientAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Shield className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Super Admin Access Only</h2>
          <p className="text-gray-500 mt-2">This feature is restricted to Super Admins.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {selectedUid && (
            <button
              onClick={() => setSelectedUid(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Client Account Viewer</h1>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Super Admin</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedUid ? `Viewing: ${selectedClient?.firstName} ${selectedClient?.lastName}` : `${clients.length} clients registered`}
            </p>
          </div>
        </div>

        {!selectedUid ? (
          /* ── CLIENT LIST ── */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email or username..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            {usersLoading ? (
              <div className="p-12 text-center text-gray-400">Loading clients...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No clients found</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((client: any) => {
                  const clientAccs = accounts.filter((a: any) => a.userId === client.uid || a.uid === client.uid);
                  const balance = clientAccs.reduce((s: number, a: any) => s + (a.balance || 0), 0);
                  return (
                    <button
                      key={client.uid}
                      onClick={() => setSelectedUid(client.uid)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-indigo-50 transition-colors group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-indigo-700">
                            {(client.firstName?.[0] || client.email?.[0] || '?').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {client.firstName} {client.lastName}
                            {!client.firstName && <span className="text-gray-500">{client.email}</span>}
                          </p>
                          <p className="text-xs text-gray-500">{client.email} {client.username ? `· @${client.username}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-semibold text-gray-900">{currency(balance)}</p>
                          <p className="text-xs text-gray-400">{clientAccs.length} account{clientAccs.length !== 1 ? 's' : ''}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${client.isActive || client.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {client.isActive || client.status === 'approved' ? 'Active' : 'Pending'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── CLIENT DETAIL VIEW ── */
          <div className="space-y-6">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo-700">
                      {(selectedClient?.firstName?.[0] || selectedClient?.email?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedClient?.firstName} {selectedClient?.lastName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-500">{selectedClient?.email}</span>
                    </div>
                    {(selectedClient?.phoneNumber || clientProfile?.phoneNumber) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-500">{selectedClient?.phoneNumber || clientProfile?.phoneNumber}</span>
                      </div>
                    )}
                    {selectedClient?.username && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-500">@{selectedClient.username}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${selectedClient?.isActive || selectedClient?.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {selectedClient?.isActive || selectedClient?.status === 'approved' ? 'Active' : 'Pending'}
                  </span>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    Joined {fmt(selectedClient?.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Balance', value: currency(totalBalance), icon: DollarSign, color: 'indigo' },
                { label: 'Accounts', value: clientAccounts.length, icon: CreditCard, color: 'blue' },
                { label: 'Transactions', value: clientTransactions.length, icon: Activity, color: 'green' },
                { label: 'Wallet Balance', value: currency(clientWallet?.balance || 0), icon: Wallet, color: 'purple' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`bg-white rounded-xl border border-gray-200 p-4`}>
                  <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 text-${color}-600`} />
                  </div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Accounts */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Bank Accounts</h3>
              </div>
              {clientAccounts.length === 0 ? (
                <p className="p-6 text-sm text-gray-400">No accounts found.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {clientAccounts.map((acc: any) => (
                    <div key={acc.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{acc.accountType || acc.type || 'Account'}</p>
                        <p className="text-xs text-gray-500 font-mono">{acc.accountNumber || acc.id}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Opened {fmt(acc.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{currency(acc.balance)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${acc.status === 'active' || acc.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {acc.status || 'active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
                <span className="ml-auto text-xs text-gray-400">Last 20</span>
              </div>
              {clientTransactions.length === 0 ? (
                <p className="p-6 text-sm text-gray-400">No transactions found.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {clientTransactions.map((txn: any) => {
                    const isCredit = txn.type === 'deposit' || txn.type === 'credit';
                    return (
                      <div key={txn.id} className="px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? 'bg-green-100' : 'bg-red-50'}`}>
                            {isCredit
                              ? <TrendingUp className="w-4 h-4 text-green-600" />
                              : <TrendingDown className="w-4 h-4 text-red-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">{txn.type || 'Transaction'}</p>
                            <p className="text-xs text-gray-400">{fmt(txn.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                            {isCredit ? '+' : '-'}{currency(txn.amount)}
                          </p>
                          <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${txn.status === 'completed' ? 'bg-green-50 text-green-600' : txn.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-500'}`}>
                            {txn.status || 'completed'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClientAccountViewer;
