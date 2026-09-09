import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node test runner
const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] || null
};
(globalThis as any).localStorage = mockStorage;
(globalThis as any).window = globalThis;
(globalThis as any).window.localStorage = mockStorage;

import localforage from 'localforage';

// Setup in-memory localforage driver for Node.js test environment
const memoryStores = new Map<string, Map<string, any>>();

function getStore(instance: any, op?: string): Map<string, any> {
  const config = instance?._config || {};
  const storeKey = `${config.name || 'db'}_${config.storeName || 'store'}`;
  let store = memoryStores.get(storeKey);
  if (!store) {
    store = new Map<string, any>();
    memoryStores.set(storeKey, store);
  }
  return store;
}

const memoryDriver: any = {
  _driver: 'testMemoryDriver',
  _initStorage: function(options: any) {
    const storeKey = `${options.name || 'db'}_${options.storeName || 'store'}`;
    if (!memoryStores.has(storeKey)) {
      memoryStores.set(storeKey, new Map<string, any>());
    }
    (this as any)._storeKey = storeKey;
  },
  clear: async function() {
    getStore(this).clear();
  },
  getItem: async function(key: string) {
    const store = getStore(this);
    const val = store.get(key);
    return val !== undefined ? val : null;
  },
  iterate: async function<T, U>(iterator: (value: T, key: string, iterationNumber: number) => U) {
    const config = (this as any)?._config;
    const store = getStore(this);
    let i = 1;
    for (const [key, value] of store.entries()) {
      const result = iterator(value as T, key, i++);
      if (result !== undefined) return result;
    }
  },
  key: async function(n: number) {
    return Array.from(getStore(this).keys())[n] || null;
  },
  keys: async function() {
    return Array.from(getStore(this).keys());
  },
  length: async function() {
    return getStore(this).size;
  },
  removeItem: async function(key: string) {
    getStore(this).delete(key);
  },
  setItem: async function(key: string, value: any) {
    getStore(this).set(key, value);
    return value;
  }
};

await localforage.defineDriver(memoryDriver);
await localforage.setDriver('testMemoryDriver');

const { 
  saveProject, 
  getProjects, 
  removeProject, 
  cleanupLegacyDefaultProject 
} = await import('../src/services/ProjectDB.ts');
import type { Project } from '../src/store.ts';

describe('ProjectDB & User Project Isolation', () => {
  beforeEach(() => {
    storageMap.clear();
    memoryStores.clear();
  });

  it('isolates projects strictly by userId', async () => {
    const userA = 'usr_alice_123';
    const userB = 'usr_bob_456';

    const projectAlice: Project = {
      id: 'proj_alice_1',
      userId: userA,
      name: 'Alice Pentesting Project',
      totalHours: 15,
      dailyGoal: 2,
      hoursToday: 1,
      phases: [],
      lastUpdated: Date.now()
    };

    const projectBob: Project = {
      id: 'proj_bob_1',
      userId: userB,
      name: 'Bob Mobile App Project',
      totalHours: 4,
      dailyGoal: 1,
      hoursToday: 0.5,
      phases: [],
      lastUpdated: Date.now()
    };

    await saveProject(userA, projectAlice);
    await saveProject(userB, projectBob);

    const aliceProjects = await getProjects(userA);
    const bobProjects = await getProjects(userB);

    assert.strictEqual(aliceProjects.length, 1);
    assert.strictEqual(aliceProjects[0].id, 'proj_alice_1');
    assert.strictEqual(aliceProjects[0].name, 'Alice Pentesting Project');

    assert.strictEqual(bobProjects.length, 1);
    assert.strictEqual(bobProjects[0].id, 'proj_bob_1');
    assert.strictEqual(bobProjects[0].name, 'Bob Mobile App Project');

    // Bob must not see Alice's project
    assert.strictEqual(bobProjects.some(p => p.id === 'proj_alice_1'), false);
    // Alice must not see Bob's project
    assert.strictEqual(aliceProjects.some(p => p.id === 'proj_bob_1'), false);
  });

  it('removes project only from the specific user store', async () => {
    const userA = 'usr_alice_123';
    const userB = 'usr_bob_456';

    const projectAlice: Project = {
      id: 'proj_alice_shared_id',
      userId: userA,
      name: 'Alice Shared Id Project',
      totalHours: 10,
      dailyGoal: 2,
      hoursToday: 0,
      phases: [],
      lastUpdated: Date.now()
    };

    const projectBob: Project = {
      id: 'proj_bob_2',
      userId: userB,
      name: 'Bob Independent Project',
      totalHours: 5,
      dailyGoal: 1,
      hoursToday: 0,
      phases: [],
      lastUpdated: Date.now()
    };

    await saveProject(userA, projectAlice);
    await saveProject(userB, projectBob);

    await removeProject(userA, 'proj_alice_shared_id');

    const aliceProjectsAfter = await getProjects(userA);
    const bobProjectsAfter = await getProjects(userB);

    assert.strictEqual(aliceProjectsAfter.length, 0);
    assert.strictEqual(bobProjectsAfter.length, 1);
    assert.strictEqual(bobProjectsAfter[0].id, 'proj_bob_2');
  });

  it('cleans up legacy default-1 Ethical Hacking project from old localStorage', async () => {
    // Seed legacy zustand localStorage format with default-1
    const legacyState = {
      state: {
        projects: [
          { id: 'default-1', name: 'Ethical Hacking', totalHours: 120 },
          { id: 'user-custom-proj', name: 'My Real Project', totalHours: 10 }
        ]
      },
      version: 1
    };

    localStorage.setItem('hours-master-storage', JSON.stringify(legacyState));

    await cleanupLegacyDefaultProject();

    const updatedRaw = localStorage.getItem('hours-master-storage');
    assert.ok(updatedRaw);
    const parsed = JSON.parse(updatedRaw);
    assert.strictEqual(parsed.state.projects.length, 1);
    assert.strictEqual(parsed.state.projects[0].id, 'user-custom-proj');
    assert.strictEqual(parsed.state.projects.some((p: any) => p.id === 'default-1'), false);
  });
});
