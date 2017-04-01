import TyphonEvents  from 'backbone-esnext-events';
import { assert }    from 'chai';
import PluginManager from 'typhonjs-plugin-manager';
import request       from 'supertest';

import LiveServer    from '../../src/LiveServer.js';

const s_OPTIONS = { open: false, root: './test/fixture' };

const eventbus = new TyphonEvents();

describe('LiveServer', () =>
{
   describe('API test', () =>
   {
      it('start throws with bad config', () =>
      {
         assert.throws(() => LiveServer.start(''));
      });

      it('isRunning is false', () =>
      {
         assert.isFalse(LiveServer.isRunning);
      });
   });

   describe('server tests', () =>
   {
      const pluginManager = new PluginManager({ eventbus });
      let server;

      pluginManager.add({ name: 'typhonjs-live-server', instance: LiveServer, options: { test: true } });

      beforeEach(() =>
      {
         server = eventbus.triggerSync('typhonjs:util:live:server:start', s_OPTIONS);
      });

      afterEach(() =>
      {
         eventbus.trigger('typhonjs:util:live:server:shutdown');
      });

      it('server running binding', () =>
      {
         assert.isTrue(eventbus.triggerSync('typhonjs:util:live:server:running'));
      });

      it('server is defined', () =>
      {
         assert.isObject(server);
      });

      it('server binding', () =>
      {
         const testServer = eventbus.triggerSync('typhonjs:util:live:server:server:get');

         assert.strictEqual(testServer, server);
      });

      it('options is correct', () =>
      {
         const options = eventbus.triggerSync('typhonjs:util:live:server:options:get');

         assert.strictEqual(JSON.stringify(options), '{"logLevel":0,"open":false,"test":true,"root":"./test/fixture"}');
      });

      it('get index', (done) =>
      {
         request(server)
          .get('/')
          .expect('Content-Type', 'text/html; charset=UTF-8')
          .expect(/A test/i)
          .expect(200, done);
      });
   });
});
