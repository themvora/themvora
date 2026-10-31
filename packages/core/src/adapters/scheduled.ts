import {
  resolveSolarLocation,
  type SolarLocationInput,
} from "./timezone-location";

/**
 * Options for {@link createScheduledThemeBinding}.
 *
 * The binding applies a light theme during daytime and a dark theme at night,
 * based on sunrise/sunset at a resolved location, re-checking on an interval.
 */
export interface ScheduledThemeBindingOptions<T> {
  /** Theme applied between sunrise and sunset. */
  lightTheme: T;
  /** Theme applied between sunset and sunrise. */
  darkTheme: T;
  /** Explicit latitude. Optional — when omitted the binding resolves the
   *  location from `timeZone` or the visitor's browser timezone. */
  latitude?: number;
  /** Explicit longitude. Optional — see `latitude`. */
  longitude?: number;
  /** IANA timezone to resolve coordinates from when `latitude`/`longitude`
   *  are omitted (e.g. `"Asia/Kathmandu"`). */
  timeZone?: string;
  /** Auto-detect the visitor's location from their browser timezone when no
   *  explicit coordinates/timezone are given. Default `true`.
   *  @defaultValue `true` */
  autoDetectLocation?: boolean;
  /** How often (ms) the binding re-checks solar time.
   *  @defaultValue `60000` */
  checkInterval?: number;
  /** Override the sunrise/sunset computation. Defaults to
   *  {@link calculateSunTimes}. A custom implementation may omit `polar`; the
   *  binding then falls back to the `sunrise <= now < sunset` interval. */
  getTimes?: (date: Date, latitude: number, longitude: number) => SunTimes;
  /** Ignore schedule-driven applies within this many ms after a manual
   *  selection (e.g. a cross-tab sync). @defaultValue `0` */
  skipApplyMs?: number;
  /** Called before the binding applies a theme. Return `false` to block the
   *  switch for this cycle. */
  onBeforeApply?: (theme: T) => boolean;
  /** Whether the binding should apply themes and run its timer. Defaults to
   *  `true`. Toggle at runtime via the returned `setEnabled`.
   *  @defaultValue `true` */
  enabled?: boolean;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function computeEqTime(dayOfYear: number): number {
  const b = (360 / 365) * (dayOfYear - 81);
  return (
    9.87 * Math.sin(toRadians(2 * b)) -
    7.53 * Math.cos(toRadians(b)) -
    1.5 * Math.sin(toRadians(b))
  );
}

function computeSolarDec(dayOfYear: number): number {
  return 23.439 * Math.sin(toRadians((360 / 365) * (dayOfYear - 81)));
}

/** Options accepted by `calculateSunTimes` for resolving a location when
 *  `latitude`/`longitude` are omitted. */
export type CalculateSunTimesLocationOptions = SolarLocationInput;

/**
 * The sunrise/sunset pair for one calendar day at one location.
 *
 * @remarks
 * `sunrise` and `sunset` are absolute instants on the **host's local clock**:
 * the calendar day is the local day of the `Date` that was passed in, and the
 * returned instants are the correct local wall-clock times for that day,
 * daylight-saving transitions included. They are not solar time — see
 * {@link calculateSunTimes}.
 *
 * `polar` is present only when the sun does not rise or does not set that day.
 * In that case `sunrise`/`sunset` still describe a usable interval — for polar
 * day the whole local day, for polar night a zero-length day that starts at its
 * end — so `now >= sunrise && now < sunset` is still correct. Consumers that
 * want to display "no sunrise today" should read `polar` rather than compare
 * the two dates.
 */
export interface SunTimes {
  /** Sunrise, as an absolute instant. */
  sunrise: Date;
  /** Sunset, as an absolute instant. */
  sunset: Date;
  /**
   * Set when the sun stays up (`"day"`) or stays down (`"night"`) for the whole
   * day. Absent on an ordinary day, and absent from a custom `getTimes`
   * implementation that does not model polar conditions.
   */
  polar?: "day" | "night";
}

/** Day of the year (1–366) for a local calendar date. */
function dayOfYear(year: number, month: number, day: number): number {
  const startOfYear = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month, day);
  return Math.floor((current - startOfYear) / 86400000) + 1;
}

