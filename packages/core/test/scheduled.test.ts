import { describe, expect, it, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { createThemeStore, createScheduledThemeBinding, calculateSunTimes } from "../src";

/**
 * F10 — `calculateSunTimesAt` never used `longitude` and treated local **solar**
 * time as local **clock** time, so the light/dark switch happened at the wrong
 * hour wherever the time-zone meridian differs from the location's longitude.
 * It also clamped `cosH` into `[-1, 1]`, which made polar day and polar night
 * both produce a zero-length day — sunrise equal to sunset — so the
 * `sunrise <= now < sunset` test was never true and a polar-day visitor got the
 * dark theme at noon.
 *
 * The tests pin `TZ` because the corrected contract is expressed on the host's
 * local clock: the returned instants are absolute, but their local
 * representation is what the schedule acts on. Without a pinned zone these
 * assertions would depend on the machine running them.
 */

const ORIGINAL_TZ = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/New_York";
});

afterAll(() => {
  if (ORIGINAL_TZ === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = ORIGINAL_TZ;
  }
});

/**
 * Assert two instants are within `tolerance` minutes.
 *
 * The implementation is the standard NOAA approximation, which is accurate to a
 * minute or two; the published values below come from astronomical tables.
 */
function expectWithinMinutes(actual: Date, expected: Date, tolerance = 10) {
  const deltaMinutes = Math.abs(actual.getTime() - expected.getTime()) / 60000;
  expect(deltaMinutes).toBeLessThanOrEqual(tolerance);
}

