import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNativeCallMode } from '../src/utils/callLifecycle.ts';

describe('native call lifecycle', () => {
  it('does not start a foreground service before media permission produced a stream', () => {
    assert.strictEqual(getNativeCallMode(false, false, false), 'off');
    assert.strictEqual(getNativeCallMode(true, false, false), 'off');
  });

  it('selects the foreground service type from the granted stream', () => {
    assert.strictEqual(getNativeCallMode(true, true, false), 'audio');
    assert.strictEqual(getNativeCallMode(true, true, true), 'video');
  });
});
