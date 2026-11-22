import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkDeviceFullscreenSupport,
  isExamFullscreenActive,
  requestExamFullscreen,
  exitExamFullscreen,
} from "./mcq-sat-lockdown";

describe("mcq-sat-lockdown utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks device fullscreen support when fullscreenEnabled is true", () => {
    vi.stubGlobal("document", {
      fullscreenEnabled: true,
    });
    const status = checkDeviceFullscreenSupport();
    expect(status.supported).toBe(true);
  });

  it("reports unsupported when document has no fullscreen properties", () => {
    vi.stubGlobal("document", {
      fullscreenEnabled: false,
    });
    const status = checkDeviceFullscreenSupport();
    expect(status.supported).toBe(false);
  });

  it("detects when fullscreen is active via fullscreenElement", () => {
    vi.stubGlobal("document", {
      fullscreenElement: {},
    });
    expect(isExamFullscreenActive()).toBe(true);

    vi.stubGlobal("document", {
      fullscreenElement: null,
    });
    expect(isExamFullscreenActive()).toBe(false);
  });

  it("calls requestFullscreen and keyboard lock when entering fullscreen", async () => {
    const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
    const mockKeyboardLock = vi.fn().mockResolvedValue(undefined);

    const dummyEl = {
      requestFullscreen: mockRequestFullscreen,
    } as unknown as HTMLElement;

    vi.stubGlobal("navigator", {
      keyboard: { lock: mockKeyboardLock, unlock: vi.fn() },
    });

    const result = await requestExamFullscreen(dummyEl);
    expect(result.success).toBe(true);
    expect(mockRequestFullscreen).toHaveBeenCalled();
    expect(mockKeyboardLock).toHaveBeenCalledWith(["Escape"]);
  });

  it("calls exitFullscreen and keyboard unlock when leaving fullscreen", async () => {
    const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
    const mockKeyboardUnlock = vi.fn();

    vi.stubGlobal("document", {
      fullscreenElement: {},
      exitFullscreen: mockExitFullscreen,
    });
    vi.stubGlobal("navigator", {
      keyboard: { lock: vi.fn(), unlock: mockKeyboardUnlock },
    });

    await exitExamFullscreen();
    expect(mockExitFullscreen).toHaveBeenCalled();
    expect(mockKeyboardUnlock).toHaveBeenCalled();
  });
});
