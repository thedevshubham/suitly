import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { prepareShopperPhoto } from './prepare-shopper-photo.js';
import { withTemporaryShopperPhoto } from './temporary-shopper-photo.js';

const temporaryDirectories: string[] = [];
const fixturePath = resolve('tests/fixtures/shopper-full-body-synthetic.png');

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe('prepareShopperPhoto', () => {
  it('orients, bounds, compresses, and strips metadata', async () => {
    const input = await readFile(fixturePath);
    const prepared = await prepareShopperPhoto(input);
    const metadata = await sharp(prepared.buffer).metadata();

    expect(prepared.mimeType).toBe('image/jpeg');
    expect(prepared.width).toBeLessThanOrEqual(1024);
    expect(prepared.height).toBeLessThanOrEqual(1536);
    expect(prepared.byteLength).toBeLessThan(input.byteLength);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it('rejects unsupported or empty input', async () => {
    await expect(
      prepareShopperPhoto(Buffer.from('not an image')),
    ).rejects.toThrow();
    await expect(prepareShopperPhoto(Buffer.alloc(0))).rejects.toThrow(
      'Shopper photo is empty.',
    );
  });
});

describe('withTemporaryShopperPhoto', () => {
  it('uses a private temporary file and deletes it after success', async () => {
    const root = await mkdtemp(join(tmpdir(), 'suitly-photo-test-'));
    temporaryDirectories.push(root);
    const input = await readFile(fixturePath);
    let temporaryPath = '';

    await withTemporaryShopperPhoto(
      input,
      async (photo) => {
        temporaryPath = photo.path;
        expect(existsSync(photo.path)).toBe(true);
        const stats = await stat(photo.path);
        expect(stats.mode & 0o777).toBe(0o600);
      },
      { temporaryRoot: root },
    );

    expect(existsSync(temporaryPath)).toBe(false);
  });

  it('deletes the temporary file when analysis fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'suitly-photo-test-'));
    temporaryDirectories.push(root);
    const input = await readFile(fixturePath);
    let temporaryPath = '';

    await expect(
      withTemporaryShopperPhoto(
        input,
        (photo) => {
          temporaryPath = photo.path;
          return Promise.reject(new Error('Analysis failed'));
        },
        { temporaryRoot: root },
      ),
    ).rejects.toThrow('Analysis failed');

    expect(existsSync(temporaryPath)).toBe(false);
  });
});
