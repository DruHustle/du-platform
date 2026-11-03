import { useEffect, useState } from "react";
import { createMediaStreamController } from "./mediaStream";

export function useMediaStream() {
  const [controller] = useState(() =>
    createMediaStreamController(constraints =>
      navigator.mediaDevices.getUserMedia(constraints)
    )
  );
  useEffect(() => () => controller.release(), [controller]);
  return controller;
}
