import { createServer } from "node:http";

import { LOOPBACK_RESOLVER_ORIGIN } from "../../src/app/lab/player/direct/local-resolver.ts";
import { resolveVideo } from "../../src/app/lab/player/direct/resolver.ts";

const allowedOrigin = URL.parse(process.env.WALNUT_LAB_ORIGIN ?? "");
if (
  !allowedOrigin ||
  allowedOrigin.origin !== process.env.WALNUT_LAB_ORIGIN ||
  (allowedOrigin.protocol !== "https:" &&
    (allowedOrigin.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(allowedOrigin.hostname)))
) {
  throw new Error("Set WALNUT_LAB_ORIGIN to an exact HTTPS or HTTP loopback origin.");
}

const address = new URL(LOOPBACK_RESOLVER_ORIGIN);

createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Vary", "Origin");
  if (request.headers.host !== address.host || request.headers.origin !== allowedOrigin.origin) {
    response.writeHead(403).end();
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", allowedOrigin.origin);
  const target = URL.parse(request.url ?? "", address);
  if (target?.origin !== address.origin || target.pathname !== "/resolve") {
    response.writeHead(404).end();
    return;
  }
  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" }).end();
    return;
  }

  const { body, status } = await resolveVideo(target.searchParams.get("id"));
  response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}).listen(Number(address.port), "0.0.0.0");
