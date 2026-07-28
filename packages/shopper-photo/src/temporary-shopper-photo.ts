import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { prepareShopperPhoto } from './prepare-shopper-photo.js';
import type {
  PreparedShopperPhoto,
  PrepareShopperPhotoOptions,
  TemporaryShopperPhoto,
} from './types.js';

export async function withTemporaryShopperPhoto<T>(
  input: Buffer,
  handler: (photo: TemporaryShopperPhoto) => Promise<T>,
  options: PrepareShopperPhotoOptions & { temporaryRoot?: string } = {},
): Promise<T> {
  const prepared = await prepareShopperPhoto(input, options);
  const directory = await mkdtemp(
    join(options.temporaryRoot ?? tmpdir(), 'suitly-shopper-'),
  );
  const path = join(directory, 'photo.jpg');

  try {
    await writeFile(path, prepared.buffer, { mode: 0o600 });
    return await handler(toTemporaryPhoto(prepared, path));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function readTemporaryShopperPhoto(
  photo: TemporaryShopperPhoto,
): Promise<Buffer> {
  return readFile(photo.path);
}

function toTemporaryPhoto(
  prepared: PreparedShopperPhoto,
  path: string,
): TemporaryShopperPhoto {
  return {
    path,
    mimeType: prepared.mimeType,
    width: prepared.width,
    height: prepared.height,
    byteLength: prepared.byteLength,
  };
}
