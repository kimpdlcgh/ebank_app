import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useClients, useClientNotes, useFirestore } from '../../hooks/useFirestore';
import { doc, updateDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { USER_COLLECTION, legacyStatusToAccountStatus } from '../../utils/profileAdapter';
import { logAdminAction } from '../../utils/auditLog';
import { createPasswordResetNotification } from '../../utils/notificationService';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  Key,
  Shield,
  Landmark,
  Receipt,
  LineChart,
  StickyNote,
  Wallet
} from 'lucide-react';

// Format a Firestore Timestamp (or timestamp-like value) safely.
const formatDate = (value: any): string => {
  if (!value) return 'N/A';
  try {
    if (typeof value.toDate === 'function') {
      return value.toDate().toLocaleDateString();
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return new Date(value).toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

const formatDateTime = (value: any): string => {
  if (!value) return 'N/A';
  try {
    if (typeof value.toDate === 'function') {
      return value.toDate().toLocaleString();
    }
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    return new Date(value).toLocaleString();
  } catch {
    return 'N/A';
  }
};

const toMillis = (value: any): number => {
  if (!value) return 0;
  try {
    if (typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    return new Date(value).getTime() || 0;
  } catch {
    return 0;
  }
};

const formatCurrency = (amount: any): string => {
  const value = Number(amount) || 0;
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
    case 'approved':
      return CheckCircle;
    case 'pending':
      return Clock;
    case 'suspended':
      return Ban;
    case 'inactive':
      return XCircle;
    default:
      return XCircle;
  }
};

const flagColor = (flag: string) => {
  switch (flag) {
    case 'risk':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'watch':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const ManageClients: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Realtime list of clients (role === 'client')
  const { data: clients, loading: isLoadingClients, error: clientsError } = useClients();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Extra raw profile fields not carried through profileToUser (e.g. country/nationality/KYC)
  const [rawProfile, setRawProfile] = useState<Record<string, any> | null>(null);

  // Notes form state
  const [noteText, setNoteText] = useState('');
  const [noteFlag, setNoteFlag] = useState<'none' | 'watch' | 'risk'>('none');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Status toggle state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Reset password modal state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (clientsError) {
      toast.error('Could not load clients from database.');
    }
  }, [clientsError]);

  // Fetch the raw profile document for the selected client so we can surface
  // any extra fields (country, nationality, KYC status, etc.) that aren't
  // part of the mapped `User` shape.
  useEffect(() => {
    let cancelled = false;
    if (!selectedClient?.uid) {
      setRawProfile(null);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, USER_COLLECTION, selectedClient.uid));
        if (!cancelled) {
          setRawProfile(snap.exists() ? snap.data() : null);
        }
      } catch (err) {
        console.error('Failed to load raw client profile:', err);
        if (!cancelled) setRawProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClient?.uid]);

  // Linked accounts for the selected client
  const { data: clientAccounts, loading: isLoadingAccounts } = useFirestore(
    'accounts',
    (q) => q.whereField('userId', '==', selectedClient?.uid || '__none__'),
    { realTime: true, cacheEnabled: false }
  );

  // Recent transactions for the selected client (sorted client-side)
  const { data: clientTransactionsRaw, loading: isLoadingTransactions } = useFirestore(
    'transactions',
    (q) => q.whereField('userId', '==', selectedClient?.uid || '__none__'),
    { realTime: true, cacheEnabled: false }
  );

  // Positions for the selected client
  const { data: clientPositions, loading: isLoadingPositions } = useFirestore(
    'positions',
    (q) => q.whereField('userId', '==', selectedClient?.uid || '__none__'),
    { realTime: true, cacheEnabled: false }
  );

  // Internal admin notes for the selected client
  const { data: clientNotesRaw } = useClientNotes(selectedClient?.uid || '');

  const recentTransactions = useMemo(() => {
    return [...clientTransactionsRaw]
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      .slice(0, 10);
  }, [clientTransactionsRaw]);

  const sortedNotes = useMemo(() => {
    return [...clientNotesRaw].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }, [clientNotesRaw]);

  const portfolioTotal = useMemo(() => {
    return clientPositions.reduce((sum: number, p: any) => sum + (Number(p.marketValue) || 0), 0);
  }, [clientPositions]);

  const filteredClients = clients.filter((client: any) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(search) ||
      (client.email || '').toLowerCase().includes(search);

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewClient = (client: any) => {
    setSelectedClient(client);
    setNoteText('');
    setNoteFlag('none');
  };

  const handleCloseDetail = () => {
    setSelectedClient(null);
    setRawProfile(null);
  };

  // --- Status toggle (approve / suspend) ---
  const handleToggleStatus = async () => {
    if (!selectedClient) return;
    const currentStatus = selectedClient.status || 'pending';
    const newStatus = currentStatus === 'active' || currentStatus === 'approved' ? 'suspended' : 'approved';

    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, USER_COLLECTION, selectedClient.uid), {
        status: newStatus,
        accountStatus: legacyStatusToAccountStatus(newStatus),
        updatedAt: serverTimestamp()
      });

      await logAdminAction({
        action: 'client.status_changed',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'client',
        targetId: selectedClient.uid,
        targetLabel: `${selectedClient.firstName} ${selectedClient.lastName}`,
        details: { from: currentStatus, to: newStatus }
      });

      toast.success(
        newStatus === 'suspended'
          ? `${selectedClient.firstName} ${selectedClient.lastName} has been suspended.`
          : `${selectedClient.firstName} ${selectedClient.lastName} has been approved.`
      );

      setSelectedClient((prev: any) =>
        prev
          ? { ...prev, status: legacyStatusToAccountStatus(newStatus) === 'active' ? 'approved' : newStatus }
          : prev
      );
    } catch (error) {
      console.error('Failed to update client status:', error);
      toast.error('Failed to update client status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // --- Reset password ---
  const handleResetPassword = () => {
    setShowResetPasswordModal(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedClient) return;
    setIsResettingPassword(true);
    try {
      const newTempPassword = generateTemporaryPassword();

      await updateDoc(doc(db, USER_COLLECTION, selectedClient.uid), {
        mustChangePassword: true,
        passwordResetBy: currentUser?.email || 'admin',
        passwordResetAt: serverTimestamp(),
        temporaryPassword: newTempPassword
      });

      await createPasswordResetNotification(
        {
          id: selectedClient.uid,
          firstName: selectedClient.firstName,
          lastName: selectedClient.lastName,
          username: selectedClient.email,
          email: selectedClient.email
        },
        {
          id: currentUser?.uid,
          email: currentUser?.email
        },
        newTempPassword
      );

      await logAdminAction({
        action: 'client.password_reset',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'client',
        targetId: selectedClient.uid,
        targetLabel: `${selectedClient.firstName} ${selectedClient.lastName}`,
        details: {}
      });

      toast.success(
        `Password reset successful for ${selectedClient.firstName} ${selectedClient.lastName}. Temporary password logged for secure communication.`,
        { duration: 8000 }
      );

      setShowResetPasswordModal(false);
    } catch (error) {
      console.error('Client password reset error:', error);
      toast.error('Failed to reset password. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // --- Add internal note ---
  const handleAddNote = async () => {
    if (!selectedClient || !noteText.trim()) {
      toast.error('Please enter a note before saving.');
      return;
    }

    setIsSavingNote(true);
    try {
      await addDoc(collection(db, 'client_notes'), {
        clientId: selectedClient.uid,
        note: noteText.trim(),
        flag: noteFlag,
        createdBy: currentUser?.uid,
        createdByEmail: currentUser?.email,
        createdAt: serverTimestamp()
      });

      await logAdminAction({
        action: 'client.note_added',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'client',
        targetId: selectedClient.uid,
        targetLabel: `${selectedClient.firstName} ${selectedClient.lastName}`,
        details: { flag: noteFlag }
      });

      toast.success('Note added.');
      setNoteText('');
      setNoteFlag('none');
    } catch (error) {
      console.error('Failed to add client note:', error);
      toast.error('Failed to add note. Please try again.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const extraProfileFields: Array<{ label: string; value: string }> = [];
  if (rawProfile) {
    if (rawProfile.country) extraProfileFields.push({ label: 'Country', value: String(rawProfile.country) });
    if (rawProfile.nationality) extraProfileFields.push({ label: 'Nationality', value: String(rawProfile.nationality) });
    if (rawProfile.kycStatus) extraProfileFields.push({ label: 'KYC Status', value: String(rawProfile.kycStatus) });
  }

  return (
    <AdminLayout title="Clients" subtitle="Browse and manage client accounts, holdings, and activity">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-lg font-bold text-gray-900">{clients.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-lg font-bold text-gray-900">
                  {clients.filter((c: any) => c.status === 'approved' || c.status === 'active').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-lg font-bold text-gray-900">
                  {clients.filter((c: any) => c.status === 'pending').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Suspended</p>
                <p className="text-lg font-bold text-gray-900">
                  {clients.filter((c: any) => c.status === 'suspended').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Client Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Clients ({filteredClients.length})
            </h3>
          </div>

          {isLoadingClients ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No clients match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client: any) => {
                    const status = client.status || 'pending';
                    const StatusIcon = getStatusIcon(status);
                    return (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-600" />
                            </div>
                            <div className="ml-4 text-sm font-medium text-gray-900">
                              {client.firstName} {client.lastName}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.phoneNumber || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(client.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button size="sm" variant="outline" className="flex items-center" onClick={() => handleViewClient(client)}>
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Client Detail Modal ("Client 360") */}
        {selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedClient.email}</p>
                  </div>
                  <button onClick={handleCloseDetail} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* 1. Profile summary */}
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                    <Users className="w-4 h-4 mr-2 text-blue-600" />
                    Profile Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{selectedClient.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{selectedClient.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          selectedClient.status || 'pending'
                        )}`}
                      >
                        {selectedClient.status || 'pending'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedClient.createdAt)}</p>
                    </div>
                    {extraProfileFields.map((field) => (
                      <div key={field.label}>
                        <p className="text-xs text-gray-500">{field.label}</p>
                        <p className="text-sm font-medium text-gray-900">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 6. Quick actions */}
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                    <Shield className="w-4 h-4 mr-2 text-blue-600" />
                    Quick Actions
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      onClick={handleToggleStatus}
                      disabled={isUpdatingStatus}
                      className={
                        selectedClient.status === 'active' || selectedClient.status === 'approved'
                          ? 'bg-red-600 hover:bg-red-700 text-white flex items-center'
                          : 'bg-green-600 hover:bg-green-700 text-white flex items-center'
                      }
                    >
                      {selectedClient.status === 'active' || selectedClient.status === 'approved' ? (
                        <>
                          <Ban className="w-4 h-4 mr-2" />
                          {isUpdatingStatus ? 'Suspending...' : 'Suspend Client'}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {isUpdatingStatus ? 'Approving...' : 'Approve Client'}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                      onClick={handleResetPassword}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Reset Password
                    </Button>
                  </div>
                </section>

                {/* 2. Linked accounts */}
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                    <Landmark className="w-4 h-4 mr-2 text-blue-600" />
                    Linked Accounts
                  </h4>
                  {isLoadingAccounts ? (
                    <p className="text-sm text-gray-500">Loading accounts...</p>
                  ) : clientAccounts.length === 0 ? (
                    <p className="text-sm text-gray-500">No linked accounts.</p>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {clientAccounts.map((account: any) => (
                            <tr key={account.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {account.accountName || account.accountType || 'Account'}
                                {account.accountNumber && (
                                  <span className="block text-xs text-gray-500">
                                    #{account.accountNumber}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(account.balance)}</td>
                              <td className="px-4 py-2 text-sm">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    account.isActive === false
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {account.status || (account.isActive === false ? 'inactive' : 'active')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* 3. Recent transactions */}
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                    <Receipt className="w-4 h-4 mr-2 text-blue-600" />
                    Recent Transactions
                  </h4>
                  {isLoadingTransactions ? (
                    <p className="text-sm text-gray-500">Loading transactions...</p>
                  ) : recentTransactions.length === 0 ? (
                    <p className="text-sm text-gray-500">No transactions found.</p>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recentTransactions.map((tx: any) => (
                            <tr key={tx.id}>
                              <td className="px-4 py-2 text-sm text-gray-900 capitalize">{tx.type || 'N/A'}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(tx.amount)}</td>
                              <td className="px-4 py-2 text-sm">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                  {tx.status || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">{formatDateTime(tx.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* 4. Portfolio snapshot */}
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                    <LineChart className="w-4 h-4 mr-2 text-blue-600" />
                    Portfolio Snapshot
                  </h4>
                  {isLoadingPositions ? (
                    <p className="text-sm text-gray-500">Loading positions...</p>
                  ) : clientPositions.length === 0 ? (
                    <p className="text-sm text-gray-500">No brokerage positions.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Market Value</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {clientPositions.map((position: any) => (
                              <tr key={position.id}>
                                <td className="px-4 py-2 text-sm text-gray-900 font-medium">{position.symbol}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{position.quantity}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(position.marketValue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 flex items-center justify-end text-sm font-semibold text-gray-900">
                        <Wallet className="w-4 h-4 mr-2 text-blue-600" />
                        Total Portfolio Value: {formatCurrency(portfolioTotal)}
                      </div>
                    </>
                  )}
                </section>

                {/* 5. Internal notes */}
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                    <StickyNote className="w-4 h-4 mr-2 text-blue-600" />
                    Internal Notes
                  </h4>

                  <div className="space-y-3 mb-4">
                    {sortedNotes.length === 0 ? (
                      <p className="text-sm text-gray-500">No internal notes yet.</p>
                    ) : (
                      sortedNotes.map((note: any) => (
                        <div key={note.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${flagColor(note.flag)}`}>
                              {note.flag === 'none' ? 'no flag' : note.flag}
                            </span>
                            <span className="text-xs text-gray-500">{formatDateTime(note.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
                          <p className="text-xs text-gray-500 mt-1">— {note.createdByEmail || 'Unknown admin'}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Add a note</label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write an internal note about this client..."
                      rows={3}
                      className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-600 focus-visible:border-primary-600"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <select
                        value={noteFlag}
                        onChange={(e) => setNoteFlag(e.target.value as 'none' | 'watch' | 'risk')}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">No flag</option>
                        <option value="watch">Watch</option>
                        <option value="risk">Risk</option>
                      </select>
                      <Button size="sm" onClick={handleAddNote} disabled={isSavingNote}>
                        {isSavingNote ? 'Saving...' : 'Add Note'}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Confirmation Modal */}
        {showResetPasswordModal && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Key className="w-5 h-5 text-orange-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                  </div>
                  <button onClick={() => setShowResetPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-orange-800">Password Reset Confirmation</h4>
                      <p className="text-xs text-orange-700 mt-1">
                        This action will generate a new temporary password for this client.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  <p className="text-sm text-gray-700">
                    <strong>Client:</strong> {selectedClient.firstName} {selectedClient.lastName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> {selectedClient.email}
                  </p>
                </div>

                <div className="text-sm text-gray-600 mt-4">
                  <p className="font-medium mb-2">What will happen:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>A new temporary password will be generated</li>
                    <li>Client will be required to change password on next login</li>
                    <li>Password details will be shown in the console</li>
                    <li>You must communicate the password to the client securely</li>
                  </ul>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <Button onClick={() => setShowResetPasswordModal(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmResetPassword}
                    disabled={isResettingPassword}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex items-center"
                  >
                    {isResettingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Reset Password
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageClients;
