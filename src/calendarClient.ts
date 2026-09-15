import {
  BOOKING_DURATION_MINUTES,
  type AvailabilitySlot,
  type BookingConfirmation,
  type BookingDetails,
} from "./bookingFlow";

type FetchLike = typeof fetch;

type CalendarClientOptions = {
  baseUrl: string;
  siteToken: string;
  fetchImpl?: FetchLike;
};

type BookSlotInput = {
  slot: AvailabilitySlot;
  details: BookingDetails;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function validIso(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function adaptAvailability(value: unknown): AvailabilitySlot[] {
  const source = record(value);
  if (!source || !Array.isArray(source.slots)) return [];

  const seen = new Set<string>();
  return source.slots
    .flatMap((candidate) => {
      const slot = record(candidate);
      if (!slot || !validIso(slot.start) || !validIso(slot.end)) return [];
      if (Date.parse(slot.end) <= Date.parse(slot.start) || seen.has(slot.start)) {
        return [];
      }
      seen.add(slot.start);
      return [{ start: slot.start, end: slot.end }];
    })
    .sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
}

export function adaptBookingConfirmation(
  value: unknown,
): BookingConfirmation | null {
  const source = record(value);
  if (
    !source ||
    source.confirmed !== true ||
    !validIso(source.start) ||
    !validIso(source.end) ||
    !validTimezone(source.timezone) ||
    typeof source.duration_minutes !== "number" ||
    !Number.isFinite(source.duration_minutes) ||
    source.duration_minutes <= 0 ||
    typeof source.calendar_status !== "string"
  ) {
    return null;
  }

  return {
    start: source.start,
    end: source.end,
    timezone: source.timezone,
    durationMinutes: source.duration_minutes,
    calendarStatus: source.calendar_status,
    bookingId:
      typeof source.booking_id === "string" ? source.booking_id : null,
  };
}

export function createCalendarClient({
  baseUrl,
  siteToken,
  fetchImpl = fetch,
}: CalendarClientOptions) {
  async function post(path: string, payload: unknown, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(siteToken ? { "X-Site-Token": siteToken } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) throw new Error(`Calendar request failed (${response.status})`);
      return data;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  return {
    async getAvailability(timezone: string): Promise<AvailabilitySlot[]> {
      const data = await post(
        "/v1/availability",
        { timezone, duration_minutes: BOOKING_DURATION_MINUTES },
        20_000,
      );
      return adaptAvailability(data);
    },

    async bookSlot({
      slot,
      details,
    }: BookSlotInput): Promise<BookingConfirmation> {
      const data = await post(
        "/v1/bookings",
        {
          start: slot.start,
          end: slot.end,
          duration_minutes: BOOKING_DURATION_MINUTES,
          timezone: details.timezone,
          attendee: {
            name: details.name,
            email: details.email,
            ...(details.company ? { company: details.company } : {}),
          },
          ...(details.topic ? { topic: details.topic } : {}),
          confirmed: true,
        },
        20_000,
      );
      const confirmation = adaptBookingConfirmation(data);
      if (!confirmation) {
        throw new Error("Booking API did not return an explicit confirmation");
      }
      return confirmation;
    },
  };
}

export type CalendarClient = ReturnType<typeof createCalendarClient>;
