import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { BadRequestError } from "@/platform/application/errors";
import type { BlobMetadata, BlobStore } from "./blob-store";

export class LocalBlobStore implements BlobStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  async put(key: string, content: Buffer): Promise<void> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async readRange(key: string, start: number, endInclusive: number): Promise<Buffer> {
    validateRange(start, endInclusive);
    const handle = await fs.open(this.resolve(key), "r");
    try {
      const length = endInclusive - start + 1;
      const output = Buffer.alloc(length);
      const { bytesRead } = await handle.read(output, 0, length, start);
      return output.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  open(key: string, range?: { start: number; endInclusive: number }): ReadableStream<Uint8Array> {
    if (range) validateRange(range.start, range.endInclusive);
    const source = createReadStream(this.resolve(key), range
      ? { start: range.start, end: range.endInclusive }
      : undefined);
    return Readable.toWeb(source) as ReadableStream<Uint8Array>;
  }

  async stat(key: string): Promise<BlobMetadata | null> {
    try {
      const value = await fs.stat(this.resolve(key));
      return { size: value.size, updatedAt: value.mtime };
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) !== null;
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    await fs.rm(this.resolve(prefix), { force: true, recursive: true });
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    const source = this.resolve(sourceKey);
    const destination = this.resolve(destinationKey);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.rename(source, destination);
  }

  private resolve(key: string): string {
    const absolute = path.resolve(this.root, key);
    if (absolute === this.root || !absolute.startsWith(this.root + path.sep)) {
      throw new BadRequestError("Invalid storage key");
    }
    return absolute;
  }
}

function validateRange(start: number, endInclusive: number): void {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(endInclusive) || start < 0 || endInclusive < start) {
    throw new BadRequestError("Invalid byte range");
  }
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
