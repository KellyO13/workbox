import {expect} from 'chai';
import sinon from 'sinon';
import {reset as iDBReset} from 'shelving-mock-indexeddb';
import PrecachedDetailsModel from '../../../../packages/workbox-precaching/models/PrecachedDetailsModel.mjs';
import PrecacheEntry from '../../../../packages/workbox-precaching/models/PrecacheEntry.mjs';

describe('[workbox-precaching] PrecachedDetailsModel', function() {
  const sandbox = sinon.createSandbox();

  beforeEach(function() {
    sandbox.restore();
    iDBReset();
  });

  after(function() {
    sandbox.restore();
    iDBReset();
  });

  describe('constructor', function() {
    it(`should construct with no input`, async function() {
      new PrecachedDetailsModel(`test-idb-name`);
    });
  });

  describe('_handleUpgrade', function() {
    it('should handle upgrade 0 (Doesnt exist)', () => {
      const objectStoreNames = [];
      const fakeDB = {
        objectStoreNames: {
          contains: (name) => objectStoreNames.indexOf(name) !== -1,
        },
        deleteObjectStore: sandbox.spy(),
        createObjectStore: sandbox.spy(),
      };

      const precacheDetailsModel = new PrecachedDetailsModel(`test-idb-name`);
      precacheDetailsModel._handleUpgrade({
        target: {
          result: fakeDB,
        },
      });

      // Assert only create called
      expect(fakeDB.createObjectStore.callCount).to.equal(1);
      expect(fakeDB.createObjectStore.args[0][0]).to.equal(`precached-details-models`);

     expect(fakeDB.deleteObjectStore.callCount).to.equal(0);
    });

    it('should handle upgrade 1 > 2', () => {
      const objectStoreNames = ['workbox-precaching'];
      const fakeDB = {
        objectStoreNames: {
          contains: (name) => objectStoreNames.indexOf(name) !== -1,
        },
        deleteObjectStore: sandbox.spy(),
        createObjectStore: sandbox.spy(),
      };

      const precacheDetailsModel = new PrecachedDetailsModel(`test-idb-name`);
      precacheDetailsModel._handleUpgrade({
        oldVersion: 1,
        target: {
          result: fakeDB,
        },
      });

      // Assert only create called
      expect(fakeDB.createObjectStore.callCount).to.equal(1);
      expect(fakeDB.createObjectStore.args[0][0]).to.equal(`precached-details-models`);

     expect(fakeDB.deleteObjectStore.callCount).to.equal(1);
     expect(fakeDB.deleteObjectStore.args[0][0]).to.equal(`workbox-precaching`);
    });

    it('should handle upgrade 1 > 2 with constructing precached-details-models', () => {
      const objectStoreNames = ['workbox-precaching', 'precached-details-models'];
      const fakeDB = {
        objectStoreNames: {
          contains: (name) => objectStoreNames.indexOf(name) !== -1,
        },
        deleteObjectStore: sandbox.spy(),
        createObjectStore: sandbox.spy(),
      };

      const precacheDetailsModel = new PrecachedDetailsModel(`test-idb-name`);
      precacheDetailsModel._handleUpgrade({
        oldVersion: 1,
        target: {
          result: fakeDB,
        },
      });

      // Assert only create called
      expect(fakeDB.createObjectStore.callCount).to.equal(1);
      expect(fakeDB.createObjectStore.args[0][0]).to.equal(`precached-details-models`);
      expect(fakeDB.deleteObjectStore.callCount).to.equal(2);
      expect(fakeDB.deleteObjectStore.args[0][0]).to.equal(`workbox-precaching`);
      expect(fakeDB.deleteObjectStore.args[1][0]).to.equal(`precached-details-models`);
    });
  });

  describe('_getAllEntries', function() {
    it(`should return an empty array`, async function() {
      const model = new PrecachedDetailsModel(`test-idb-name`);
      const allEntries = await model._getAllEntries();
      expect(allEntries).to.deep.equal([]);
    });

    it(`should return entry with ID`, async function() {
      const model = new PrecachedDetailsModel(`test-idb-name`);
      await model._addEntry(new PrecacheEntry(
        {}, '/', '1234', true
      ));
      const allEntries = await model._getAllEntries();
      expect(allEntries.length).to.equal(1);
      expect(allEntries[0]).to.deep.equal({
        key: '/',
        primaryKey: '/',
        value: {
          revision: '1234',
          url: '/',
        },
      });
    });
  });

  describe(`_isEntryCached()`, function() {
    // TODO Test bad inputs

    it(`should return false for non-existant entry`, async function() {
      const model = new PrecachedDetailsModel(`test-idb-name`);
      const isCached = await model._isEntryCached(
        'test-cache',
        new PrecacheEntry(
          {}, '/', '1234', true
        )
      );
      expect(isCached).to.equal(false);
    });

    it(`should return false for entry with different revision`, async function() {
      const cacheName = 'test-cache';

      const model = new PrecachedDetailsModel(`test-idb-name`);

      await model._addEntry(
        new PrecacheEntry(
          {}, '/', '1234', true
        )
      );

      const isCached = await model._isEntryCached(
        cacheName,
        new PrecacheEntry(
          {}, '/', '4321', true
        )
      );
      expect(isCached).to.equal(false);
    });

    it(`should return false for entry with revision but not in cache`, async function() {
      const cacheName = 'test-cache';

      const model = new PrecachedDetailsModel(`test-idb-name`);
      const entry = new PrecacheEntry(
        {}, '/', '1234', true
      );

      await model._addEntry(entry);
      const isCached = await model._isEntryCached(cacheName, entry);

      expect(isCached).to.equal(false);
    });

    it(`should return true if entry with revision and in cache`, async function() {
      const cacheName = 'test-cache';

      const model = new PrecachedDetailsModel(`test-idb-name`);
      const entry = new PrecacheEntry(
        {}, '/', '1234', true
      );

      const openCache = await caches.open(cacheName);
      openCache.put('/', new Response('Hello'));

      await model._addEntry(entry);

      const isCached = await model._isEntryCached(cacheName, entry);
      expect(isCached).to.equal(true);
    });
  });

  describe('_deleteEntry()', function() {
    // TODO add bad input tests

    it(`should be able to delete an entry`, async function() {
      const model = new PrecachedDetailsModel(`test-idb-name`);

      await model._addEntry(
        new PrecacheEntry(
          {}, '/', '1234', true
        )
      );

      let allEntries = await model._getAllEntries();
      expect(allEntries.length).to.equal(1);

      await model._deleteEntry('/');

      allEntries = await model._getAllEntries();
      expect(allEntries.length).to.equal(0);
    });
  });
});
