import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type EventSeat = {
  id: string;
  event_id: string;
  label: string;
  section: string | null;
  row_label: string | null;
  seat_number: number;
  seat_type: string | null;
  position_x: number | null;
  position_y: number | null;
  is_active: boolean;
};

interface SeatMapProps {
  eventId: string;
  quantity: number;
  selectedSeatIds: string[];
  onSelectionChange: (seatIds: string[]) => void;
}

export default function SeatMap({
  eventId,
  quantity,
  selectedSeatIds,
  onSelectionChange,
}: SeatMapProps) {
  const [seats, setSeats] = useState<EventSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadSeats = async () => {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("event_seats")
        .select(
          "id,event_id,label,section,row_label,seat_number,seat_type,position_x,position_y,is_active"
        )
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("section", { ascending: true })
        .order("row_label", { ascending: true })
        .order("seat_number", { ascending: true });

      if (!mounted) return;

      if (fetchError) {
        setError(fetchError.message);
        setSeats([]);
      } else {
        setSeats((data ?? []) as EventSeat[]);
      }

      setLoading(false);
    };

    loadSeats();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  const selectedSet = useMemo(
    () => new Set(selectedSeatIds),
    [selectedSeatIds]
  );

  const handleSeatClick = (seatId: string) => {
    const alreadySelected = selectedSet.has(seatId);

    if (alreadySelected) {
      onSelectionChange(
        selectedSeatIds.filter((selectedId) => selectedId !== seatId)
      );
      return;
    }

    if (selectedSeatIds.length >= quantity) {
      return;
    }

    onSelectionChange([...selectedSeatIds, seatId]);
  };

  if (loading) {
    return (
      <div className="rounded-xl border p-4">
        <p className="text-sm text-gray-500">Loading seats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          Unable to load seats: {error}
        </p>
      </div>
    );
  }

  if (seats.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <p className="text-sm text-gray-500">
          No seats are available for this event.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Select your seats</h3>
          <p className="text-sm text-gray-500">
            Select {quantity} seat{quantity === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="text-sm font-medium">
          {selectedSeatIds.length}/{quantity}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {seats.map((seat) => {
          const selected = selectedSet.has(seat.id);

          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => handleSeatClick(seat.id)}
              className={[
                "min-w-[52px] rounded-lg border px-3 py-2 text-sm font-medium transition",
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-500",
              ].join(" ")}
              aria-pressed={selected}
              title={seat.label}
            >
              {seat.label}
            </button>
          );
        })}
      </div>

      {selectedSeatIds.length !== quantity && (
        <p className="text-sm text-amber-600">
          Please select exactly {quantity} seat
          {quantity === 1 ? "" : "s"} before continuing.
        </p>
      )}

      {selectedSeatIds.length === quantity && (
        <p className="text-sm text-green-600">
          {quantity} seat{quantity === 1 ? "" : "s"} selected.
        </p>
      )}
    </div>
  );
}
