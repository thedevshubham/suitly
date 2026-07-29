import { describe, expect, it, vi } from 'vitest';

import {
  type PrivateTemporaryObjectStorage,
  withPrivateTemporaryObject,
} from './private-object-storage.js';

describe('withPrivateTemporaryObject', () => {
  it('deletes the private object when analysis fails', async () => {
    const deleteObject = vi.fn().mockResolvedValue(undefined);
    const storage: PrivateTemporaryObjectStorage = {
      put: vi.fn().mockResolvedValue({
        key: 'private/photo',
        expiresAt: new Date(Date.now() + 300_000),
      }),
      read: vi.fn(),
      delete: deleteObject,
    };

    await expect(
      withPrivateTemporaryObject(
        storage,
        Buffer.from('photo'),
        'image/jpeg',
        () => Promise.reject(new Error('analysis failed')),
      ),
    ).rejects.toThrow('analysis failed');
    expect(deleteObject).toHaveBeenCalledWith('private/photo');
  });
});
