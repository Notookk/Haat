import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Search, Filter, Code2, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { api, Badge, Button, CustomSelect, Panel, SkeletonBlock, ErrorState, EmptyState, formatDate } from '@haat/shared-frontend';

interface AuditLogItem {
  _id: string;
  actorUserId?: {
    _id: string;
    fullName: string;
    email?: string;
    phoneNumber?: string;
    role: string;
  };
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function AdminAuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const actionFilter = searchParams.get('action') || '';
  const entityFilter = searchParams.get('entityType') || '';
  const searchQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  const [inspectingLog, setInspectingLog] = useState<AuditLogItem | null>(null);

  const { data, isLoading, error, refetch } = useQuery<AuditLogsResponse>({
    queryKey: ['admin', 'audit-logs', page, actionFilter, entityFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await api.get<AuditLogItem[]>(`/api/v1/admin/audit-logs?${params.toString()}`);
      return {
        data: response.data,
        meta: (response as unknown as { meta: AuditLogsResponse['meta'] }).meta || {
          page,
          limit: 20,
          total: response.data.length,
          totalPages: 1,
        },
      };
    },
  });

  const logs = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchParams.set('q', searchTerm.trim());
    } else {
      searchParams.delete('q');
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const setFilter = (key: string, val: string) => {
    if (val) {
      searchParams.set(key, val);
    } else {
      searchParams.delete(key);
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const setPageNumber = (newPage: number) => {
    searchParams.set('page', String(newPage));
    setSearchParams(searchParams);
  };

  const getToneForAction = (action: string) => {
    if (action.includes('APPROVED')) return 'success';
    if (action.includes('REJECTED') || action.includes('SUSPENDED')) return 'danger';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">Immutable Audit Log</h1>
          <p className="mt-1 text-caption text-ink-500">
            Cryptographically sealed, append-only security trail of all administrative actions and state modifications.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, entity ID, or IP..."
            className="w-full rounded-md border border-line bg-surface pl-8 pr-3 py-1.5 text-caption text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
        </form>

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Entity Type Dropdown */}
          <div className="w-44">
            <CustomSelect
              size="sm"
              value={entityFilter}
              onChange={(val) => setFilter('entityType', val)}
              placeholder="All Entities"
              options={[
                { value: '', label: 'All Entities' },
                { value: 'SellerProfile', label: 'SellerProfile' },
                { value: 'Product', label: 'Product' },
                { value: 'Category', label: 'Category' },
                { value: 'User', label: 'User' },
              ]}
            />
          </div>

          {/* Action Filter Dropdown */}
          <div className="w-56">
            <CustomSelect
              size="sm"
              value={actionFilter}
              onChange={(val) => setFilter('action', val)}
              placeholder="All Actions"
              options={[
                { value: '', label: 'All Actions' },
                { value: 'SELLER_APPROVED', label: 'SELLER_APPROVED' },
                { value: 'SELLER_REJECTED', label: 'SELLER_REJECTED' },
                { value: 'SELLER_BLOCKED', label: 'SELLER_BLOCKED' },
                { value: 'SELLER_UNBLOCKED', label: 'SELLER_UNBLOCKED' },
                { value: 'PRODUCT_APPROVED', label: 'PRODUCT_APPROVED' },
                { value: 'PRODUCT_SUSPENDED', label: 'PRODUCT_SUSPENDED' },
                { value: 'CATEGORY_CREATE', label: 'CATEGORY_CREATE' },
              ]}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
      ) : error ? (
        <ErrorState message="Failed to load audit trail" onRetry={() => void refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit entries found"
          description="No administrative logs match your current search and filter criteria."
        />
      ) : (
        <Panel className="overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-label">
              <thead className="border-b border-line bg-surface-sunken text-micro font-bold uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity &amp; Target ID</th>
                  <th className="px-5 py-3">Administrator</th>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-surface-sunken/40">
                    <td className="px-5 py-3.5 text-caption font-mono text-ink-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={getToneForAction(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-caption font-mono text-ink-800">
                      <div className="font-semibold text-ink-900">{log.entityType}</div>
                      <div className="text-micro text-ink-400 truncate max-w-[160px]">{log.entityId}</div>
                    </td>
                    <td className="px-5 py-3.5 text-caption">
                      {log.actorUserId ? (
                        <div>
                          <div className="font-semibold text-ink-900 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-ink-400" />
                            {log.actorUserId.fullName}
                          </div>
                          <div className="text-micro text-ink-400">{log.actorUserId.email || log.actorUserId.role}</div>
                        </div>
                      ) : (
                        <span className="text-ink-400 text-micro">System</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-caption font-mono text-ink-500">{log.ipAddress || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInspectingLog(log)}
                        title="Inspect full audit metadata"
                      >
                        <Code2 className="h-3.5 w-3.5 mr-1" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-line px-5 py-3 bg-surface-sunken/40">
              <span className="text-caption text-ink-500">
                Page {meta.page} of {meta.totalPages} ({meta.total} total events)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={meta.page <= 1}
                  onClick={() => setPageNumber(meta.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPageNumber(meta.page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : null}
        </Panel>
      )}

      {/* Metadata JSON Inspector Modal */}
      {inspectingLog
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 animate-in fade-in-50">
              <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-brand-600" />
                    <h3 className="text-title font-bold text-ink-900">Audit Record Details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingLog(null)}
                    className="text-ink-400 hover:text-ink-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-caption">
                  <div className="grid grid-cols-2 gap-2 rounded bg-surface-sunken p-2.5 text-micro font-mono">
                    <div>
                      <span className="text-ink-400">Action:</span> {inspectingLog.action}
                    </div>
                    <div>
                      <span className="text-ink-400">Entity:</span> {inspectingLog.entityType}
                    </div>
                    <div>
                      <span className="text-ink-400">Target ID:</span> {inspectingLog.entityId}
                    </div>
                    <div>
                      <span className="text-ink-400">IP:</span> {inspectingLog.ipAddress || '—'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-label font-semibold text-ink-800 mb-1">Captured Event Metadata</label>
                    <pre className="max-h-60 overflow-y-auto rounded-lg border border-line bg-slate-950 p-3.5 font-mono text-micro text-emerald-400">
                      {JSON.stringify(inspectingLog.metadata, null, 2)}
                    </pre>
                  </div>

                  <p className="text-micro text-ink-400 italic">
                    This log is stored with append-only guarantees at the database model layer. Modifications and deletions
                    are strictly rejected.
                  </p>
                </div>

                <div className="mt-5 flex justify-end border-t border-line pt-3">
                  <Button variant="secondary" size="sm" onClick={() => setInspectingLog(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
