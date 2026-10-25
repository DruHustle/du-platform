// Local, disposable process: a parser regression must not crash the test runner.
import assert from "node:assert/strict";
import http from "node:http";
import { deflateSync, gzipSync } from "node:zlib";
import express from "express";
import { registerCoreMiddleware } from "../../../core/middleware.ts";

const app = express();
registerCoreMiddleware(app);
let client;
const trailing = Buffer.alloc(512, 0x58);
app.post("/parser-probe", (req, res) => {
  assert.deepEqual(req.body, { probe: true });
  // Send the remaining bytes only after the parser has finished its frame.
  client.end(trailing);
  const finish = () => res.json({ received: true });
  if (req.readableEnded) finish();
  else req.once("end", finish);
});
app.get("/alive", (_req, res) => res.sendStatus(204));
app.post("/gzip-probe", (_req, res) => res.json({ received: true }));
app.use((error, _req, res, _next) => res.sendStatus(error.status || 500));
const server = app.listen(0, "127.0.0.1");
await new Promise(done => server.once("listening", done));
const port = server.address().port;
try {
  const frame = Buffer.concat([
    deflateSync(JSON.stringify({ probe: true })),
    Buffer.from([0]),
  ]);
  const result = await new Promise((resolve, reject) => {
    client = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/parser-probe",
        method: "POST",
        agent: false,
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "deflate",
          "Content-Length": frame.length + trailing.length,
        },
      },
      response => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", chunk => (body += chunk));
        response.once("end", () =>
          resolve({ status: response.statusCode, body })
        );
      }
    );
    client.once("error", reject);
    client.setTimeout(3000, () => client.destroy(new Error("Parser stalled")));
    client.write(frame);
  });
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), { received: true });
  const gzip = Buffer.concat([
    gzipSync(JSON.stringify({ probe: true })),
    Buffer.from([0]),
    Buffer.alloc(100 * 1024, 0x58),
  ]);
  const gzipStatus = await new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/gzip-probe",
        method: "POST",
        agent: false,
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          "Content-Length": gzip.length,
        },
      },
      response => {
        response.resume();
        response.once("end", () => resolve(response.statusCode));
      }
    );
    request.once("error", reject);
    request.setTimeout(3000, () => request.destroy(new Error("Gzip stalled")));
    request.end(gzip);
  });
  assert([200, 400].includes(gzipStatus));
  assert.equal((await fetch(`http://127.0.0.1:${port}/alive`)).status, 204);
  console.log("PASS compressed trailing bytes and subsequent request");
} finally {
  client?.destroy();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
