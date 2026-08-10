/**
 * Mermaid ambience audio manager using Web Audio API.
 *
 * The mermaid's laugh is baked into its 15s WebM. The video plays muted; the
 * audio is decoded into an AudioBuffer and played through Web Audio at a lower
 * volume than the BGM.
 *
 * Like the BGM manager, a single looping AudioBufferSourceNode (loop = true)
 * plays the laugh so there is never more than one active source. The laugh is
 * kept frame-synced to the mermaid video by comparing the video's currentTime
 * with the source's real playhead and restarting at the correct offset only
 * when they diverge beyond a threshold (e.g. after a video stutter).
 */

const DESKTOP_MERMAID_LOOP = "/images/mermaid/mermaid-audio.webm";
const MOBILE_MERMAID_LOOP = "/images/mermaid/mermaid-audio-mobile.m4a";
const isMobile = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 1200px)").matches;

let audioContext: AudioContext | null = null;
let mermaidBuffer: AudioBuffer | null = null;
let gainNode: GainNode | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let sourceStartContextTime = 0;
let sourceStartOffset = 0;
let loadPromise: Promise<void> | null = null;
let mermaidEnabled = false;
let mermaidMuted = false;
let lastMobileVideoTime = -1;

const MERMAID_VOLUME = 0.45;

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

function loadMermaidAudio(): Promise<void> {
  if (loadPromise) return loadPromise;
  const context = ensureContext();
  if (!context) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }
  loadPromise = fetch(isMobile() ? MOBILE_MERMAID_LOOP : DESKTOP_MERMAID_LOOP)
    .then((response) => {
      if (!response.ok) throw new Error(`Mermaid audio fetch failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      mermaidBuffer = buffer;
      gainNode = context.createGain();
      gainNode.gain.value = mermaidMuted ? 0 : MERMAID_VOLUME;
      gainNode.connect(context.destination);
    })
    .catch((error) => {
      loadPromise = null;
      throw error;
    });
  return loadPromise;
}

/**
 * (Re)start the looping source at the given offset. Stops the previous source
 * synchronously before creating the new one so the laugh can never overlap
 * itself (which would sound doubled).
 */
function playFrom(offsetSeconds: number): void {
  const context = audioContext;
  if (!context || !mermaidBuffer || !gainNode) return;
  const duration = mermaidBuffer.duration;
  const offset = Math.min(Math.max(offsetSeconds, 0), Math.max(0, duration - 0.05));
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
  source.buffer = mermaidBuffer;
  source.loop = true;
  source.connect(gainNode);
  const now = context.currentTime;
  source.start(now, offset);
  activeSource = source;
  sourceStartContextTime = now;
  sourceStartOffset = offset;
}

/** The audio source's current playhead within the loop (seconds). */
function audioPlayhead(): number {
  if (!activeSource || !audioContext || !mermaidBuffer) return -1;
  const elapsed = audioContext.currentTime - sourceStartContextTime;
  const duration = mermaidBuffer.duration;
  const pos = sourceStartOffset + elapsed;
  return pos - Math.floor(pos / duration) * duration;
}

/**
 * Keep the mermaid audio in sync with the mermaid video. Call this on the
 * video's timeupdate/seeked/play events. Compares the video's currentTime
 * against the audio source's real playhead and re-syncs when they diverge.
 */
export function syncMermaidToVideo(video: HTMLVideoElement | null): void {
  if (!ensureContext()) return;
  if (!video || video.paused || Number.isNaN(video.currentTime)) return;
  const duration = mermaidBuffer?.duration ?? 0;
  if (!duration) return;
  const videoTime = video.currentTime % duration;
  if (!activeSource) {
    // First sync: start from where the video is.
    playFrom(videoTime);
    lastMobileVideoTime = videoTime;
    return;
  }
  if (isMobile()) {
    // Re-align only at the video's quiet loop boundary. Mid-loop corrections
    // can replay part of a laugh and sound doubled on a stuttering phone.
    const wrapped = lastMobileVideoTime > duration * 0.75 && videoTime < duration * 0.25;
    lastMobileVideoTime = videoTime;
    if (wrapped) playFrom(videoTime);
    return;
  }
  const audioNow = audioPlayhead();
  if (audioNow < 0) return;
  let diff = audioNow - videoTime;
  // Normalize to the shortest angular distance so wrap-around is handled.
  if (diff > duration / 2) diff -= duration;
  if (diff < -duration / 2) diff += duration;
  if (Math.abs(diff) > 0.25) {
    playFrom(videoTime);
  }
}

/** Unlock + start the mermaid loop. Safe to call repeatedly. */
export function startMermaidAudio(): void {
  if (!ensureContext()) return;
  if (mermaidEnabled && activeSource) {
    setMermaidMuted(false);
    return;
  }
  mermaidEnabled = true;
  mermaidMuted = false;
  void loadMermaidAudio().then(() => {
    if (!mermaidEnabled || !audioContext) return;
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => undefined);
    }
    // Wait for the first sync tick (video currentTime) to start playback.
  });
}

/** Mute or unmute without stopping the loop. */
export function setMermaidMuted(muted: boolean): void {
  mermaidMuted = muted;
  if (!gainNode || !audioContext) return;
  const now = audioContext.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  if (muted) {
    gainNode.gain.setValueAtTime(0, now);
  } else {
    gainNode.gain.setTargetAtTime(MERMAID_VOLUME, now, 0.03);
  }
}

export function isMermaidMuted(): boolean {
  return mermaidMuted;
}

/** Resume a suspended AudioContext on lifecycle changes. */
export function resumeMermaidAudioIfNeeded(): void {
  if (!mermaidEnabled || !audioContext) return;
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }
}
