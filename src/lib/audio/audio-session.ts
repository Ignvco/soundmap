let owner: symbol | null = null;
/** Includes requests waiting for microphone permission. */
export function claimAudioSession() {
  if (owner)
    throw new Error("Detén la captura actual antes de iniciar otra medición.");
  const token = Symbol("capture");
  owner = token;
  return () => {
    if (owner === token) owner = null;
  };
}
export function audioSessionActive() {
  return owner !== null;
}
