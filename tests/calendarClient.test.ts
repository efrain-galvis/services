import { describe, expect, it, vi } from "vitest";
import {
  adaptAvailability,
  adaptBookingConfirmation,
  createCalendarClient,
} from "../src/calendarClient";

describe("calendar response adapters", () => {
  it("fails closed for missing, malformed, or synthetic availability", () => {
    expect(adaptAvailability({ available: true })).toEqual([]);
    expect(
      adaptAvailability({
        slots: [
          { start: "not-a-date", end: "2026-09-22T14:30:00Z" },
          { start: "2026-09-22T15:00:00Z", end: "2026-09-22T14:30:00Z" },
        ],
      }),
    ).toEqual([]);
  });

  it("accepts only explicit booking confirmations", () => {
    const response = {
      confirmed: true,
      booking_id: "booking-123",
      start: "2026-09-22T14:00:00Z",
      end: "2026-09-22T14:30:00Z",
      timezone: "America/New_York",
      duration_minutes: 30,
      calendar_status: "confirmed",
    };

    expect(adaptBookingConfirmation({ ...response, confirmed: false })).toBeNull();
    expect(adaptBookingConfirmation(response)).toMatchObject({
      bookingId: "booking-123",
      calendarStatus: "confirmed",
    });
  });
});

describe("calendar client contract", () => {
  it("sends the site token and confirmed flag only on final booking", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            confirmed: true,
            start: "2026-09-22T14:00:00Z",
            end: "2026-09-22T14:30:00Z",
            timezone: "America/New_York",
            duration_minutes: 30,
            calendar_status: "confirmed",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    const client = createCalendarClient({
      baseUrl: "https://calendar.example",
      siteToken: "public-site-token",
      fetchImpl,
    });

    await client.bookSlot({
      slot: {
        start: "2026-09-22T14:00:00Z",
        end: "2026-09-22T14:30:00Z",
      },
      details: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        timezone: "America/New_York",
        company: "",
        topic: "Agent evaluation",
      },
    });

    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://calendar.example/v1/bookings");
    expect(request?.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Site-Token": "public-site-token",
    });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      confirmed: true,
      attendee: { name: "Ada Lovelace", email: "ada@example.com" },
      topic: "Agent evaluation",
    });
  });
});
