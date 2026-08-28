export type HttpMediaDescriptor = {
  contentType: string;
  etag: string;
  lastModified: Date;
  mediaType: "image" | "video" | null;
  size: number;
};

export type ByteRange = { start: number; endInclusive: number };

export async function createMediaResponse(input: {
  request: Pick<Request, "headers">;
  descriptor: HttpMediaDescriptor;
  cacheControl: string;
  open: (range?: ByteRange) => Promise<ReadableStream<Uint8Array> | null>;
}): Promise<Response | null> {
  const { request, descriptor } = input;
  const headers: Record<string, string> = {
    "Accept-Ranges": descriptor.mediaType === "video" ? "bytes" : "none",
    "Cache-Control": input.cacheControl,
    "Content-Type": descriptor.contentType,
    ETag: descriptor.etag,
    "Last-Modified": descriptor.lastModified.toUTCString(),
  };

  const rangeHeader = descriptor.mediaType === "video" ? request.headers.get("range") : null;
  if (!rangeHeader && etagMatches(request.headers.get("if-none-match"), descriptor.etag)) {
    return new Response(null, { status: 304, headers });
  }

  const ifRange = request.headers.get("if-range");
  const mayUseRange = Boolean(
    rangeHeader && (!ifRange || ifRange === descriptor.etag || ifRange === descriptor.lastModified.toUTCString()),
  );
  const range = mayUseRange && rangeHeader ? parseByteRange(rangeHeader, descriptor.size) : null;
  if (mayUseRange && !range) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${descriptor.size}` },
    });
  }

  const content = await input.open(range ?? undefined);
  if (!content) return null;
  if (range) {
    headers["Content-Range"] = `bytes ${range.start}-${range.endInclusive}/${descriptor.size}`;
    headers["Content-Length"] = String(range.endInclusive - range.start + 1);
    return new Response(content, { status: 206, headers });
  }

  headers["Content-Length"] = String(descriptor.size);
  return new Response(content, { headers });
}

export function parseByteRange(header: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size <= 0) return null;
  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;
  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, size - suffixLength), endInclusive: size - 1 };
  }
  const start = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= size ||
    requestedEnd < start
  ) {
    return null;
  }
  return { start, endInclusive: Math.min(requestedEnd, size - 1) };
}

function etagMatches(header: string | null, etag: string): boolean {
  return header === "*" || Boolean(header?.split(",").some((candidate) => candidate.trim() === etag));
}
