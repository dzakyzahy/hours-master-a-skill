import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATAR_PRESETS,
  getAvatarDisplay,
  formatUserHeadline
} from '../src/utils/profilePresets.ts';

describe('profilePresets & personalization', () => {
  it('has at least 5 curated avatar presets', () => {
    assert.ok(AVATAR_PRESETS.length >= 5);
    const first = AVATAR_PRESETS[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(first.gradient);
  });

  it('returns valid display for custom image or preset', () => {
    const presetDisplay = getAvatarDisplay('cyber-neon', 'DI');
    assert.ok(presetDisplay.gradient);

    const customDisplay = getAvatarDisplay('data:image/png;base64,12345', 'DI');
    assert.strictEqual(customDisplay.isCustomImage, true);
    assert.strictEqual(customDisplay.imageUrl, 'data:image/png;base64,12345');
  });

  it('formats headline with title and bio fallback', () => {
    const headline = formatUserHeadline('Ethical Hacker', 'Road to 10k hours');
    assert.strictEqual(headline.title, 'Ethical Hacker');
    assert.strictEqual(headline.bio, 'Road to 10k hours');

    const defaultHeadline = formatUserHeadline('', '');
    assert.strictEqual(defaultHeadline.title, 'Skill Master');
  });
});
