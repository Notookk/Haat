import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Edit3,
  CalendarDays,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  api,
  Button,
  Panel,
  SkeletonBlock,
  ErrorState,
  errorMessage,
  showToast,
  showConfirm,
  Badge,
  createSocketClient,
  getAccessToken,
} from '@haat/shared-frontend';
import { SOCKET_EVENTS } from '@haat/shared-contracts';

interface SlotItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  isActive: boolean;
  isDailyRecurring?: boolean;
  createdAt?: string;
}

interface SlotOrdersResponse {
  slot: SlotItem;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalAmountPaise: number;
    fulfilmentStatus: string;
    paymentStatus: string;
    customerName: string;
    customerPhone: string;
    itemsCount: number;
    createdAt: string;
  }>;
}

export function SellerDeliverySlotsPage() {
  const queryClient = useQueryClient();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotItem | null>(null);
  const [viewingSlotId, setViewingSlotId] = useState<string | null>(null);

  // Form states for creating daily slot (NO DATE REQUIRED — applies everyday)
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('11:00');

  // Form states for editing daily slot
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('11:00');
  const [editIsActive, setEditIsActive] = useState(true);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    const token = getAccessToken();
    const socket = createSocketClient({ token });

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'delivery', 'slots'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard', 'stats'] });
      if (viewingSlotId) {
        void queryClient.invalidateQueries({ queryKey: ['seller', 'delivery', 'slot-orders', viewingSlotId] });
      }
    };

    socket.on(SOCKET_EVENTS.DELIVERY_SLOT_CAPACITY_UPDATED, invalidate);
    socket.on(SOCKET_EVENTS.ORDER_CREATED, invalidate);

    return () => {
      socket.disconnect();
    };
  }, [queryClient, viewingSlotId]);

  // Query daily delivery slots (same every day, persistent in MongoDB)
  const { data: slots, isLoading, error, refetch } = useQuery<SlotItem[]>({
    queryKey: ['seller', 'delivery', 'slots'],
    queryFn: async () => {
      const res = await api.get<{ slots: SlotItem[] }>('/api/v1/seller/delivery/slots');
      return res.data.slots;
    },
  });

  // Query orders for specific slot
  const { data: slotOrdersData, isLoading: isSlotOrdersLoading } = useQuery<SlotOrdersResponse>({
    queryKey: ['seller', 'delivery', 'slot-orders', viewingSlotId],
    queryFn: async () => {
      const res = await api.get<SlotOrdersResponse>(`/api/v1/seller/delivery/slots/${viewingSlotId}/orders`);
      return res.data;
    },
    enabled: Boolean(viewingSlotId),
  });

  // Create Daily Slot Mutation (No Date Needed)
  const createMutation = useMutation({
    mutationFn: async (payload: { startTime: string; endTime: string; capacity?: number }) => {
      const res = await api.post<{ slot: SlotItem }>('/api/v1/seller/delivery/slots', {
        ...payload,
        capacity: payload.capacity ?? 9999,
      });
      return res.data.slot;
    },
    onSuccess: (slot) => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'delivery', 'slots'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard', 'stats'] });
      setIsAddModalOpen(false);
      showToast.success('Daily Slot Created', `Daily delivery window (${slot.startTime} - ${slot.endTime}) added successfully.`);
    },
    onError: (err) => {
      showToast.error('Creation Failed', errorMessage(err));
    },
  });

  // Update Slot Mutation
  const updateSlotMutation = useMutation({
    mutationFn: async ({
      slotId,
      payload,
    }: {
      slotId: string;
      payload: { startTime?: string; endTime?: string; capacity?: number; isActive?: boolean };
    }) => {
      const res = await api.patch<{ slot: SlotItem }>(`/api/v1/seller/delivery/slots/${slotId}`, payload);
      return res.data.slot;
    },
    onSuccess: (slot) => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'delivery', 'slots'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard', 'stats'] });
      setEditingSlot(null);
      showToast.success('Slot Updated', `Delivery window (${slot.startTime} - ${slot.endTime}) updated.`);
    },
    onError: (err) => {
      showToast.error('Update Failed', errorMessage(err));
    },
  });

  // Toggle active slot mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ slotId, isActive }: { slotId: string; isActive: boolean }) => {
      const res = await api.patch<{ slot: SlotItem }>(`/api/v1/seller/delivery/slots/${slotId}`, { isActive });
      return res.data.slot;
    },
    onSuccess: (slot) => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'delivery', 'slots'] });
      showToast.info('Slot Updated', `Slot is now ${slot.isActive ? 'Active' : 'Disabled'}.`);
    },
    onError: (err) => {
      showToast.error('Update Failed', errorMessage(err));
    },
  });

  // Delete slot mutation
  const deleteMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const res = await api.delete<{ success: boolean }>(`/api/v1/seller/delivery/slots/${slotId}`);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'delivery', 'slots'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard', 'stats'] });
      showToast.success('Slot Deleted', 'Daily delivery slot removed.');
    },
    onError: (err) => {
      showToast.error('Deletion Failed', errorMessage(err));
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      startTime: formStartTime,
      endTime: formEndTime,
      capacity: 9999,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    updateSlotMutation.mutate({
      slotId: editingSlot.id,
      payload: {
        startTime: editStartTime,
        endTime: editEndTime,
        isActive: editIsActive,
      },
    });
  };

  const openEditModal = (slot: SlotItem) => {
    setEditingSlot(slot);
    setEditStartTime(slot.startTime);
    setEditEndTime(slot.endTime);
    setEditIsActive(slot.isActive);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-display-md text-ink-900 font-extrabold">Scheduled Delivery Slots</h1>
          <p className="mt-1 text-body text-ink-600">
            Configure daily delivery windows and order capacities. Once set, they apply to every operating day automatically.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            className="bg-[#16135c] hover:bg-[#12104b] text-white"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Delivery Slot
          </Button>
        </div>
      </header>

      {/* Info Callout: Explaining Daily Schedule */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-label text-brand-900 flex items-start gap-3 shadow-2xs">
        <CalendarDays className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-ink-900">
            Daily Recurring Schedule — Same Everyday
          </p>
          <p className="text-caption text-ink-600">
            Delivery slots are configured once and automatically repeat for all operating days. Buyers pick their delivery date and select from these active time slots during checkout. You can adjust times and capacities whenever your schedule changes.
          </p>
        </div>
      </div>

      {/* Main Delivery Slots Table */}
      <Panel className="overflow-hidden border border-line shadow-xs">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-surface-elevated">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" />
            <h3 className="text-subtitle font-bold text-ink-900">Daily Operating Slots</h3>
          </div>
          <span className="text-caption text-ink-500">
            {slots ? `${slots.length} daily time window${slots.length === 1 ? '' : 's'} configured` : 'Loading slots...'}
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState message={errorMessage(error) || 'Failed to load delivery slots.'} onRetry={() => void refetch()} />
          </div>
        ) : !slots || slots.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="mx-auto h-12 w-12 text-ink-300 mb-3" />
            <h3 className="text-subtitle font-bold text-ink-900">No delivery slots configured</h3>
            <p className="mt-1 text-caption text-ink-500 max-w-md mx-auto">
              Add your store&apos;s daily delivery time windows so buyers can select convenient delivery timings at checkout.
            </p>
            <Button
              className="mt-4 bg-[#16135c] hover:bg-[#12104b] text-white"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Slot
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-sunken/60 text-micro uppercase tracking-wider text-ink-400 font-bold">
                  <th className="py-3 px-5">Daily Delivery Window</th>
                  <th className="py-3 px-5">Operating Schedule</th>
                  <th className="py-3 px-5">Checkout Availability</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-label">
                {slots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-surface-sunken/40 transition-colors">
                    {/* Time Window */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 border border-brand-200 text-brand-700 shrink-0">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-ink-900 text-body">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span className="block text-micro text-ink-400">
                            Available daily
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 text-ink-700 text-caption font-medium">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Every Operating Day
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-4 px-5">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate({ slotId: slot.id, isActive: !slot.isActive })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-bold border transition-colors cursor-pointer ${
                          slot.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${slot.isActive ? 'bg-emerald-600' : 'bg-slate-400'}`}
                        />
                        {slot.isActive ? 'Active for Checkout' : 'Disabled'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(slot)}
                          title="Edit daily slot"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 text-ink-500 transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await showConfirm({
                              title: 'Remove Delivery Slot?',
                              text: `Are you sure you want to remove the ${slot.startTime} – ${slot.endTime} daily delivery slot? Buyers will no longer be able to select this window at checkout.`,
                              confirmButtonText: 'Yes, remove',
                              danger: true,
                            });
                            if (confirmed) {
                              deleteMutation.mutate(slot.id);
                            }
                          }}
                          title="Delete slot"
                          disabled={deleteMutation.isPending}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 text-ink-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ------------------------------------------------------------- */}
      {/* 1. Modal: Add New Daily Delivery Slot (PORTAL TO DOCUMENT.BODY) */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAddModalOpen(false);
              }
            }}
          >
            <div className="relative w-full max-w-lg rounded-2xl bg-surface p-6 sm:p-7 shadow-2xl border border-line z-[10000] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-title font-bold text-ink-900">New Daily Delivery Slot</h3>
                    <p className="text-micro text-ink-500">Applies automatically to all operating days.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-label font-bold text-ink-800 mb-1">
                      Start Time (HH:MM) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-label text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-label font-bold text-ink-800 mb-1">
                      End Time (HH:MM) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-label text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-surface-sunken border border-line p-3 text-micro text-ink-600">
                  <span className="font-bold text-ink-800">Recurring Rule: </span>
                  This time window will be active every day your store is open. You can edit or disable it anytime.
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#16135c] hover:bg-[#12104b] text-white"
                    loading={createMutation.isPending}
                    loadingLabel="Saving..."
                  >
                    Save Delivery Slot
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Modal: Edit Daily Delivery Slot (PORTAL TO DOCUMENT.BODY) */}
      {/* ------------------------------------------------------------- */}
      {editingSlot &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditingSlot(null);
              }
            }}
          >
            <div className="relative w-full max-w-lg rounded-2xl bg-surface p-6 sm:p-7 shadow-2xl border border-line z-[10000] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-700">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-title font-bold text-ink-900">Edit Delivery Slot</h3>
                    <p className="text-micro text-ink-500">Update daily delivery time window.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-label font-bold text-ink-800 mb-1">
                      Start Time (HH:MM) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-label text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-label font-bold text-ink-800 mb-1">
                      End Time (HH:MM) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-label text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-line-strong accent-brand-600"
                    />
                    <span className="text-label font-bold text-ink-800">
                      Active for Buyer Checkout
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <Button variant="secondary" onClick={() => setEditingSlot(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#16135c] hover:bg-[#12104b] text-white"
                    loading={updateSlotMutation.isPending}
                    loadingLabel="Saving Changes..."
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Modal: Slot Committed Orders Details (PORTAL TO DOCUMENT.BODY) */}
      {/* ------------------------------------------------------------- */}
      {viewingSlotId &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setViewingSlotId(null);
              }
            }}
          >
            <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-surface shadow-2xl border border-line z-[10000]">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-brand-600" />
                  <h3 className="text-title font-bold text-ink-900">Committed Orders for Slot</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingSlotId(null)}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isSlotOrdersLoading ? (
                  <div className="space-y-3">
                    <SkeletonBlock className="h-12 w-full" />
                    <SkeletonBlock className="h-12 w-full" />
                  </div>
                ) : !slotOrdersData || slotOrdersData.orders.length === 0 ? (
                  <div className="text-center py-8 text-ink-500">
                    <p className="text-body font-semibold">No orders booked for this slot yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                    {slotOrdersData.orders.map((o) => (
                      <div key={o.id} className="p-3.5 flex items-center justify-between bg-surface hover:bg-surface-sunken">
                        <div>
                          <p className="font-bold text-ink-900">Order #{o.orderNumber}</p>
                          <p className="text-caption text-ink-500">
                            {o.customerName} • {o.customerPhone} • {o.itemsCount} item(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-ink-900">₹{(o.totalAmountPaise / 100).toFixed(2)}</p>
                          <Badge tone={o.fulfilmentStatus === 'DELIVERED' ? 'success' : 'brand'}>
                            {o.fulfilmentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-line px-6 py-3 bg-surface-elevated flex justify-end">
                <Button variant="secondary" onClick={() => setViewingSlotId(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
