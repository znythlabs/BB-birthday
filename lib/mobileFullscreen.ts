type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const MOBILE_MEDIA_QUERY = "(max-width: 1200px)";

export function isIphoneLike() {
  if (typeof window === "undefined") return false;
  return /iPhone|iPod/i.test(window.navigator.userAgent);
}

export function isIpad() {
  if (typeof window === "undefined") return false;
  const navigator = window.navigator;
  return /iPad/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isIos() {
  return isIphoneLike() || isIpad();
}

export function isStandaloneWebApp() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };
  return window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true;
}

export function isMobileFullscreen() {
  const fullscreenDocument = document as FullscreenDocument;
  return Boolean(
    document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement
  );
}

export async function lockMobileOrientation() {
  try {
    const orientation = window.screen.orientation as ScreenOrientation & {
      lock?: (mode: "landscape") => Promise<void>;
    };
    await orientation.lock?.("landscape");
  } catch {
    // Orientation lock is unavailable on iOS Safari; physical rotation remains fallback.
  }
}

export async function unlockMobileOrientation() {
  try {
    const orientation = window.screen.orientation as ScreenOrientation & {
      unlock?: () => void;
    };
    orientation.unlock?.();
  } catch {
    // Orientation unlock is unavailable on iOS Safari.
  }
}

export async function enterMobileFullscreen() {
  if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;

  // iPhone Safari still cannot fullscreen arbitrary page elements. Keep the
  // request inside the original tap, but use the rotate-to-landscape UI there.
  // iPad is intentionally NOT included here: modern iPadOS can use the
  // Fullscreen API, even though orientation locking may still be unavailable.
  if (isIphoneLike()) {
    await lockMobileOrientation();
    return;
  }

  const root = document.documentElement as FullscreenElement;
  let fullscreenEntered = isMobileFullscreen();

  if (!fullscreenEntered) {
    try {
      if (root.requestFullscreen) await root.requestFullscreen();
      else await root.webkitRequestFullscreen?.();
      fullscreenEntered = isMobileFullscreen();
    } catch {
      // iOS Safari requires its own browser fullscreen behavior.
    }
  }

  if (fullscreenEntered) await lockMobileOrientation();
}

export async function toggleMobileFullscreen() {
  const fullscreenDocument = document as FullscreenDocument;
  if (isMobileFullscreen()) {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await fullscreenDocument.webkitExitFullscreen?.();
    } catch {
      // Browser may deny exit.
    }
    await unlockMobileOrientation();
    return;
  }

  await enterMobileFullscreen();
}
