/**
 * Game-style BGM manager using Web Audio API.
 *
 * Instead of streaming a long <audio> element (which buffers and can stutter on
 * low-end phones), the BGM is a short (~36s) loop that is downloaded once,
 * decoded into an in-memory AudioBuffer, and played from memory with
 * AudioBufferSourceNode.loop = true. No network activity happens during playback.
 *
 * The AudioContext is created lazily on the first user gesture and resumed on
 * visibility/fullscreen/orientation changes so mobile browsers don't suspend it.
 */

const DESKTOP_LOOP = "/bgm/underwater-loop-desktop.mp3";
const MOBILE_LOOP = "/bgm/loops/underwater-loop-mobile.m4a";
const MOBILE_MEDIA_QUERY = "(max-width: 1200px)";

let audioContext: AudioContext | null = null;
let bgmBuffer: AudioBuffer | null = null;
let gainNode: GainNode | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let loadPromise: Promise<void> | null = null;
let bgmEnabled = false; // whether music has been unlocked by a user gesture
let bgmMuted = false;

const isMobile = () =>
  typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA_QUERY).matches;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }
  return audioContext;
}

function loadBgm(): Promise<void> {
  if (loadPromise) return loadPromise;
  const context = ensureContext();
  if (!context) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }
  loadPromise = fetch(isMobile() ? MOBILE_LOOP : DESKTOP_LOOP)
    .then((response) => {
      if (!response.ok) throw new Error(`BGM fetch failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      bgmBuffer = buffer;
      gainNode = context.createGain();
      gainNode.gain.value = bgmMuted ? 0 : 0.7;
      gainNode.connect(context.destination);
    })
    .catch((error) => {
      loadPromise = null;
      throw error;
    });
  return loadPromise;
}

function playInternal(): void {
  const context = audioContext;
  if (!context || !bgmBuffer || !gainNode) return;
  if (activeSource) {
    try {
      activeSource.stop();
    } catch {
      // already stopped
    }
    activeSource.disconnect();
    activeSource = null;
  }
  const source = context.createBufferSource();
  source.buffer = bgmBuffer;
  source.loop = true;
  source.connect(gainNode);
  source.start();
  activeSource = source;
}

/**
 * Unlock + start BGM. Safe to call repeatedly; the first user gesture creates
 * the AudioContext and begins decoding.
 */
export function startBgm(): void {
  if (!ensureContext()) return;
  if (bgmEnabled && activeSource) {
    // Already playing (e.g. muted via toggle) — just restore the gain.
    setBgmMuted(false);
    return;
  }
  bgmEnabled = true;
  bgmMuted = false;
  void loadBgm().then(() => {
    if (!bgmEnabled || !audioContext) return;
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => undefined);
    }
    playInternal();
  });
}

/** Mute or unmute without stopping the loop. */
export function setBgmMuted(muted: boolean): void {
  bgmMuted = muted;
  if (gainNode) {
    gainNode.gain.setTargetAtTime(
      muted ? 0 : 0.7,
      audioContext?.currentTime ?? 0,
      0.05,
    );
  }
}

export function isBgmMuted(): boolean {
  return bgmMuted;
}

/** Resume a suspended AudioContext on lifecycle changes. */
export function resumeBgmIfNeeded(): void {
  if (!bgmEnabled || !audioContext) return;
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }
  if (activeSource) return;
  if (bgmBuffer && bgmEnabled) playInternal();
}
