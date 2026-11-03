import { describe, expect, it, vi } from "vitest";
import { createMediaStreamController } from "./mediaStream";

function fakeStream() {
  const stop = vi.fn();
  return {
    stream: { getTracks: () => [{ stop }] } as unknown as MediaStream,
    stop,
  };
}

describe("media stream ownership", () => {
  it("releases active tracks", async () => {
    const { stream, stop } = fakeStream();
    const controller = createMediaStreamController(async () => stream);
    expect(await controller.acquire({ video: true })).toBe(stream);
    controller.release();
    controller.release();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("stops a permission request resolved after cancellation or unmount", async () => {
    const { stream, stop } = fakeStream();
    let resolve!: (value: MediaStream) => void;
    const controller = createMediaStreamController(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    const pending = controller.acquire({ audio: true });
    controller.release();
    resolve(stream);
    expect(await pending).toBeNull();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("keeps only the newest concurrent request", async () => {
    const old = fakeStream();
    const latest = fakeStream();
    let resolve!: (value: MediaStream) => void;
    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(done => {
            resolve = done;
          })
      )
      .mockResolvedValueOnce(latest.stream);
    const controller = createMediaStreamController(request);
    const pending = controller.acquire({ audio: true });
    expect(await controller.acquire({ audio: true })).toBe(latest.stream);
    resolve(old.stream);
    expect(await pending).toBeNull();
    expect(old.stop).toHaveBeenCalledOnce();
    expect(latest.stop).not.toHaveBeenCalled();
    controller.release();
    expect(latest.stop).toHaveBeenCalledOnce();
  });

  it("surfaces permission denial for the current request", async () => {
    const controller = createMediaStreamController(async () => {
      throw new Error("Permission denied");
    });
    await expect(controller.acquire({ video: true })).rejects.toThrow(
      "Permission denied"
    );
  });
});
