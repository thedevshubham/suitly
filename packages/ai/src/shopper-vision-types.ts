import type { ShopperVisionInput, ShopperVisualProfile } from '@suitly/core';
import type { TemporaryShopperPhoto } from '@suitly/shopper-photo';

export type ShopperVisionAnalysisInput = ShopperVisionInput & {
  photo: TemporaryShopperPhoto;
};

export interface ShopperVisionProvider {
  readonly model: string;
  readonly promptVersion: string;
  analyseShopper(
    input: ShopperVisionAnalysisInput,
  ): Promise<ShopperVisualProfile>;
}
