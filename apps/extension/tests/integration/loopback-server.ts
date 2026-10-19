import http from "node:http";

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

/**
 * Answers like the production backend's CORS setup: echoes the extension's origin and answers
 * preflights. With `allow()` false it sends no CORS headers, so the browser blocks every response.
 */
export function withCors(handler: Handler, allow: () => boolean = () => true): Handler {
  return (req, res) => {
    const origin = req.headers.origin;
    if (origin && allow()) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "POST");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      res.setHeader("Access-Control-Allow-Private-Network", "true");
    }
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    handler(req, res);
  };
}

/**
 * Serves `handler` on `localhost:<port>` over both IPv4 and IPv6 loopback, whichever Chrome
 * resolves `localhost` to. Binding only loopback keeps the test server off the network.
 */
export function createLoopbackServer(handler: Handler) {
  const servers = [http.createServer(handler), http.createServer(handler)];
  const hosts = ["127.0.0.1", "::1"];
  return {
    listen(port: number): Promise<void> {
      return Promise.all(
        servers.map(
          (server, i) =>
            new Promise<void>((resolve, reject) => {
              server.once("error", (err: NodeJS.ErrnoException) =>
                // A machine without IPv6 loopback still resolves localhost to 127.0.0.1.
                i === 1 && err.code === "EADDRNOTAVAIL" ? resolve() : reject(err),
              );
              server.listen(port, hosts[i], resolve);
            }),
        ),
      ).then(() => undefined);
    },
    close(): Promise<void> {
      return Promise.all(
        servers.map((server) => {
          if (!server.listening) return Promise.resolve();
          // Drop keep-alive connections like a real outage would; otherwise close() waits for
          // them to time out.
          const closed = new Promise<void>((resolve) => server.close(() => resolve()));
          server.closeAllConnections();
          return closed;
        }),
      ).then(() => undefined);
    },
  };
}