/**
 * Compute today's sunrise and sunset using the standard NOAA solar algorithm
 * (zenith-based, corrected for the equation of time and for longitude).
 *
 * `latitude` and `longitude` are optional: when omitted (or when an options
 * object is passed instead), the location is resolved from `timeZone` or the
 * visitor's browser timezone via `resolveSolarLocation`. Passing neither
 * coordinates nor a timezone means every visitor gets sunrise/sunset for their
 * own location automatically.
 *
 * ```ts
 * // Explicit coordinates (unchanged behavior).
 * calculateSunTimes(date, 48.8566, 2.3522);
 *
 * // Resolve from the visitor's timezone.
 * calculateSunTimes(date);
 *
 * // Resolve from an explicit timezone.
 * calculateSunTimes(date, { timeZone: "Asia/Kathmandu" });
 * ```
 *
 * @param date - The day to compute for. Its **local** calendar date is used.
 * @param args - `latitude, longitude[, options]`, or an options bag.
 * @returns The sunrise/sunset pair as absolute instants (see {@link SunTimes}).
 *
 * @remarks
 * **The local-clock contract.** Both returned `Date`s are absolute instants
 * computed from the location's longitude and the day's solar declination. Their
 * local representation is therefore the correct wall-clock time for that day,
 * and it follows daylight-saving transitions because it is derived from the
 * real UTC instant rather than from a fixed offset.
 *
 * **Longitude matters.** Solar noon at a location occurs at
 * `720 - 4·longitude - eqTime` minutes UTC (east-positive longitude), and
 * sunrise/sunset sit `±4·hourAngle` minutes either side of it. Treating that
 * result as local clock time — which the previous implementation did, because
 * it never applied the longitude term — put the switch at the wrong hour
 * wherever the local time-zone meridian differs from the location's longitude.
 *
 * **`timeZone` resolves coordinates, not the clock.** It is used only to pick
 * the latitude/longitude pair; the returned instants are read on the host's own
 * clock. This API therefore does not support computing "sunrise in Tokyo" on a
 * server in London: the coordinates would be Tokyo's but the day boundary and
 * the displayed wall-clock time would be the server's. Pass explicit
 * coordinates for the visitor's location, or run the calculation in the
 * visitor's browser.
 *
 * **Polar day and polar night** are reported through {@link SunTimes.polar}.
 * The hour-angle formula has no solution when the sun stays above or below the
 * horizon, and the previous implementation clamped `cosH` into `[-1, 1]`,
 * which produced a zero-length day: sunrise equal to sunset, so the
 * daytime test was never true and a polar-day visitor got the dark theme at
 * noon.
 */
export function calculateSunTimes(
  date: Date,
  ...args:
    | [latitude: number, longitude: number, options?: SolarLocationInput]
    | [options?: SolarLocationInput]
): SunTimes {
  // When the first argument is an object (or there's only one argument
  // and it's undefined), treat it as the options bag.
  const first = args[0];
  if (args.length === 0 || (args.length === 1 && (first === undefined || typeof first === "object"))) {
    const opts = (first as SolarLocationInput) ?? {};
    const resolved = resolveSolarLocation(opts);
    return calculateSunTimesAt(date, resolved.latitude, resolved.longitude);
  }

  // Otherwise, positional: latitude, longitude, optional options.
  const latitude = args[0] as number;
  const longitude = args[1] as number;
  const options = args[2] as SolarLocationInput | undefined;
  const resolved = resolveSolarLocation({
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(options?.timeZone !== undefined ? { timeZone: options.timeZone } : {}),
    ...(options?.autoDetectLocation !== undefined
      ? { autoDetectLocation: options.autoDetectLocation }
      : {}),
  });
  return calculateSunTimesAt(date, resolved.latitude, resolved.longitude);
}

/** The core NOAA computation, always with concrete coordinates. */
function calculateSunTimesAt(
  date: Date,
  latitude: number,
  longitude: number,
): SunTimes {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const ordinal = dayOfYear(year, month, day);
  const eqTime = computeEqTime(ordinal);
  const solarDec = computeSolarDec(ordinal);

  const zenith = 90.833;

  const cosH =
    (Math.cos(toRadians(zenith)) -
      Math.sin(toRadians(latitude)) * Math.sin(toRadians(solarDec))) /
    (Math.cos(toRadians(latitude)) * Math.cos(toRadians(solarDec)));

  /** The instant `minutes` after 00:00 UTC on the *local* calendar date. */
  function fromUtcMinutes(minutes: number): Date {
    return new Date(Date.UTC(year, month, day) + minutes * 60000);
  }

  const startOfLocalDay = new Date(year, month, day, 0, 0, 0, 0);
  const endOfLocalDay = new Date(year, month, day + 1, 0, 0, 0, 0);

  // `cosH` outside [-1, 1] means the sun never crosses the horizon: above it
  // all day (polar day) or below it all day (polar night). Clamping it — the
  // previous behaviour — silently turned both into a zero-length day, so a
  // polar-day visitor was given the night theme at noon.
  if (cosH > 1) {
    return {
      sunrise: endOfLocalDay,
      sunset: startOfLocalDay,
      polar: "night",
    };
  }

  if (cosH < -1) {
    return {
      sunrise: startOfLocalDay,
      sunset: endOfLocalDay,
      polar: "day",
    };
  }

  const hourAngle = toDegrees(Math.acos(cosH));

  // Solar noon in UTC minutes, east-positive longitude: 720 − 4·λ − eqTime.
  // Sunrise/sunset are ±4·H minutes from it. This is the term the previous
  // implementation omitted, which made the result identical for every
  // longitude.
  const solarNoonUtc = 720 - 4 * longitude - eqTime;

  return {
    sunrise: fromUtcMinutes(solarNoonUtc - 4 * hourAngle),
    sunset: fromUtcMinutes(solarNoonUtc + 4 * hourAngle),
  };
}

