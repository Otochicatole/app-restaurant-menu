import { randomUUID } from "node:crypto";
import { blobStore, contentTypeForKey, type BlobStore } from "@/platform/storage";
import type { ProductMediaStorage } from "../application/ports";

export class BlobProductMediaStorage implements ProductMediaStorage {
  constructor(private readonly store: BlobStore = blobStore) {}

  async putProductMedia(command: Parameters<ProductMediaStorage["putProductMedia"]>[0]): Promise<string> {
    const storageKey = `tenants/${command.tenantId}/products/${command.productId}-${randomUUID()}.${command.definition.extension}`;
    await this.store.put(storageKey, Buffer.from(command.content));
    return storageKey;
  }

  open(storageKey: string, range?: { start: number; endInclusive: number }): ReadableStream<Uint8Array> {
    return this.store.open(storageKey, range);
  }

  async stat(storageKey: string) {
    const metadata = await this.store.stat(storageKey);
    return metadata ? { ...metadata, contentType: contentTypeForKey(storageKey) } : null;
  }
}
