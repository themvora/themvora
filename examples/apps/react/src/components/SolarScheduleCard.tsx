import { useEffectiveThemeMode, useTheme, useThemeSchedule } from "@themvora/react";

/**
 * The sunrise/sunset schedule, and the difference between the mode the visitor
 * asked for and the mode that is actually on screen.
 *
 * The two are deliberately separate values. `mode` is the standing request and
 * does not move when the sun sets; `effectiveMode` is what is applied. A control
 * that states the current appearance has to read the second one — binding a
 * label to `mode` is what made it announce the old appearance after a scheduled
 * transition until the page was reloaded.
 *
 * The schedule starts disabled (see `main.tsx`) so the example behaves the same
 * whatever time you open it; turning it on applies the right theme immediately.
 */
export default function SolarScheduleCard() {
  const schedule = useThemeSchedule();
  const { mode } = useTheme();
  const effectiveMode = useEffectiveThemeMode();

  if (!schedule) {
    return null;
  }

  const time = (value: Date | null) =>
    value
      ? value.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <section
      aria-label="Sunrise and sunset schedule"
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2 className="text-lg font-semibold">Solar schedule</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          from <code>useThemeSchedule()</code>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (schedule.enabled ? schedule.disable() : schedule.enable())}
          aria-pressed={schedule.enabled}
          className="cursor-pointer rounded-md bg-primary px-4 py-2 text-primary-foreground transition hover:brightness-110 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-(--theme-color-ring)"
        >
          {schedule.enabled ? "Turn the schedule off" : "Turn the schedule on"}
        </button>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Sunrise</dt>
            <dd className="font-mono">{time(schedule.sunrise)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sunset</dt>
            <dd className="font-mono">{time(schedule.sunset)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Next change</dt>
            <dd className="font-mono">{time(schedule.nextTransition?.at ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Appearance</dt>
            {/* The label that used to go stale: it follows the applied theme,
                not the configured mode. */}
            <dd className="font-mono" data-tv-readout="effective-mode">
              {effectiveMode}
              {mode === "system" ? " (system)" : null}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Configured mode: <code>{mode}</code> · applied: <code>{effectiveMode}</code>. The
        schedule changes the second one; the first is the visitor&apos;s standing
        request and is never rewritten by a sunset.
      </p>
    </section>
  );
}
