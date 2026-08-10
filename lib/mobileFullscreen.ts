type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const MOBILE_MEDIA_QUERY = "(max-width: 1200px)";

export function isMobileFullscreen() {
  const fullscreenDocument = document as FullscreenDocument;
  return Boolean(document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement);
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
  if (document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
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
