import liveServer from 'live-server';
import opn        from 'opn';

/**
 * Provides a wrapper around `live-server` that provides connection / socket handling to properly destroy all
 * connections on shutdown. Automatic opening of the browser is also handled directly in order to pass `wait: false` to
 * `opn` allowing the child browser process to be separate of the invoking process which allows graceful shutdown from
 * the parent process. In addition the wrapper provides support for typhonjs-plugin-manager creating event bindings to
 * control `live-server`.
 *
 * @see https://www.npmjs.com/package/live-server
 * @see https://www.npmjs.com/package/opn
 */
export default class LiveServer
{
   /**
    * Returns the current `live-server` options.
    *
    * @returns {object}
    */
   static get options()
   {
      return options;
   }

   /**
    * Returns any current server instance.
    *
    * @returns {HTTP|HTTPS}
    */
   static get server()
   {
      return server;
   }

   /**
    * Returns whether a server is running.
    *
    * @returns {boolean}
    */
   static get isRunning()
   {
      return server !== void 0;
   }

   /**
    * Opens a browser that the live server is hosting. Launch browser with additional `wait` option set to false for
    * `opn` invocation separating the browser process from this process. You may pass in `opnOptions` to provide
    * further option overrides for `opn` invocation.
    *
    * @param {string}   [targetBrowser=options.browser] - The browser to open.
    */
   static open(targetBrowser = options.browser)
   {
      if (!server && !options)
      {
         console.log('[W] typhonjs-live-server warning: The server is not running.');
      }
      else
      {
         const browser = targetBrowser || null;

         const openPath = typeof options.openPath !== 'undefined' ? options.openPath : '';

         const protocol = typeof options.https === 'boolean' && options.https ? 'https' : 'http';
         const address = server.address().address === '0.0.0.0' ? '127.0.0.1' : server.address().address;
         const port = server.address().port;
         const openURL = `${protocol}://${address}:${port}`;

         const opnOptions = Object.assign({ app: browser, wait: false },
          typeof options.opnOptions === 'object' ? options.opnOptions : {});

         if (Array.isArray(openPath))
         {
            openPath.forEach((p) => opn(openURL + p, opnOptions));
         }
         else
         {
            opn(openURL + openPath, opnOptions);
         }
      }
   }

   /**
    * Adds event bindings to start / shutdown `live-server`.
    *
    * @param {PluginEvent} ev - The plugin event.
    */
   static onPluginLoad(ev)
   {
      const eventbus = ev.eventbus;

      pluginOptions = ev.pluginOptions;

      eventbus.on('typhonjs:util:live:server:open', LiveServer.open);
      eventbus.on('typhonjs:util:live:server:options:get', () => LiveServer.options);
      eventbus.on('typhonjs:util:live:server:running', () => LiveServer.isRunning);
      eventbus.on('typhonjs:util:live:server:server:get', () => LiveServer.server);
      eventbus.on('typhonjs:util:live:server:shutdown', LiveServer.shutdown);
      eventbus.on('typhonjs:util:live:server:start', LiveServer.start);
   }

   /**
    * Performs shutdown of any running server.
    */
   static shutdown()
   {
      if (server)
      {
         liveServer.shutdown();
         options = {};
         server = void 0;
      }
   }

   /**
    * Starts `live-server` with the given options.
    *
    * @param {object}   userOptions - Any live server options. Additionally `opnOptions` may be provided to pass
    *                                 additional options in invocation of `opn` to launch a browser.
    *
    * @see https://www.npmjs.com/package/live-server
    * @see https://www.npmjs.com/package/opn
    * @returns {HTTP|HTTPS}
    */
   static start(userOptions = {})
   {
      if (typeof userOptions !== 'object') { throw new TypeError(`'userOptions' is not an 'object'.`); }

      if (server)
      {
         console.log('[W] typhonjs-live-server warning: The server has already been started.');
      }
      else
      {
         // Default to only error output for `live-server` logLevel - 0 = errors only, 1 = some, 2 = lots
         // Default to opening browser.
         const params = { logLevel: 0, open: true };

         // Combine live server config options and store.
         options = Object.assign(params, pluginOptions, userOptions);

         // Create a copy of options to send to `live-server`.
         const optionsCopy = JSON.parse(JSON.stringify(options));

         // Always set `live-server` open option to false as opening the browser is handled locally.
         optionsCopy.open = false;

         // Start live server.
         server = liveServer.start(optionsCopy);

         // Ensure that sockets will not keep alive the process.
         server.on('connection', (socket) => socket.unref());

         // Potentially open the default browser when server is ready.
         if (options.open) { server.on('listening', () => LiveServer.open()); }
      }

      return server;
   }
}

// Module private ---------------------------------------------------------------------------------------------------

/**
 * Stores live-server options.
 * @type {object}
 */
let options;

/**
 * Stores any optional live-server options stored set as plugin options.
 * @type {object}
 */
let pluginOptions = {};

/**
 * The underlying Node HTTP / HTTPS server.
 * @type {HTTP|HTTPS}
 */
let server;
