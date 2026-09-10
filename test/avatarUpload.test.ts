import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fitDimensions } from '../src/utils/avatarUpload.ts';

describe('avatarUpload', () => {
  it('caps the longest side and keeps the aspect ratio', () => {
    assert.deepStrictEqual(fitDimensions(4000, 3000), { width: 256, height: 192 });
    assert.deepStrictEqual(fitDimensions(3000, 4000), { width: 192, height: 256 });
  });

  it('never upscales a small image', () => {
    assert.deepStrictEqual(fitDimensions(64, 64), { width: 64, height: 64 });
  });

  it('never rounds a sliver down to zero', () => {
    const { width, height } = fitDimensions(4000, 1);
    assert.ok(width > 0 && height > 0);
  });
});
