import { describe, expect, it, vi } from "vitest";
import { createMediaResponse, parseByteRange } from "./media-response";

const descriptor = {
  contentType: "video/mp4",
  etag: '"a-b"',
  lastModified: new Date("2026-01-01T00:00:00.000Z"),
  mediaType: "video" as const,
  size: 10,
};

describe("parseByteRange", () => {
  it("supports explicit, open and suffix ranges", () => {
    expect(parseByteRange("bytes=2-5", 10)).toEqual({ start: 2, endInclusive: 5 });
    expect(parseByteRange("bytes=7-", 10)).toEqual({ start: 7, endInclusive: 9 });
    expect(parseByteRange("bytes=-3", 10)).toEqual({ start: 7, endInclusive: 9 });
  });

  it("rejects invalid or multi ranges", () => {
    expect(parseByteRange("bytes=10-11", 10)).toBeNull();
    expect(parseByteRange("bytes=1-2,4-5", 10)).toBeNull();
  });
});

describe("createMediaResponse", () => {
  it("returns 304 without opening content when the ETag matches", async () => {
    const open = vi.fn();
    const response = await createMediaResponse({
      request: new Request("http://test/media", { headers: { "If-None-Match": descriptor.etag } }),
      descriptor,
      cacheControl: "public, max-age=0, must-revalidate",
      open,
    });
    expect(response?.status).toBe(304);
    expect(open).not.toHaveBeenCalled();
  });

  it("streams only the requested video range", async () => {
    const open = vi.fn(async () => streamOf([3, 4, 5]));
    const response = await createMediaResponse({
      request: new Request("http://test/media", { headers: { Range: "bytes=3-5" } }),
      descriptor,
      cacheControl: "private, max-age=0, must-revalidate",
      open,
    });
    expect(open).toHaveBeenCalledWith({ start: 3, endInclusive: 5 });
    expect(response?.status).toBe(206);
    expect(response?.headers.get("content-range")).toBe("bytes 3-5/10");
    expect(new Uint8Array(await response!.arrayBuffer())).toEqual(new Uint8Array([3, 4, 5]));
  });
});

function streamOf(bytes: number[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}
