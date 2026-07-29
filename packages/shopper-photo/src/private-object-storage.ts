export type TemporaryObject = { key: string; expiresAt: Date };

export interface PrivateTemporaryObjectStorage {
  put(
    buffer: Buffer,
    contentType: string,
    ttlSeconds: number,
  ): Promise<TemporaryObject>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export async function withPrivateTemporaryObject<T>(
  storage: PrivateTemporaryObjectStorage,
  buffer: Buffer,
  contentType: string,
  operation: (object: TemporaryObject) => Promise<T>,
  ttlSeconds = 300,
): Promise<T> {
  const object = await storage.put(buffer, contentType, ttlSeconds);
  try {
    return await operation(object);
  } finally {
    await storage.delete(object.key);
  }
}
