import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { createServer, type Server } from "node:http";
// @ts-expect-error Plain Node deployment entry point is intentionally executable without TypeScript.
import { createPreviewServer } from "./preview-server.mjs";

const servers: Server[] = [],
  roots: string[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  return (server.address() as { port: number }).port;
}
async function setup() {
  const root = await mkdtemp(resolve(tmpdir(), "usim-preview-"));
  roots.push(root);
  await mkdir(resolve(root, "dist"));
  await writeFile(
    resolve(root, "dist/index.html"),
    "<h1>University Simulator</h1>",
  );
  await writeFile(resolve(root, "dist/app.js"), "const version = 1;");
  const upstream = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        path: req.url,
        authorization: req.headers.authorization,
      }),
    );
  });
  const apiPort = await listen(upstream),
    port = await listen(
      createPreviewServer({ root: resolve(root, "dist"), apiPort }),
    );
  return { root, url: `http://127.0.0.1:${port}`, upstream };
}
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((done) => server.close(() => done()))),
  );
  await Promise.all(
    roots.splice(0).map((root) => {
      if (
        dirname(root) !== resolve(tmpdir()) ||
        !basename(root).startsWith("usim-preview-")
      )
        throw new Error(
          "Refusing cleanup outside the test temporary directory.",
        );
      return rm(root, { recursive: true, force: true });
    }),
  );
});
describe("private SSH static preview", () => {
  it("serves built assets and SPA routes with security headers and HEAD semantics", async () => {
    const { url } = await setup();
    const page = await fetch(url + "/courses/intro");
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("University Simulator");
    expect(page.headers.get("x-frame-options")).toBe("DENY");
    const asset = await fetch(url + "/app.js", { method: "HEAD" });
    expect(asset.headers.get("content-type")).toContain("javascript");
    expect(await asset.text()).toBe("");
    expect((await fetch(url + "/absent.js")).status).toBe(404);
    expect((await fetch(url + "/", { method: "POST" })).status).toBe(405);
  });
  it("refuses dotfiles, encoded traversal, backslashes, and symlinks escaping the dist directory", async () => {
    const { url, root } = await setup();
    await writeFile(resolve(root, "secret.txt"), "never serve");
    for (const path of [
      "/.env",
      "/%2eenv",
      "/%2e%2e%2fsecret.txt",
      "/foo%5c..%5csecret.txt",
    ])
      expect((await fetch(url + path)).status).toBe(403);
    if (process.platform !== "win32") {
      await symlink(
        resolve(root, "secret.txt"),
        resolve(root, "dist/linked.txt"),
      );
      expect((await fetch(url + "/linked.txt")).status).toBe(403);
      await writeFile(resolve(root, "dist/.env"), "hidden");
      await symlink(
        resolve(root, "dist/.env"),
        resolve(root, "dist/public.txt"),
      );
      expect((await fetch(url + "/public.txt")).status).toBe(403);
    }
  });
  it("proxies API requests only to the configured loopback port and keeps auth intact", async () => {
    const { url } = await setup();
    const response = await fetch(url + "/api/v1/bootstrap?x=1", {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(await response.json()).toEqual({
      path: "/api/v1/bootstrap?x=1",
      authorization: "Bearer test-token",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("returns an explicit 502 when the API is down instead of a successful SPA page", async () => {
    const { url, upstream } = await setup();
    await new Promise<void>((done) => upstream.close(() => done()));
    const response = await fetch(url + "/api/v1/health");
    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("preview_api_unavailable");
  });
});
