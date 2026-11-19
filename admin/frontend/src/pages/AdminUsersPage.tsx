import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Shield,
  ShoppingBag,
  Store,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { UserRole } from '@haat/shared-contracts';
import {
  api,
  Badge,
  Button,
  CustomSelect,
  Panel,
  SkeletonBlock,
  ErrorState,
  EmptyState,
  formatDate,
  showToast,
} from '@haat/shared-frontend';

interface UserItem {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: UserItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<UserItem | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const roleFilter = searchParams.get('role') || 'ALL';
  const statusFilter = searchParams.get('status') || 'ALL';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const { data, isLoading, error, refetch } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', roleFilter, statusFilter, searchParams.get('search'), currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchParams.get('search')) params.set('search', searchParams.get('search')!);
      params.set('page', String(currentPage));
      params.set('limit', '20');

      const response = await api.get<UserItem[]>(`/api/v1/admin/users?${params.toString()}`);
      return {
        data: response.data || [],
        meta: response.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ userId, isActive, reason }: { userId: string; isActive: boolean; reason: string }) => {
      await api.patch(`/api/v1/admin/users/${userId}/status`, { isActive, reason });
    },
    onSuccess: (_, variables) => {
      setStatusModalUser(null);
      setStatusReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      showToast.success(
        variables.isActive ? 'Account activated' : 'Account deactivated',
        'User access permissions updated successfully.',
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      showToast.error('Operation failed', msg);
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchParams.set('search', searchTerm.trim());
    } else {
      searchParams.delete('search');
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const setFilter = (key: string, value: string) => {
    if (value === 'ALL') {
      searchParams.delete(key);
    } else {
      searchParams.set(key, value);
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const roleTone = (role: UserRole): 'brand' | 'success' | 'warning' | 'neutral' => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'brand';
      case 'SELLER':
        return 'warning';
      case 'BUYER':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const users = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">Platform Users &amp; Roles</h1>
          <p className="mt-1 text-caption text-ink-500">
            Global directory of buyers, verified merchants, and platform administrators.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Panel className="p-4 shadow-card border border-line bg-surface">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Role tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-3 lg:border-b-0 lg:pb-0">
            {(['ALL', 'BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilter('role', r)}
                className={`rounded-md px-3 py-1.5 text-caption font-semibold transition-colors cursor-pointer ${
                  roleFilter === r
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-surface-sunken text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Status and Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-40">
              <CustomSelect
                size="sm"
                value={statusFilter}
                onChange={(val) => setFilter('status', val)}
                aria-label="Filter by account status"
                placeholder="All Statuses"
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active Only' },
                  { value: 'INACTIVE', label: 'Deactivated' },
                ]}
              />
            </div>

            <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email, phone..."
                aria-label="Search users"
                className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-caption text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            </form>
          </div>
        </div>
      </Panel>

      {/* Users Data Table */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-14 w-full rounded-lg" />
          <SkeletonBlock className="h-14 w-full rounded-lg" />
          <SkeletonBlock className="h-14 w-full rounded-lg" />
          <SkeletonBlock className="h-14 w-full rounded-lg" />
        </div>
      ) : error || !data ? (
        <ErrorState message="Failed to load platform users" onRetry={() => void refetch()} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try broadening your search term or selecting 'All Roles'."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSearchParams({});
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto admin-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-sunken text-micro font-bold uppercase tracking-wider text-ink-500">
                  <th className="py-3.5 px-4">User / Name</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Contact Details</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-caption text-ink-800">
                {users.map((item) => (
                  <tr key={item._id} className="hover:bg-surface-sunken/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-ink-900">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-bold text-micro">
                          {item.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-ink-900 leading-tight">{item.fullName}</p>
                          <p className="font-mono text-micro text-ink-400 mt-0.5">{item._id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge tone={roleTone(item.role)}>{item.role}</Badge>
                    </td>

                    <td className="py-3.5 px-4 text-ink-600">
                      <div>
                        {item.email ? <p className="text-caption">{item.email}</p> : null}
                        <p className="font-mono text-micro text-ink-500">{item.phoneNumber}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-micro font-semibold text-success-fg border border-success-fg/20">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-2.5 py-0.5 text-micro font-semibold text-danger-fg border border-danger-fg/20">
                          <XCircle className="h-3 w-3" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-ink-500">
                      <div className="flex items-center gap-1 text-micro">
                        <Calendar className="h-3.5 w-3.5 text-ink-400" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(item)}
                          className="text-ink-600 hover:text-ink-900"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>

                        {item.role !== 'SUPER_ADMIN' ? (
                          <Button
                            variant={item.isActive ? 'ghost' : 'secondary'}
                            size="sm"
                            onClick={() => {
                              setStatusModalUser(item);
                              setStatusReason('');
                            }}
                            className={item.isActive ? 'text-danger-fg hover:bg-danger-bg' : 'text-success-fg'}
                          >
                            {item.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-3 text-caption text-ink-500">
            <span>
              Showing {users.length} of {data.meta.total} registered users
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={data.meta.page <= 1}
                onClick={() => {
                  searchParams.set('page', String(data.meta.page - 1));
                  setSearchParams(searchParams);
                }}
              >
                Previous
              </Button>
              <span className="text-micro font-mono">
                {data.meta.page} / {data.meta.totalPages || 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={data.meta.page >= data.meta.totalPages}
                onClick={() => {
                  searchParams.set('page', String(data.meta.page + 1));
                  setSearchParams(searchParams);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Drawer Modal */}
      {selectedUser
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in-50">
              <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-modal border border-line">
                <div className="flex items-start justify-between border-b border-line pb-4">
                  <div>
                    <h3 className="text-h3 font-bold text-ink-900">{selectedUser.fullName}</h3>
                    <p className="text-caption text-ink-500">User ID: {selectedUser._id}</p>
                  </div>
                  <Badge tone={roleTone(selectedUser.role)}>{selectedUser.role}</Badge>
                </div>

                <div className="mt-4 space-y-3 text-caption">
                  <div className="grid grid-cols-2 gap-3 bg-surface-sunken p-3 rounded-lg border border-line">
                    <div>
                      <span className="text-micro uppercase text-ink-400 font-bold">Email</span>
                      <p className="font-medium text-ink-800">{selectedUser.email || 'None'}</p>
                    </div>
                    <div>
                      <span className="text-micro uppercase text-ink-400 font-bold">Phone</span>
                      <p className="font-mono text-ink-800">{selectedUser.phoneNumber}</p>
                    </div>
                    <div>
                      <span className="text-micro uppercase text-ink-400 font-bold">Status</span>
                      <p className="font-medium">{selectedUser.isActive ? 'Active' : 'Deactivated'}</p>
                    </div>
                    <div>
                      <span className="text-micro uppercase text-ink-400 font-bold">Joined On</span>
                      <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="secondary" size="md" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Status Toggle Modal */}
      {statusModalUser
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in-50">
              <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-modal border border-line">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      statusModalUser.isActive ? 'bg-danger-bg text-danger-fg' : 'bg-success-bg text-success-fg'
                    }`}
                  >
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-h3 font-bold text-ink-900">
                      {statusModalUser.isActive ? 'Deactivate User Account' : 'Reactivate User Account'}
                    </h3>
                    <p className="text-caption text-ink-500">Target: {statusModalUser.fullName}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label htmlFor="status-reason" className="block text-label font-semibold text-ink-800">
                    Audit Reason <span className="text-danger-fg">*</span>
                  </label>
                  <textarea
                    id="status-reason"
                    rows={3}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="State the administrative or compliance justification..."
                    className="w-full rounded-lg border border-line bg-surface p-3 text-caption text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="md"
                    disabled={statusMutation.isPending}
                    onClick={() => setStatusModalUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={statusModalUser.isActive ? 'danger' : 'primary'}
                    size="md"
                    disabled={statusMutation.isPending || statusReason.trim().length < 3}
                    onClick={() =>
                      statusMutation.mutate({
                        userId: statusModalUser._id,
                        isActive: !statusModalUser.isActive,
                        reason: statusReason.trim(),
                      })
                    }
                  >
                    {statusMutation.isPending ? 'Updating…' : 'Confirm Action'}
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