/**
 * Create a scheduled theme binding that applies a light theme during daytime
 * and a dark theme at night.
 *
 * The binding resolves a location (explicit coordinates, an explicit
 * `timeZone`, or browser auto-detection), computes sunrise/sunset, applies
 * the matching theme immediately, and re-checks on `checkInterval`. It can be
 * toggled at runtime via `setEnabled` and stopped via `destroy` (which is
 * idempotent and clears the timer).
 *
 * @param store The store the scheduled theme is applied to.
 * @param options The scheduled-binding configuration.
 * @returns A controller exposing `destroy`, `setLastSyncTime`, `setEnabled`,
 *   `getEnabled` and `getLocation`.
 *
 * @example
 * ```ts
 * const binding = createScheduledThemeBinding(store, {
 *   lightTheme,
 *   darkTheme,
 *   timeZone: "Asia/Kathmandu",
 * });
 * // ... later
 * binding.destroy();
 * ```
 *
 * @see {@link ScheduledThemeBindingOptions}
 */
export function createScheduledThemeBinding<T>(
  store: { get(): T; set(theme: T, options?: { force?: boolean; suppressTransition?: boolean }): void },
  options: ScheduledThemeBindingOptions<T>,
): { destroy(): void; setLastSyncTime(time: number): void; setEnabled(enabled: boolean): void; getEnabled(): boolean; getLocation(): { latitude: number; longitude: number; timeZone: string | null; autoDetected: boolean } } {
  const checkInterval = options.checkInterval ?? 60000;
  const skipApplyMs = options.skipApplyMs ?? 0;

  const getTimes =
    options.getTimes ?? calculateSunTimes;

  let location = resolveSolarLocation({
    ...(options.latitude !== undefined ? { latitude: options.latitude } : {}),
    ...(options.longitude !== undefined
      ? { longitude: options.longitude }
      : {}),
    ...(options.timeZone !== undefined ? { timeZone: options.timeZone } : {}),
    ...(options.autoDetectLocation !== undefined
      ? { autoDetectLocation: options.autoDetectLocation }
      : {}),
  });

  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSyncTime = 0;
  let enabled = options.enabled ?? true;

  function isDaytime(now: Date): boolean {
    const times = getTimes(now, location.latitude, location.longitude);

    // Polar conditions are explicit rather than inferred from the interval. A
    // clamped hour angle used to make `sunrise` and `sunset` identical, which
    // made the interval test permanently false — the dark theme at noon above
    // the Arctic circle in June.
    if (times.polar === "day") return true;
    if (times.polar === "night") return false;

    return now >= times.sunrise && now < times.sunset;
  }

  function startTimer() {
    if (timer !== null) return;
    timer = setInterval(apply, checkInterval);
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function apply() {
    if (!enabled) return;
    if (skipApplyMs > 0 && Date.now() - lastSyncTime < skipApplyMs) {
      return;
    }

    const target = isDaytime(new Date()) ? options.lightTheme : options.darkTheme;
    const current = store.get();
    if (current === target || ((current as { name?: string })?.name && (current as { name?: string })?.name === (target as { name?: string })?.name)) {
      return;
    }

    const onBeforeApply = options.onBeforeApply;
    if (onBeforeApply && !onBeforeApply(target)) {
      return;
    }

    store.set(target);
  }

  if (enabled) {
    apply();

    startTimer();
  }

  return {
    destroy() {
      stopTimer();
    },
    setLastSyncTime(time: number) {
      lastSyncTime = time;
    },
    setEnabled(next: boolean) {
      if (next === enabled) return;
      enabled = next;
      if (enabled) {
        apply();
        startTimer();
      } else {
        stopTimer();
      }
    },
    getEnabled() {
      return enabled;
    },
    getLocation() {
      return { ...location };
    },
  };
}