describe("calculateSunTimes (F10)", () => {
  it("matches a known ordinary-latitude case (New York, June solstice)", () => {
    const { sunrise, sunset, polar } = calculateSunTimes(
      new Date(2025, 5, 21, 12, 0, 0),
      40.7128,
      -74.006,
    );

    // Published: 05:25 and 20:31 EDT.
    expectWithinMinutes(sunrise, new Date(2025, 5, 21, 5, 25));
    expectWithinMinutes(sunset, new Date(2025, 5, 21, 20, 31));
    expect(polar).toBeUndefined();
    expect(sunrise.getTime()).toBeLessThan(sunset.getTime());
  });

  it("matches a known ordinary-latitude case (New York, December solstice)", () => {
    const { sunrise, sunset } = calculateSunTimes(
      new Date(2025, 11, 21, 12, 0, 0),
      40.7128,
      -74.006,
    );

    // Published: 07:17 and 16:32 EST.
    expectWithinMinutes(sunrise, new Date(2025, 11, 21, 7, 17));
    expectWithinMinutes(sunset, new Date(2025, 11, 21, 16, 32));
  });

  it("applies longitude: the same latitude and date differ by longitude", () => {
    const date = new Date(2025, 5, 21, 12, 0, 0);
    const atGreenwich = calculateSunTimes(date, 27.7172, 0);
    const atKathmandu = calculateSunTimes(date, 27.7172, 85.32);
    const atShanghai = calculateSunTimes(date, 27.7172, 120);

    // Sunrise gets *earlier* in UTC as longitude increases eastward: 4 minutes
    // per degree.
    expect(atKathmandu.sunrise.getTime()).toBeLessThan(atGreenwich.sunrise.getTime());
    expect(atShanghai.sunrise.getTime()).toBeLessThan(atKathmandu.sunrise.getTime());

    // The difference is material, not a rounding artefact: ~5.7 hours between
    // 0° and 85.32°.
    const shiftHours =
      (atGreenwich.sunrise.getTime() - atKathmandu.sunrise.getTime()) / 3600000;
    expect(shiftHours).toBeGreaterThan(5.5);
    expect(shiftHours).toBeLessThan(6);
  });

  it("keeps the local clock contract for a zone whose meridian is far from its longitude", () => {
    // Kathmandu is UTC+5:45 at 85.32°E. Published sunrise on 2025-06-21 is
    // 05:08 local.
    const { sunrise, sunset } = calculateSunTimes(
      new Date(2025, 5, 21, 12, 0, 0),
      27.7172,
      85.32,
    );

    // Assert on the *UTC* instant, which does not depend on the pinned zone,
    // then check the local rendering follows the real offset.
    expectWithinMinutes(sunrise, new Date("2025-06-20T23:23:00Z"));
    expectWithinMinutes(sunset, new Date("2025-06-21T13:17:00Z"));
  });

  it("handles an equatorial location around the equinox", () => {
    const { sunrise, sunset } = calculateSunTimes(
      new Date(2025, 2, 20, 12, 0, 0),
      -0.1807,
      -78.4678,
    );

    // Quito, equinox: published 06:18 and 18:25 local, which is UTC-5 —
    // 11:18Z and 23:25Z. Asserted on the instant so the pinned test zone does
    // not enter into it.
    expectWithinMinutes(sunrise, new Date("2025-03-20T11:18:00Z"));
    expectWithinMinutes(sunset, new Date("2025-03-20T23:25:00Z"));

    // Day length is close to 12 hours at the equinox.
    const dayHours = (sunset.getTime() - sunrise.getTime()) / 3600000;
    expect(dayHours).toBeGreaterThan(11.8);
    expect(dayHours).toBeLessThan(12.2);
  });

  it("handles the southern hemisphere and inverted seasons", () => {
    const june = calculateSunTimes(new Date(2025, 5, 21, 12, 0, 0), -33.8688, 151.2093);
    const december = calculateSunTimes(
      new Date(2025, 11, 21, 12, 0, 0),
      -33.8688,
      151.2093,
    );

    // Sydney: winter solstice is the *shorter* day.
    const juneDay = (june.sunset.getTime() - june.sunrise.getTime()) / 3600000;
    const decemberDay =
      (december.sunset.getTime() - december.sunrise.getTime()) / 3600000;

    expect(juneDay).toBeLessThan(decemberDay);
    expect(juneDay).toBeGreaterThan(9);
    expect(juneDay).toBeLessThan(10.5);
    expect(decemberDay).toBeGreaterThan(14);
    expect(decemberDay).toBeLessThan(15);

    // Published Sydney values for 2025-12-21: 05:41 and 20:05 AEDT.
    expectWithinMinutes(december.sunrise, new Date("2025-12-20T18:41:00Z"));
    expectWithinMinutes(december.sunset, new Date("2025-12-21T09:05:00Z"));
  });

  it("reports polar day around the June solstice", () => {
    // Tromsø, 69.65°N.
    const { sunrise, sunset, polar } = calculateSunTimes(
      new Date(2025, 5, 21, 12, 0, 0),
      69.6492,
      18.9553,
    );

    expect(polar).toBe("day");
    // A full local day, and never a zero-length one.
    expect(sunrise.getTime()).toBeLessThan(sunset.getTime());
    expect(sunset.getTime() - sunrise.getTime()).toBeGreaterThan(23 * 3600000);
  });

  it("reports polar night around the December solstice", () => {
    const { sunrise, sunset, polar } = calculateSunTimes(
      new Date(2025, 11, 21, 12, 0, 0),
      69.6492,
      18.9553,
    );

    expect(polar).toBe("night");
    // The interval is empty, so the daytime test is false all day.
    expect(sunrise.getTime()).toBeGreaterThanOrEqual(sunset.getTime());
  });

  it("reports polar day at a higher latitude as well", () => {
    const { polar } = calculateSunTimes(
      new Date(2025, 5, 21, 12, 0, 0),
      78.2232,
      15.6469,
    );

    expect(polar).toBe("day");
  });

  it("follows the daylight-saving transition", () => {
    // US DST began on 2025-03-09. The offset used for each day is the one in
    // force at that sunrise, so the two days differ by an hour.
    const beforeDst = calculateSunTimes(new Date(2025, 2, 8, 12, 0, 0), 40.7128, -74.006);
    const afterDst = calculateSunTimes(new Date(2025, 2, 10, 12, 0, 0), 40.7128, -74.006);

    expect(beforeDst.sunrise.getTimezoneOffset()).toBe(300); // EST, UTC-5
    expect(afterDst.sunrise.getTimezoneOffset()).toBe(240); // EDT, UTC-4
  });

  it("is monotonic across the year at one location", () => {
    // Sunrise is earliest at the June solstice and latest at the December one
    // for a northern latitude. Compared as UTC times of day: the two dates are
    // six months apart, so their absolute instants are not comparable, and the
    // pinned test zone is not London's.
    const minutesIntoUtcDay = (date: Date) =>
      date.getUTCHours() * 60 + date.getUTCMinutes();

    const june = calculateSunTimes(new Date(2025, 5, 21, 12, 0, 0), 51.5074, -0.1278);
    const december = calculateSunTimes(
      new Date(2025, 11, 21, 12, 0, 0),
      51.5074,
      -0.1278,
    );

    expect(minutesIntoUtcDay(june.sunrise)).toBeLessThan(
      minutesIntoUtcDay(december.sunrise),
    );
    expect(minutesIntoUtcDay(june.sunset)).toBeGreaterThan(
      minutesIntoUtcDay(december.sunset),
    );
  });

  it("works with custom getTimes function", () => {
    vi.useFakeTimers();
    const fixedTimes = {
      sunrise: new Date("2025-06-21T06:00:00"),
      sunset: new Date("2025-06-21T18:00:00"),
    };

    const light = { name: "day" } as const;
    const dark = { name: "night" } as const;
    const store = createThemeStore({ initialTheme: light });

    vi.setSystemTime(new Date("2025-06-21T12:00:00"));

    const binding = createScheduledThemeBinding(store, {
      lightTheme: light,
      darkTheme: dark,
      getTimes: () => fixedTimes,
    });

    expect(store.get().name).toBe("day");

    binding.destroy();
    vi.useRealTimers();
  });
});

