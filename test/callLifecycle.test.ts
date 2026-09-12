import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNativeCallMode, isPipAllowed } from '../src/utils/callLifecycle.ts';

describe('native call lifecycle', () => {
  it('does not start a foreground service before media permission produced a stream', () => {
    assert.strictEqual(getNativeCallMode(false, false, false), 'off');
    assert.strictEqual(getNativeCallMode(true, false, false), 'off');
  });

  it('selects the foreground service type from the granted stream', () => {
    assert.strictEqual(getNativeCallMode(true, true, false), 'audio');
    assert.strictEqual(getNativeCallMode(true, true, true), 'video');
  });

  it('allows PiP auto-enter only while active inside a meeting route', () => {
    assert.strictEqual(isPipAllowed(true, true, true), true);
    assert.strictEqual(isPipAllowed(false, true, true), false, 'outside meeting route (e.g. chat/dashboard) must not auto-pip');
    assert.strictEqual(isPipAllowed(true, false, true), false, 'missing room id must not auto-pip');
    assert.strictEqual(isPipAllowed(true, true, false), false, 'inactive call must not auto-pip');
  });
});

