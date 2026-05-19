import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { format } from 'date-fns';

export function AuditLogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: adminApi.getAuditLogs,
  });

  if (isLoading) return <div className="p-6">Loading audit logs...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h1>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Timestamp</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Admin</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Action</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Target Owner</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log: any) => (
              <tr key={log._id}>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                </td>
                <td className="px-4 py-2 text-sm">
                  {log.superAdminId?.name} ({log.superAdminId?.email})
                </td>
                <td className="px-4 py-2 text-sm font-medium text-primary">
                  {log.action}
                </td>
                <td className="px-4 py-2 text-sm">
                  {log.targetOwnerId ? `${log.targetOwnerId.name} (${log.targetOwnerId.email})` : '-'}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {log.ipAddress || '-'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
