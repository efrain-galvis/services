import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { AgentActivityAction } from "./AgentActivity";
import {
  BOOKING_DURATION_MINUTES,
  INITIAL_BOOKING_FLOW,
  bookingFlowReducer,
  type AvailabilitySlot,
  type BookingDetails,
  type BookingFlowStatus,
} from "./bookingFlow";
import type { CalendarClient } from "./calendarClient";
import { mintMessageId } from "./chatLimits";

type Props = {
  timezone: string;
  client: CalendarClient;
  onStatusChange: (status: BookingFlowStatus) => void;
  dispatchActivity: (action: AgentActivityAction) => void;
};

function formatDay(iso: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(iso));
}

function formatTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(iso));
}

function groupSlots(slots: AvailabilitySlot[], timezone: string) {
  return slots.reduce<Array<{ day: string; slots: AvailabilitySlot[] }>>(
    (groups, slot) => {
      const day = formatDay(slot.start, timezone);
      const current = groups.at(-1);
      if (current?.day === day) current.slots.push(slot);
      else groups.push({ day, slots: [slot] });
      return groups;
    },
    [],
  );
}

export default function BookingWidget({
  timezone,
  client,
  onStatusChange,
  dispatchActivity,
}: Props) {
  const [flow, dispatch] = useReducer(bookingFlowReducer, INITIAL_BOOKING_FLOW);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [availability, setAvailability] = useState<
    "loading" | "available" | "unavailable"
  >("loading");
  const panelRef = useRef<HTMLDivElement>(null);

  const loadAvailability = useCallback(async () => {
    setAvailability("loading");
    setSlots([]);
    dispatch({ type: "start_picking" });
    const activityId = mintMessageId();
    dispatchActivity({
      type: "start",
      id: activityId,
      label: "Checking Efrain’s availability…",
    });
    try {
      const nextSlots = await client.getAvailability(timezone);
      setSlots(nextSlots);
      setAvailability(nextSlots.length ? "available" : "unavailable");
      dispatchActivity({
        type: nextSlots.length ? "succeed" : "fail",
        id: activityId,
      });
    } catch {
      setAvailability("unavailable");
      dispatchActivity({ type: "fail", id: activityId });
    }
  }, [client, dispatchActivity, timezone]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    onStatusChange(flow.status);
  }, [flow.status, onStatusChange]);

  useEffect(() => {
    if (
      flow.status === "confirming" ||
      flow.status === "confirmed" ||
      flow.status === "failed"
    ) {
      panelRef.current?.focus();
    }
  }, [flow.status]);

  const groupedSlots = useMemo(
    () => groupSlots(slots, timezone),
    [slots, timezone],
  );

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    dispatch({
      type: "review_details",
      details: {
        name: String(values.get("name") || "").trim(),
        email: String(values.get("email") || "").trim(),
        timezone: String(values.get("timezone") || timezone).trim(),
        company: String(values.get("company") || "").trim(),
        topic: String(values.get("topic") || "").trim(),
      },
    });
  }

  async function confirmBooking() {
    if (!flow.selectedSlot || !flow.details || flow.status !== "confirming") {
      return;
    }
    const slot = flow.selectedSlot;
    const details = flow.details;
    dispatch({ type: "book" });
    const activityId = mintMessageId();
    dispatchActivity({
      type: "start",
      id: activityId,
      label: "Booking your conversation…",
    });
    try {
      const confirmation = await client.bookSlot({ slot, details });
      dispatch({ type: "confirm", confirmation });
      dispatchActivity({
        type: "succeed",
        id: activityId,
        label: "Calendar booking confirmed.",
      });
    } catch {
      dispatch({
        type: "fail",
        message:
          "The calendar did not confirm this booking. Your details are still here so you can retry.",
      });
      dispatchActivity({ type: "fail", id: activityId });
    }
  }

  if (flow.status === "confirmed" && flow.confirmation) {
    const confirmation = flow.confirmation;
    return (
      <div
        className="booking-confirmation"
        ref={panelRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
      >
        <p className="booking-step">Booking confirmed</p>
        <h3>Your conversation is on the calendar.</h3>
        <dl>
          <div><dt>Date</dt><dd>{formatDay(confirmation.start, confirmation.timezone)}</dd></div>
          <div><dt>Local time</dt><dd>{formatTime(confirmation.start, confirmation.timezone)}</dd></div>
          <div><dt>Timezone</dt><dd>{confirmation.timezone}</dd></div>
          <div><dt>Duration</dt><dd>{confirmation.durationMinutes} minutes</dd></div>
          <div><dt>Calendar status</dt><dd>{confirmation.calendarStatus}</dd></div>
        </dl>
      </div>
    );
  }

  if (flow.status === "confirming" || flow.status === "booking") {
    const details = flow.details as BookingDetails;
    const slot = flow.selectedSlot as AvailabilitySlot;
    return (
      <div
        className="booking-review"
        ref={panelRef}
        tabIndex={-1}
        aria-live="polite"
      >
        <p className="booking-step">Confirm before booking</p>
        <h3>{BOOKING_DURATION_MINUTES}-minute conversation with Efrain</h3>
        <dl>
          <div><dt>Date</dt><dd>{formatDay(slot.start, details.timezone)}</dd></div>
          <div><dt>Local time</dt><dd>{formatTime(slot.start, details.timezone)}</dd></div>
          <div><dt>Timezone</dt><dd>{details.timezone}</dd></div>
          <div><dt>Name</dt><dd>{details.name}</dd></div>
          <div><dt>Email</dt><dd>{details.email}</dd></div>
          <div><dt>Topic</dt><dd>{details.topic || "Not provided"}</dd></div>
        </dl>
        <div className="booking-actions">
          <button
            type="button"
            className="secondary"
            disabled={flow.status === "booking"}
            onClick={() => dispatch({ type: "select_slot", slot })}
          >
            Edit details
          </button>
          <button
            type="button"
            disabled={flow.status === "booking"}
            onClick={() => void confirmBooking()}
          >
            {flow.status === "booking" ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-picker">
      <div className="availability-heading">
        <div>
          <p className="booking-step">Available next week</p>
          <h3>Choose a 30-minute time.</h3>
        </div>
        <span>Times shown in {timezone}</span>
      </div>

      {availability === "loading" && (
        <p className="availability-state" role="status" aria-live="polite">
          Checking the calendar…
        </p>
      )}
      {availability === "unavailable" && (
        <div className="availability-state" role="status" aria-live="polite">
          <p>No verified times are available right now. No placeholder slots are shown.</p>
          <button type="button" className="secondary" onClick={() => void loadAvailability()}>
            Check again
          </button>
        </div>
      )}
      {availability === "available" && (
        <div className="availability-days">
          {groupedSlots.map((group) => (
            <fieldset key={group.day}>
              <legend>{group.day}</legend>
              <div className="slot-list">
                {group.slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.start}
                    aria-pressed={flow.selectedSlot?.start === slot.start}
                    onClick={() => dispatch({ type: "select_slot", slot })}
                  >
                    {formatTime(slot.start, timezone)}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {flow.selectedSlot && (
        <form className="booking-details" onSubmit={review}>
          <p className="selected-time">
            Selected: {formatDay(flow.selectedSlot.start, timezone)} at{" "}
            {formatTime(flow.selectedSlot.start, timezone)}
          </p>
          <label>Name<input name="name" autoComplete="name" maxLength={100} required defaultValue={flow.details?.name} /></label>
          <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required defaultValue={flow.details?.email} /></label>
          <label>Timezone<input name="timezone" maxLength={100} required defaultValue={flow.details?.timezone || timezone} /></label>
          <label>Company <span>(optional)</span><input name="company" autoComplete="organization" maxLength={120} defaultValue={flow.details?.company} /></label>
          <label className="wide">Topic <span>(optional)</span><textarea name="topic" rows={3} maxLength={2000} defaultValue={flow.details?.topic} /></label>
          <button type="submit">Review booking</button>
          {flow.status === "failed" && (
            <p className="form-status error" ref={panelRef} tabIndex={-1} role="alert">
              {flow.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
