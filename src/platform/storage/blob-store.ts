export type BlobMetadata = {
  size: number;
  updatedAt: Date;
};

export interface BlobStore {
  put(key: string, content: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  readRange(key: string, start: number, endInclusive: number): Promise<Buffer>;
  open(key: string, range?: { start: number; endInclusive: number }): ReadableStream<Uint8Array>;
  stat(key: string): Promise<BlobMetadata | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  move(sourceKey: string, destinationKey: string): Promise<void>;
}
