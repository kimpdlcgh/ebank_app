import React, { useMemo, useState } from 'react';
import { Search, ShieldCheck, X } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { useAuditLogs } from '../../hooks/useFirestore';
import type { AuditLog as AuditLogEntry } from '../../types';

type DateRangeFilter = 'all' | 'today' | '7d' | '30d';

const formatTimestamp = (value: any): string => {
  return value?.toDate ? value.toDate().toLocaleString() : '—';
};

const formatAction = (action?: string): string => {
  if (!action) return '—';
  return action
    .replace(/[_.]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatActor = (log: AuditLogEntry): string => {
  return log.actorEmail || log.actorId || 'System';
};

const formatTarget = (log: AuditLogEntry): string => {
  if (log.targetType && log.targetLabel) return `${log.targetType} — ${log.targetLabel}`;
  if (log.targetType) return log.targetType;
  if (log.targetLabel) return log.targetLabel;
  return '—';
};

const formatDetailsSummary = (details?: Record<string, any>): string => {
  if (!details || Object.keys(details).length === 0) return '—';
  return Object.entries(details)
    .map(([key, value]) => {
      const displayValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
      return `${key}: ${displayValue}`;
    })
    .join(', ');
};

const isWithinDateRange = (createdAt: any, range: DateRangeFilter): boolean => {
  if (range === 'all') return true;
  if (!createdAt?.toDate) return false;

  const date: Date = createdAt.toDate();
  const now = new Date();

  if (range === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date >= startOfToday;
  }

  const days = range === '7d' ? 7 : 30;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= cutoff;
};

const AuditLog: React.FC = () => {
  const { data, loading } = useAuditLogs();
  const logs = data as unknown as AuditLogEntry[];

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const distinctActions = useMemo(() => {
    const actions = new Set<string>();
    logs.forEach((log) => {
      if (log.action) actions.add(log.action);
    });
    return Array.from(actions).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !term ||
        [log.action, log.actorEmail, log.targetLabel, log.targetType]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(term));

      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesDateRange = isWithinDateRange(log.createdAt, dateRange);

      return matchesSearch && matchesAction && matchesDateRange;
    });
  }, [logs, searchTerm, actionFilter, dateRange]);

  if (loading) {
    return (
      <AdminLayout title="Audit Log" subtitle="Track administrative actions across the platform">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Audit Log" subtitle="Track administrative actions across the platform">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search action, actor, target..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-72"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Actions</option>
              {distinctActions.map((action) => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatActor(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTarget(log)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={formatDetailsSummary(log.details)}>
                      {formatDetailsSummary(log.details)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {logs.length === 0 ? 'No admin activity recorded yet.' : 'No matching audit log entries'}
              </h3>
              {logs.length > 0 && (
                <p className="text-gray-500">Try adjusting your search or filters.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{formatAction(selectedLog.action)}</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div><span className="font-medium text-gray-900">Timestamp:</span> {formatTimestamp(selectedLog.createdAt)}</div>
              <div><span className="font-medium text-gray-900">Actor:</span> {formatActor(selectedLog)}</div>
              <div><span className="font-medium text-gray-900">Target:</span> {formatTarget(selectedLog)}</div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Details</p>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                {selectedLog.details && Object.keys(selectedLog.details).length > 0
                  ? JSON.stringify(selectedLog.details, null, 2)
                  : 'No additional details recorded.'}
              </pre>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AuditLog;
