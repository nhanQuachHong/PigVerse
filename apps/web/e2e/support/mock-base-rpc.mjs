import { createServer } from "node:http";

import { resolveBaseRpcFixture } from "./base-rpc-fixture.ts";

const port = Number(process.env.MOCK_BASE_RPC_PORT ?? "3201");
const server = createServer((request, response) => {
  if (request.method === "GET") {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("ready");
    return;
  }
  if (request.method !== "POST") {
    response.writeHead(405).end();
    return;
  }
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const outcome = resolveBaseRpcFixture(body.method, body.params ?? []);
      response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      });
      response.end(JSON.stringify({ id: body.id, jsonrpc: "2.0", ...outcome }));
    } catch {
      response.writeHead(400).end();
    }
  });
});

server.listen(port, "127.0.0.1");
const close = () => server.close(() => process.exit(0));
process.on("SIGINT", close);
process.on("SIGTERM", close);
