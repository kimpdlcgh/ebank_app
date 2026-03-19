import React, { useMemo, useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Bell, CheckCircle, Trash2, Search, AlertTriangle, Clock } from 'lucide-react';
import { useFirestore } from '../../hooks/useFirestore';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';

type AdminNotificationItem = Record<string, unknown> & { id: string };

type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

const AdminNotifications: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, refetch } = useFirestore(
    'admin_notifications',
    (query) => query.orderByField('timestamp', 'desc'),
    { cacheEnabled: false }
  );

  const notifications = useMemo(() => data as AdminNotificationItem[], [data]);

  const formatTimestamp = (value: unknown) => {
    if (!value) return '—';
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      return (value as { toDate: () => Date }).toDate().toLocaleString();
    }
    if (typeof value === 'number' || typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
    }
    return '—';
  };

  const filteredNotifications = notifications.filter((notification) => {
    const title = (notification.title as string | undefined) || '';
    const message = (notification.message as string | undefined) || '';
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.toLowerCase().includes(searchTerm.toLowerCase());
    const isRead = Boolean(notification.read);
    const matchesFilter = filter === 'all' || !isRead;
    return matchesSearch && matchesFilter;
  });

  const markAsRead = async (notification: AdminNotificationItem) => {
    try {
      await updateDoc(doc(db, 'admin_notifications', notification.id), {
        read: true,
        readAt: serverTimestamp()
      });
      await refetch();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((notification) => !notification.read);
      await Promise.all(
        unreadNotifications.map((notification) =>
          updateDoc(doc(db, 'admin_notifications', notification.id), {
            read: true,
            readAt: serverTimestamp()
          })
        )
      );
      toast.success('All notifications marked as read');
      await refetch();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotification = async (notification: AdminNotificationItem) => {
    try {
      await deleteDoc(doc(db, 'admin_notifications', notification.id));
      toast.success('Notification removed');
      await refetch();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to remove notification');
    }
  };

  const getPriorityBadge = (priority: NotificationPriority | string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <AdminLayout title="Notifications" subtitle="System alerts and administrative activity">
      <div className="p-6 space-y-6">
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search notifications"
                  className="pl-10"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
              </select>
            </div>
            <Button variant="outline" onClick={markAllAsRead}>
              Mark all read
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Admin Notifications</h3>
            <span className="text-xs text-gray-500">{filteredNotifications.length} items</span>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-6 text-sm text-gray-500">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-6 py-6 text-sm text-gray-500">No notifications to show.</div>
            ) : (
              filteredNotifications.map((notification) => {
                const title = (notification.title as string | undefined) || 'Notification';
                const message = (notification.message as string | undefined) || '';
                const priority = (notification.priority as NotificationPriority | string) || 'low';
                const isRead = Boolean(notification.read);

                return (
                  <div key={notification.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getPriorityBadge(priority)}`}>
                        {priority === 'critical' || priority === 'high' ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <Bell className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
                          {!isRead && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{message}</p>
                        <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(notification.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isRead && (
                        <Button size="sm" variant="outline" onClick={() => markAsRead(notification)}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark read
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => deleteNotification(notification)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
