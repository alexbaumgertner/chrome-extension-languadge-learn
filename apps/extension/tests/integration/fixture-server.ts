import http from "node:http";

/** Serves a single, test-controlled HTML page over real HTTP (not file://) so manifest host_permissions matching works. */
export function createFixtureServer() {
  let html = "<!doctype html><html><body></body></html>";
  const server = http.createServer((_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  });

  return {
    setHtml(next: string): void {
      html = next;
    },
    listen(port: number): Promise<void> {
      return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    },
    close(): Promise<void> {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
