import { describe, expect, it } from "vitest";

import {
  CancellationError,
  createCancellationTokenSource,
  noneCancellationToken,
  throwIfCancelled,
} from "../src/services/cancellation.js";

describe("cancellation tokens", () => {
  it("starts uncancelled", () => {
    const source = createCancellationTokenSource();
    expect(source.token.isCancellationRequested).toBe(false);
    source.dispose();
  });

  it("becomes cancelled when cancel() is called", () => {
    const source = createCancellationTokenSource();
    source.cancel();
    expect(source.token.isCancellationRequested).toBe(true);
    source.dispose();
  });

  it("invokes registered callbacks on cancellation", () => {
    const source = createCancellationTokenSource();
    let called = false;
    source.token.onCancellationRequested(() => {
      called = true;
    });
    source.cancel();
    expect(called).toBe(true);
    source.dispose();
  });

  it("invokes callback immediately if already cancelled", () => {
    const source = createCancellationTokenSource();
    source.cancel();
    let called = false;
    source.token.onCancellationRequested(() => {
      called = true;
    });
    expect(called).toBe(true);
    source.dispose();
  });

  it("does not invoke callbacks after dispose", () => {
    const source = createCancellationTokenSource();
    let called = false;
    source.token.onCancellationRequested(() => {
      called = true;
    });
    source.dispose();
    source.cancel();
    expect(called).toBe(false);
  });

  it("noneCancellationToken is never cancelled", () => {
    expect(noneCancellationToken.isCancellationRequested).toBe(false);
    let called = false;
    noneCancellationToken.onCancellationRequested(() => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it("throwIfCancelled does nothing when not cancelled", () => {
    const source = createCancellationTokenSource();
    expect(() => throwIfCancelled(source.token)).not.toThrow();
    source.dispose();
  });

  it("throwIfCancelled throws CancellationError when cancelled", () => {
    const source = createCancellationTokenSource();
    source.cancel();
    expect(() => throwIfCancelled(source.token)).toThrow(CancellationError);
    source.dispose();
  });

  it("CancellationError has correct name", () => {
    const error = new CancellationError();
    expect(error.name).toBe("CancellationError");
    expect(error.message).toBe("Operation was cancelled");
  });

  it("multiple cancel() calls are idempotent", () => {
    const source = createCancellationTokenSource();
    let callCount = 0;
    source.token.onCancellationRequested(() => {
      callCount++;
    });
    source.cancel();
    source.cancel();
    source.cancel();
    expect(callCount).toBe(1);
    source.dispose();
  });

  it("callback errors do not prevent other callbacks", () => {
    const source = createCancellationTokenSource();
    let secondCalled = false;
    source.token.onCancellationRequested(() => {
      throw new Error("First callback error");
    });
    source.token.onCancellationRequested(() => {
      secondCalled = true;
    });
    source.cancel();
    expect(secondCalled).toBe(true);
    source.dispose();
  });
});
