export type PreparedShopperPhoto = {
  buffer: Buffer;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  byteLength: number;
};

export type TemporaryShopperPhoto = Omit<PreparedShopperPhoto, 'buffer'> & {
  path: string;
};

export type PrepareShopperPhotoOptions = {
  maximumInputBytes?: number;
  minimumWidth?: number;
  minimumHeight?: number;
  maximumWidth?: number;
  maximumHeight?: number;
};
