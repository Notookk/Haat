import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, SkeletonBlock } from '@haat/shared-frontend';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

export interface FormattedSlot {
  id: string;
  slotId: string;
  startTime: string;
  endTime: string;
  label: string;
  maxCapacity: number;
  bookedCount: number;
  remainingCapacity: number;
  status: 'AVAILABLE' | 'FILLING_FAST' | 'SOLD_OUT';
}

interface SlotsResponse {
  slots: FormattedSlot[];
  isBlackout: boolean;
  reason: string | null;
}

interface DeliverySlotPickerProps {
  sellerId: string;
  selectedSlotId: string | null;
  selectedDate: string | null;
  onSelectSlot: (slotId: string, date: string, label: string) => void;
}

export function DeliverySlotPicker({
  sellerId,
  selectedSlotId,
  selectedDate,
  onSelectSlot,
}: DeliverySlotPickerProps) {
  // Generate next 7 days in YYYY-MM-DD
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1); // Starting tomorrow for predictable fulfilment
    const isoDate = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const dayNumber = d.getDate();
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    return { isoDate, dayName, dayNumber, month };
  });

  const [activeDate, setActiveDate] = useState<string>(selectedDate || days[0].isoDate);

  const { data, isLoading, isError } = useQuery<SlotsResponse>({
    queryKey: ['delivery-slots', sellerId, activeDate],
    queryFn: async () => {
      const res = await api.get<SlotsResponse>(`/delivery/slots?sellerId=${sellerId}&date=${activeDate}`);
      return res.data;
    },
    enabled: !!sellerId && !!activeDate,
  });

  const slots = data?.slots || [];
  const isBlackout = data?.isBlackout || false;

  return (
    <div className="space-y-4">
      {/* 7-Day Date Selector */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Select Delivery Date
        </label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {days.map((day) => {
            const isSelected = activeDate === day.isoDate;
            return (
              <button
                key={day.isoDate}
                type="button"
                onClick={() => setActiveDate(day.isoDate)}
                className={`flex min-w-[72px] flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                  isSelected
                    ? 'border-[#0AAD0A] bg-[#0AAD0A]/10 text-[#0AAD0A] ring-1 ring-[#0AAD0A]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-xs font-medium uppercase text-gray-500">{day.dayName}</span>
                <span className="text-lg font-bold leading-tight">{day.dayNumber}</span>
                <span className="text-micro text-gray-400">{day.month}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Slots for Active Date */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Select Time Window
        </label>

        {isLoading ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SkeletonBlock className="h-14 w-full rounded-xl" />
            <SkeletonBlock className="h-14 w-full rounded-xl" />
          </div>
        ) : isBlackout ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{data?.reason || 'No deliveries scheduled on this date by the seller.'}</span>
          </div>
        ) : slots.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">No available delivery slots for this date.</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {slots.map((slot) => {
              const isSelected = selectedSlotId === slot.slotId && selectedDate === activeDate;
              const isSoldOut = slot.status === 'SOLD_OUT';

              return (
                <button
                  key={slot.slotId}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => onSelectSlot(slot.slotId, activeDate, slot.label)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    isSoldOut
                      ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                      : isSelected
                        ? 'border-[#0AAD0A] bg-[#0AAD0A]/10 text-gray-900 ring-2 ring-[#0AAD0A]'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-[#0AAD0A]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock
                      className={`h-4 w-4 ${
                        isSelected ? 'text-[#0AAD0A]' : isSoldOut ? 'text-gray-300' : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold">{slot.label}</div>
                      <div className="text-xs text-gray-400">
                        {isSoldOut ? 'Sold out' : `${slot.remainingCapacity} capacity remaining`}
                      </div>
                    </div>
                  </div>

                  <div>
                    {slot.status === 'SOLD_OUT' && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-micro font-semibold text-gray-500">
                        Full
                      </span>
                    )}
                    {slot.status === 'FILLING_FAST' && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-micro font-semibold text-amber-700">
                        Filling Fast
                      </span>
                    )}
                    {slot.status === 'AVAILABLE' && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-micro font-semibold text-emerald-700">
                        Available
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
