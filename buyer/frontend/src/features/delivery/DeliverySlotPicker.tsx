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

  // Always select the Recommended slot by default
  useEffect(() => {
    if (isLoading) return;

    if (isBlackout) {
      // On blackout dates, clear selection
      return;
    }

    if (slots.length === 0) {
      // When no custom slots configured, the fallback "Delivery will happen shortly" is Recommended
      if (selectedSlotId !== 'express-shortly' || selectedDate !== activeDate) {
        onSelectSlot('express-shortly', activeDate, 'Delivery will happen shortly');
      }
      return;
    }

    const availableSlots = slots.filter((s) => s.status !== 'SOLD_OUT');
    if (availableSlots.length === 0) return;

    // Check if the current selection is valid for this date
    const isCurrentValid = availableSlots.some(
      (s) => s.slotId === selectedSlotId && selectedDate === activeDate,
    );

    if (!isCurrentValid) {
      // Always select the 'Recommended' slot by default (index 1 if available, otherwise first available)
      const recommendedSlot =
        slots[1] && slots[1].status !== 'SOLD_OUT' ? slots[1] : availableSlots[0];

      if (recommendedSlot) {
        onSelectSlot(recommendedSlot.slotId, activeDate, recommendedSlot.label);
      }
    }
  }, [slots, isLoading, isBlackout, activeDate, selectedSlotId, selectedDate, onSelectSlot]);

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
                className={`flex min-w-[76px] flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#16135c] bg-[#16135c] text-white shadow-2xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-[#16135c]/40 hover:bg-gray-50'
                }`}
              >
                <span className={`text-[11px] font-semibold uppercase ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                  {day.dayName}
                </span>
                <span className={`text-lg font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {day.dayNumber}
                </span>
                <span className={`text-micro ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                  {day.month}
                </span>
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
          <button
            type="button"
            onClick={() => onSelectSlot('express-shortly', activeDate, 'Delivery will happen shortly')}
            className={`mt-2 w-full flex cursor-pointer flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all ${
              selectedSlotId === 'express-shortly' && selectedDate === activeDate
                ? 'border-[#16135c] bg-blue-50/70 ring-1 ring-[#16135c] shadow-2xs'
                : 'border-gray-200 bg-white hover:border-[#16135c]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-[#16135c] shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#16135c]">Delivery will happen shortly</div>
                <div className="text-xs text-gray-500">
                  Priority express direct dispatch • Standard seller fulfillment
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-blue-200 bg-blue-100/90 px-2.5 py-0.5 text-[10px] font-bold text-[#16135c]">
                Recommended
              </span>
            </div>
          </button>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {slots.map((slot, index) => {
              const isSelected = selectedSlotId === slot.slotId && selectedDate === activeDate;
              const isSoldOut = slot.status === 'SOLD_OUT';
              const badge =
                index === 0 ? 'Fastest Delivery' : index === 1 ? 'Recommended' : 'Available';
              const badgeClass =
                index === 0
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : index === 1
                    ? 'bg-blue-100 text-[#16135c] border-blue-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200';

              return (
                <button
                  key={slot.slotId}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => onSelectSlot(slot.slotId, activeDate, slot.label)}
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSoldOut
                      ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                      : isSelected
                        ? 'border-[#16135c] bg-blue-50/70 ring-1 ring-[#16135c] shadow-2xs'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-[#16135c]/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Clock
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-[#16135c]' : isSoldOut ? 'text-gray-300' : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <div className={`text-xs font-bold ${isSelected ? 'text-[#16135c]' : 'text-gray-900'}`}>
                        {slot.label}
                      </div>
                      {isSoldOut && (
                        <div className="text-[10px] text-red-500 font-semibold">
                          Sold out
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded-full border px-2 py-0.5 text-micro font-bold ${badgeClass}`}>
                      {badge}
                    </span>
                    {slot.status === 'SOLD_OUT' && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-micro font-semibold text-red-600">
                        Full
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
