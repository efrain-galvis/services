export const BOOKING_DURATION_MINUTES = 30;

export type AvailabilitySlot = {
  start: string;
  end: string;
};

export type BookingDetails = {
  name: string;
  email: string;
  timezone: string;
  company: string;
  topic: string;
};

export type BookingConfirmation = {
  start: string;
  end: string;
  timezone: string;
  durationMinutes: number;
  calendarStatus: string;
  bookingId: string | null;
};

export type BookingFlowStatus =
  | "idle"
  | "picking"
  | "confirming"
  | "booking"
  | "confirmed"
  | "failed";

export type BookingFlowState = {
  status: BookingFlowStatus;
  selectedSlot: AvailabilitySlot | null;
  details: BookingDetails | null;
  confirmation: BookingConfirmation | null;
  error: string | null;
};

export const INITIAL_BOOKING_FLOW: BookingFlowState = {
  status: "idle",
  selectedSlot: null,
  details: null,
  confirmation: null,
  error: null,
};

export type BookingFlowAction =
  | { type: "start_picking" }
  | { type: "select_slot"; slot: AvailabilitySlot }
  | { type: "review_details"; details: BookingDetails }
  | { type: "book" }
  | { type: "confirm"; confirmation: BookingConfirmation }
  | { type: "fail"; message: string }
  | { type: "retry" };

export function bookingFlowReducer(
  state: BookingFlowState,
  action: BookingFlowAction,
): BookingFlowState {
  switch (action.type) {
    case "start_picking":
      return { ...INITIAL_BOOKING_FLOW, status: "picking" };
    case "select_slot":
      return {
        ...state,
        status: "picking",
        selectedSlot: action.slot,
        details: null,
        confirmation: null,
        error: null,
      };
    case "review_details":
      if (!state.selectedSlot) return state;
      return {
        ...state,
        status: "confirming",
        details: action.details,
        error: null,
      };
    case "book":
      if (!state.selectedSlot || !state.details) return state;
      return { ...state, status: "booking", error: null };
    case "confirm":
      if (state.status !== "booking") return state;
      return {
        ...state,
        status: "confirmed",
        confirmation: action.confirmation,
        error: null,
      };
    case "fail":
      return { ...state, status: "failed", error: action.message };
    case "retry":
      return {
        ...state,
        status: "picking",
        confirmation: null,
        error: null,
      };
  }
}
