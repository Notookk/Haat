import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
  IndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  api,
  Panel,
  Badge,
  SkeletonBlock,
  ErrorState,
  EmptyState,
  money,
  formatDate,
} from '@haat/shared-frontend';

interface TransactionItem {
  id: string;
  transactionId: string;
  order: { orderNumber?: string; totalAmountPaise?: number; paymentStatus?: string } | null;
  buyer: { fullName?: string; email?: string; phoneNumber?: string } | null;
  seller: { storeName?: string; storeSlug?: string } | null;
  amountPaise: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: TransactionItem[];
  metrics: {
    totalTransactions: number;
    totalVolumePaise: number;
  };
}

export function AdminTransactionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading, isError, error, refetch } = useQuery<TransactionsResponse>({
    queryKey: ['admin-transactions', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await api.get<TransactionsResponse>(`/admin/transactions?${params.toString()}`);
      return res.data;
    },
  });

  const transactions = data?.transactions || [];
  const metrics = data?.metrics || { totalTransactions: 0, totalVolumePaise: 0 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'PAID':
        return <Badge tone="success">Settled</Badge>;
      case 'PENDING':
        return <Badge tone="warning">Pending</Badge>;
      case 'FAILED':
        return <Badge tone="danger">Failed</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Financial Transactions</h1>
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
            Work in Progress
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          Supervisory audit trail of platform payments, gateway intents and settlement records. (Read-Only)
        </p>
      </div>

      {/* Work In Progress Notice Box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-amber-950">
                Payment Gateway Reconciliation &amp; Settlement Under Active Staging
              </h4>
            </div>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              Automated payment gateway reconciliation, escrow disbursement, and merchant settlement ledgers are currently in active staging development. Operational transaction logs and gateway audit trails will appear here once gateway webhook settlement is fully enabled.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Total Transactions</p>
              <h3 className="mt-2 text-2xl font-bold text-ink-900">{metrics.totalTransactions}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Settled Volume</p>
              <h3 className="mt-2 text-2xl font-bold text-ink-900">{money(metrics.totalVolumePaise)}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <IndianRupee className="h-6 w-6" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Filter and Search Bar */}
      <Panel className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search by transaction reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas pl-9 pr-4 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">All Payment States</option>
              <option value="SUCCESS">Settled / Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
      </Panel>

      {/* Transactions Table */}
      <Panel className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-6">
            <SkeletonBlock className="h-8 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorState message={(error as any)?.message || 'Failed to load transactions'} onRetry={refetch} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<CreditCard className="h-10 w-10 text-ink-300" />}
              title="No transactions found"
              description="No financial settlement records match the current filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-600">
              <thead className="border-b border-line bg-canvas-muted text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Transaction ID</th>
                  <th className="px-6 py-3 font-semibold">Order</th>
                  <th className="px-6 py-3 font-semibold">Buyer</th>
                  <th className="px-6 py-3 font-semibold">Seller</th>
                  <th className="px-6 py-3 font-semibold">Method</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-canvas-subtle">
                    <td className="px-6 py-4 font-mono font-medium text-ink-900">{t.transactionId}</td>
                    <td className="px-6 py-4 font-mono text-ink-600">{t.order?.orderNumber || '–'}</td>
                    <td className="px-6 py-4 text-ink-800">{t.buyer?.fullName || 'Customer'}</td>
                    <td className="px-6 py-4 text-ink-800">{t.seller?.storeName || 'Merchant'}</td>
                    <td className="px-6 py-4 text-xs font-semibold uppercase text-ink-500">{t.paymentMethod}</td>
                    <td className="px-6 py-4 font-semibold text-ink-900">{money(t.amountPaise)}</td>
                    <td className="px-6 py-4">{getStatusBadge(t.paymentStatus)}</td>
                    <td className="px-6 py-4 text-xs text-ink-400">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
