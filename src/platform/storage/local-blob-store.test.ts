import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalBlobStore } from "./local-blob-store";

let root = "";
let store: LocalBlobStore;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "restaurant-menu-storage-"));
  store = new LocalBlobStore(root);
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe("LocalBlobStore", () => {
  it("writes, moves, ranges, streams and deletes opaque keys", async () => {
    await store.put("tenant-a/products/item.bin", Buffer.from([0, 1, 2, 3, 4]));
    expect(await store.exists("tenant-a/products/item.bin")).toBe(true);
    expect(await store.readRange("tenant-a/products/item.bin", 1, 3)).toEqual(Buffer.from([1, 2, 3]));
    expect(new Uint8Array(await new Response(store.open("tenant-a/products/item.bin", { start: 2, endInclusive: 4 })).arrayBuffer())).toEqual(new Uint8Array([2, 3, 4]));

    await store.move("tenant-a/products/item.bin", "tenant-a/products/moved.bin");
    expect(await readFile(path.join(root, "tenant-a/products/moved.bin"))).toEqual(Buffer.from([0, 1, 2, 3, 4]));
    expect(await store.stat("tenant-a/products/item.bin")).toBeNull();
    await store.delete("tenant-a/products/moved.bin");
    expect(await store.exists("tenant-a/products/moved.bin")).toBe(false);
  });

  it("deletes only the requested prefix", async () => {
    await store.put("tenant-a/a.bin", Buffer.from("a"));
    await store.put("tenant-b/b.bin", Buffer.from("b"));
    await store.deletePrefix("tenant-a");
    expect(await store.exists("tenant-a/a.bin")).toBe(false);
    expect(await store.exists("tenant-b/b.bin")).toBe(true);
  });

  it("rejects traversal, root deletion and invalid byte ranges", async () => {
    await expect(store.put("../escape.bin", Buffer.from("x"))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(store.deletePrefix(".")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(store.readRange("safe.bin", -1, 2)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(() => store.open("safe.bin", { start: 4, endInclusive: 2 })).toThrow();
  });
});
