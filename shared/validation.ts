import { z } from "zod";
// Use Zod's supported interpreter in browsers. Configure it before constructing
// shared schemas, without pulling validation into the initial Home bundle.
if ("window" in globalThis) z.config({ jitless: true });
export { z };