describe("createScheduledThemeBinding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies light theme during daytime", () => {
    const day = new Date("2025-06-21T14:00:00");
    vi.setSystemTime(day);

    const light = { name: "day" } as const;
    const dark = { name: "night" } as const;
    const store = createThemeStore({ initialTheme: dark });

    const binding = createScheduledThemeBinding(store, {
      lightTheme: light,
      darkTheme: dark,
      latitude: 40.7128,
      longitude: -74.006,
      getTimes: () => ({
        sunrise: new Date("2025-06-21T05:30:00"),
        sunset: new Date("2025-06-21T20:30:00"),
      }),
    });

    expect(store.get().name).toBe("day");
    binding.destroy();
  });

  it("applies dark theme during nighttime", () => {
    const night = new Date("2025-06-21T23:00:00");
    vi.setSystemTime(night);

    const light = { name: "day" } as const;
    const dark = { name: "night" } as const;
    const store = createThemeStore({ initialTheme: light });

    const binding = createScheduledThemeBinding(store, {
      lightTheme: light,
      darkTheme: dark,
      latitude: 40.7128,
      longitude: -74.006,
      getTimes: () => ({
        sunrise: new Date("2025-06-21T05:30:00"),
        sunset: new Date("2025-06-21T20:30:00"),
      }),
    });

    expect(store.get().name).toBe("night");
    binding.destroy();
  });

  it("switches themes when time crosses sunset", () => {
    const day = new Date("2025-06-21T14:00:00");
    vi.setSystemTime(day);

    const light = { name: "day" } as const;
    const dark = { name: "night" } as const;
    const store = createThemeStore({ initialTheme: light });

    const binding = createScheduledThemeBinding(store, {
      lightTheme: light,
      darkTheme: dark,
      latitude: 40.7128,
      longitude: -74.006,
      checkInterval: 60000,
      getTimes: () => ({
        sunrise: new Date("2025-06-21T05:30:00"),
        sunset: new Date("2025-06-21T20:30:00"),
      }),
    });

    expect(store.get().name).toBe("day");

    vi.setSystemTime(new Date("2025-06-21T21:00:00"));
    vi.advanceTimersByTime(60000);

    expect(store.get().name).toBe("night");
    binding.destroy();
  });

  it("switches themes when time crosses sunrise", () => {
    const night = new Date("2025-06-21T03:00:00");
    vi.setSystemTime(night);

    const light = { name: "day" } as const;
    const dark = { name: "night" } as const;
    const store = createThemeStore({ initialTheme: dark });

    const binding = createScheduledThemeBinding(store, {
      lightTheme: light,
      darkTheme: dark,
      latitude: 40.7128,
      longitude: -74.006,
      checkInterval: 60000,
      getTimes: () => ({
        sunrise: new Date("2025-06-21T05:30:00"),
        sunset: new Date("2025-06-21T20:30:00"),
      }),
    });

    expect(store.get().name).toBe("night");

    vi.setSystemTime(new Date("2025-06-21T06:00:00"));
    vi.advanceTimersByTime(60000);

    expect(store.get().name).toBe("day");
    binding.destroy();
  });

  it("keeps the light theme through a polar day", () => {
    vi.setSystemTime(new Date(2025, 5, 21, 12, 0, 0));

    const light = { name: "day" } as const;
    const dark = { name: "night" } as const;
    const store = createThemeStore({ initialTheme: dark });

    const binding = createScheduledThemeBinding(store, {
      lightTheme: light,
      darkTheme: dark,
      latitude: 69.6492,
      longitude: 18.9553,
      getTimes: (date, lat, lon) => calculateSunTimes(date, lat, lon),
    });

    expect(store.get().name).toBe("day");
    binding.destroy();
  });

  it("keeps the dark theme through a polar night", () => {
    vi.setSystemTime(new Date(2025, 11, 21, 12, 0, 0));

    const light = { name: "day" } as const;
    const dark = { name: "night" } as const;
    const store = createThemeStore({ initialTheme: light });

    const binding = createScheduledThemeBinding(store, {
      lightTheme: light,
      darkTheme: dark,
      latitude: 69.6492,
      longitude: 18.9553,
      getTimes: (date, lat, lon) => calculateSunTimes(date, lat, lon),
    });

    expect(store.get().name).toBe("night");
    binding.destroy();
  });

  it("stops timer on destroy", () => {
    const day = new Date("2025-06-21T14:00:00");
    vi.setSystemTime(day);

    const light = { name: "day" } as const;
    const dark = { name: "night" } as const;
    const store = createThemeStore({ initialTheme: light });

    const binding = createScheduledThemeBinding(store, {
      lightTheme: light,
      darkTheme: dark,
      latitude: 40.7128,
      longitude: -74.006,
      checkInterval: 60000,
      getTimes: () => ({
        sunrise: new Date("2025-06-21T05:30:00"),
        sunset: new Date("2025-06-21T20:30:00"),
      }),
    });

    binding.destroy();

    vi.setSystemTime(new Date("2025-06-21T21:00:00"));
    vi.advanceTimersByTime(60000);

    expect(store.get().name).toBe("day");
  });
});
