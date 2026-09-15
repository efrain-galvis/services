import { describe, expect, it } from "vitest";
import {
  INITIAL_BOOKING_FLOW,
  bookingFlowReducer,
  type BookingDetails,
} from "../src/bookingFlow";

const slot = {
  start: "2026-09-22T14:00:00Z",
  end: "2026-09-22T14:30:00Z",
};

const details: BookingDetails = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  timezone: "America/New_York",
  company: "",
  topic: "Agent evaluation",
};

describe("booking flow reducer", () => {
  it("moves from slot selection through explicit confirmation to success", () => {
    const picking = bookingFlowReducer(INITIAL_BOOKING_FLOW, {
      type: "start_picking",
    });
    const selected = bookingFlowReducer(picking, { type: "select_slot", slot });
    const reviewing = bookingFlowReducer(selected, {
      type: "review_details",
      details,
    });
    const booking = bookingFlowReducer(reviewing, { type: "book" });
    const confirmed = bookingFlowReducer(booking, {
      type: "confirm",
      confirmation: {
        ...slot,
        timezone: details.timezone,
        durationMinutes: 30,
        calendarStatus: "confirmed",
        bookingId: "booking-123",
      },
    });

    expect([
      picking.status,
      selected.status,
      reviewing.status,
      booking.status,
      confirmed.status,
    ]).toEqual(["picking", "picking", "confirming", "booking", "confirmed"]);
    expect(confirmed.confirmation?.calendarStatus).toBe("confirmed");
  });

  it("does not enter confirming or booking without required prior UI steps", () => {
    expect(
      bookingFlowReducer(INITIAL_BOOKING_FLOW, {
        type: "review_details",
        details,
      }),
    ).toBe(INITIAL_BOOKING_FLOW);
    expect(
      bookingFlowReducer(INITIAL_BOOKING_FLOW, { type: "book" }),
    ).toBe(INITIAL_BOOKING_FLOW);
  });

  it("retains the selected slot and private details after booking failure", () => {
    const selected = bookingFlowReducer(
      bookingFlowReducer(INITIAL_BOOKING_FLOW, {
        type: "select_slot",
        slot,
      }),
      { type: "review_details", details },
    );
    const failed = bookingFlowReducer(
      bookingFlowReducer(selected, { type: "book" }),
      { type: "fail", message: "Calendar did not confirm" },
    );

    expect(failed).toMatchObject({
      status: "failed",
      selectedSlot: slot,
      details,
      confirmation: null,
      error: "Calendar did not confirm",
    });
  });
});
