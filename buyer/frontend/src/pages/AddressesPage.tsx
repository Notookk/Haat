import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Phone,
  Home,
  Building,
  Briefcase,
  X,
  Loader2,
  AlertCircle,
  Star,
} from 'lucide-react';
import { api, showToast, SkeletonBlock, ErrorState, showConfirm } from '@haat/shared-frontend';
import { useAuth } from '../features/auth/AuthProvider';

export interface AddressItem {
  _id: string;
  userId: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddressFormData {
  label: string;
  recipientName: string;
  phoneNumber: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const INITIAL_FORM: AddressFormData = {
  label: 'Home',
  recipientName: '',
  phoneNumber: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

export function AddressesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: addressesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ addresses: AddressItem[] }>({
    queryKey: ['buyer-addresses'],
    queryFn: async () => {
      const res = await api.get<{ addresses: AddressItem[] }>('/addresses');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: AddressFormData }) => {
      if (id) {
        const res = await api.patch<{ address: AddressItem }>(`/addresses/${id}`, data);
        return res.data;
      } else {
        const res = await api.post<{ address: AddressItem }>('/addresses', data);
        return res.data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buyer-addresses'] });
      setModalOpen(false);
      setEditingId(null);
      setFormData(INITIAL_FORM);
      showToast.success(variables.id ? 'Address Updated' : 'Address Added', 'Your delivery address has been saved.');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to save address';
      setFormError(msg);
      showToast.error('Save Failed', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/addresses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-addresses'] });
      showToast.info('Address Deleted', 'The delivery address was removed.');
    },
    onError: (err: any) => {
      showToast.error('Delete Failed', err.response?.data?.message || 'Unable to delete address');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<{ address: AddressItem }>(`/addresses/${id}/default`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-addresses'] });
      showToast.success('Default Updated', 'Default delivery address changed successfully.');
    },
    onError: (err: any) => {
      showToast.error('Action Failed', err.response?.data?.message || 'Unable to set default address');
    },
  });

  if (status === 'booting') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <SkeletonBlock className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-48 rounded-2xl" />
          <SkeletonBlock className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-[#16135c] mb-4">
          <MapPin size={32} />
        </div>
        <h1 className="text-2xl font-bold text-[#16135c]">Sign In to View Addresses</h1>
        <p className="mt-2 text-sm text-gray-500">
          Save your home, office, and store locations to quickly select them during checkout.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/login?redirect=/addresses"
            className="rounded-xl bg-[#16135c] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#12104b] transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  const addresses = addressesData?.addresses || [];

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      ...INITIAL_FORM,
      recipientName: user?.fullName || '',
      phoneNumber: user?.phoneNumber || '',
      isDefault: addresses.length === 0,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (addr: AddressItem) => {
    setEditingId(addr._id);
    setFormData({
      label: addr.label || 'Home',
      recipientName: addr.recipientName,
      phoneNumber: addr.phoneNumber,
      line1: addr.line1,
      line2: addr.line2 || '',
      landmark: addr.landmark || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Delivery Address?',
      text: `Are you sure you want to delete the delivery address for "${name}"?`,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      danger: true,
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.recipientName.trim()) {
      setFormError('Recipient name is required');
      return;
    }
    if (!formData.phoneNumber.match(/^[6-9]\d{9}$/)) {
      setFormError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!formData.line1.trim()) {
      setFormError('Street address line 1 is required');
      return;
    }
    if (!formData.city.trim()) {
      setFormError('City is required');
      return;
    }
    if (!formData.state.trim()) {
      setFormError('State is required');
      return;
    }
    if (!formData.pincode.match(/^\d{6}$/)) {
      setFormError('Please enter a valid 6-digit pincode');
      return;
    }

    saveMutation.mutate({ id: editingId || undefined, data: formData });
  };

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('office') || l.includes('work')) return <Briefcase size={14} />;
    if (l.includes('warehouse') || l.includes('store') || l.includes('shop')) return <Building size={14} />;
    return <Home size={14} />;
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-16">
      {/* Header Bar */}
      <div className="border-b border-gray-200/80 bg-white py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Link to="/" className="hover:text-[#16135c]">
                  Home
                </Link>
                <span>/</span>
                <span className="text-[#16135c]">Addresses</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#16135c] sm:text-3xl">
                My Addresses
              </h1>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Manage and set your delivery addresses for seamless checkout and scheduled deliveries.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16135c] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#12104b] transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Add New Address</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonBlock className="h-44 rounded-2xl" />
            <SkeletonBlock className="h-44 rounded-2xl" />
          </div>
        ) : isError ? (
          <ErrorState message="Failed to load your addresses." onRetry={() => void refetch()} />
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-2xs">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-50 text-gray-400">
              <MapPin size={28} />
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">No Addresses Saved Yet</h3>
            <p className="mt-1.5 text-xs text-gray-500 max-w-sm mx-auto">
              Add your delivery address to have your scheduled orders delivered accurately to your doorstep.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#16135c] px-4 py-2 text-xs font-bold text-white hover:bg-[#12104b] transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Your First Address</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs transition-all ${
                  addr.isDefault
                    ? 'border-[#0AAD0A] ring-1 ring-[#0AAD0A]/20'
                    : 'border-gray-200/90 hover:border-gray-300 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {getLabelIcon(addr.label)}
                      <span className="capitalize">{addr.label}</span>
                    </span>

                    {addr.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-[#0AAD0A]">
                        <CheckCircle2 size={12} />
                        <span>Default Address</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDefaultMutation.mutate(addr._id)}
                        disabled={setDefaultMutation.isPending}
                        className="text-[11px] font-semibold text-[#16135c] hover:underline cursor-pointer"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>

                  {/* Recipient Details */}
                  <h4 className="text-base font-bold text-gray-900 leading-snug">
                    {addr.recipientName}
                  </h4>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                    <Phone size={13} className="text-gray-400" />
                    <span>{addr.phoneNumber}</span>
                  </div>

                  {/* Street & Postal Address */}
                  <div className="mt-3 text-xs text-gray-600 leading-relaxed space-y-0.5">
                    <p className="font-medium text-gray-800">{addr.line1}</p>
                    {addr.line2 ? <p>{addr.line2}</p> : null}
                    {addr.landmark ? (
                      <p className="text-gray-500 italic">Landmark: {addr.landmark}</p>
                    ) : null}
                    <p className="font-medium text-gray-900 pt-0.5">
                      {addr.city}, {addr.state} – {addr.pincode}
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(addr)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr._id, addr.recipientName)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Address Modal Overlay */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#16135c]">
                  <MapPin size={18} />
                </div>
                <h3 className="text-lg font-bold text-[#16135c]">
                  {editingId ? 'Edit Address' : 'Add New Address'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Error Banner */}
            {formError ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            {/* Address Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Address Type / Label Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Address Type (Label)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Home', 'Office', 'Warehouse', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setFormData({ ...formData, label: lbl })}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        formData.label.toLowerCase() === lbl.toLowerCase()
                          ? 'bg-[#16135c] text-white shadow-2xs'
                          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {getLabelIcon(lbl)}
                      <span>{lbl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    placeholder="e.g. Gourab Majumdar"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    10-Digit Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                  />
                </div>
              </div>

              {/* Street Address Line 1 */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Flat, House No., Building, Apartment, Street *
                </label>
                <input
                  type="text"
                  required
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  placeholder="e.g. Flat 402, Lotus Residency, MG Road"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                />
              </div>

              {/* Line 2 (Area / Sector) & Landmark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Area, Sector, Colony (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.line2}
                    onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                    placeholder="e.g. Sector 14, Indiranagar"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="e.g. Near City Hospital"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                  />
                </div>
              </div>

              {/* City, State & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Kolkata"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. West Bengal"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    6-Digit Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="700001"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                  />
                </div>
              </div>

              {/* Default Address Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultCheckbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#16135c] focus:ring-[#16135c] cursor-pointer"
                />
                <label
                  htmlFor="isDefaultCheckbox"
                  className="text-xs font-medium text-gray-700 cursor-pointer"
                >
                  Set as my default delivery address
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#16135c] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#12104b] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingId ? 'Update Address' : 'Save Address'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
