export const FIXTURE_PORT = 58732;
export const CMS_PORT = 58733;
export const FIXTURE_ORIGIN = `http://127.0.0.1:${FIXTURE_PORT}`;
/**
 * `localhost`, not 127.0.0.1: the test build's host permission covers the fixture host, and a
 * host permission would let the extension skip CORS. On another host the backend's CORS grant is
 * exercised as in production (and its absence can be tested).
 */
export const CMS_ORIGIN = `http://localhost:${CMS_PORT}`;
