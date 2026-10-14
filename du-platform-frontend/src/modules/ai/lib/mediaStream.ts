/** Owns one stream, including permission requests that resolve after cancellation. */
export function createMediaStreamController(
  request: (constraints: MediaStreamConstraints) => Promise<MediaStream>
) {
  let generation = 0;
  let stream: MediaStream | null = null;
  const release = () => {
    generation += 1;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
  };
  const acquire = async (constraints: MediaStreamConstraints) => {
    release();
    const pendingGeneration = generation;
    let next: MediaStream;
    try {
      next = await request(constraints);
    } catch (error) {
      if (pendingGeneration !== generation) return null;
      throw error;
    }
    if (pendingGeneration !== generation) {
      next.getTracks().forEach(track => track.stop());
      return null;
    }
    stream = next;
    return next;
  };
  return { acquire, release };
}
