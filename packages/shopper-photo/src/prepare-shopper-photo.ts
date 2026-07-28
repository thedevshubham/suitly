import sharp from 'sharp';

import type {
  PreparedShopperPhoto,
  PrepareShopperPhotoOptions,
} from './types.js';

const supportedFormats = new Set(['jpeg', 'png', 'webp']);

export async function prepareShopperPhoto(
  input: Buffer,
  options: PrepareShopperPhotoOptions = {},
): Promise<PreparedShopperPhoto> {
  const maximumInputBytes = options.maximumInputBytes ?? 10 * 1024 * 1024;
  if (input.byteLength === 0) {
    throw new Error('Shopper photo is empty.');
  }
  if (input.byteLength > maximumInputBytes) {
    throw new Error('Shopper photo exceeds the 10 MB input limit.');
  }

  const image = sharp(input, {
    failOn: 'warning',
    limitInputPixels: 40_000_000,
  });
  const metadata = await image.metadata();

  if (metadata.format === undefined || !supportedFormats.has(metadata.format)) {
    throw new Error('Shopper photo must be JPEG, PNG, or WebP.');
  }
  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error('Shopper photo dimensions could not be determined.');
  }

  const minimumWidth = options.minimumWidth ?? 480;
  const minimumHeight = options.minimumHeight ?? 720;
  if (metadata.width < minimumWidth || metadata.height < minimumHeight) {
    throw new Error(
      `Shopper photo must be at least ${minimumWidth}×${minimumHeight} pixels.`,
    );
  }

  const output = await image
    .rotate()
    .resize({
      width: options.maximumWidth ?? 1024,
      height: options.maximumHeight ?? 1536,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    mimeType: 'image/jpeg',
    width: output.info.width,
    height: output.info.height,
    byteLength: output.data.byteLength,
  };
}
