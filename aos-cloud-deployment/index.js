"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/index.ts
  var ReactDOM = __toESM(__require("react-dom/client"), 1);
  var React2 = __toESM(__require("react"), 1);

  // node_modules/engine.io-parser/build/esm/commons.js
  var PACKET_TYPES = /* @__PURE__ */ Object.create(null);
  PACKET_TYPES["open"] = "0";
  PACKET_TYPES["close"] = "1";
  PACKET_TYPES["ping"] = "2";
  PACKET_TYPES["pong"] = "3";
  PACKET_TYPES["message"] = "4";
  PACKET_TYPES["upgrade"] = "5";
  PACKET_TYPES["noop"] = "6";
  var PACKET_TYPES_REVERSE = /* @__PURE__ */ Object.create(null);
  Object.keys(PACKET_TYPES).forEach((key) => {
    PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
  });
  var ERROR_PACKET = { type: "error", data: "parser error" };

  // node_modules/engine.io-parser/build/esm/encodePacket.browser.js
  var withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && Object.prototype.toString.call(Blob) === "[object BlobConstructor]";
  var withNativeArrayBuffer = typeof ArrayBuffer === "function";
  var isView = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj && obj.buffer instanceof ArrayBuffer;
  };
  var encodePacket = ({ type, data }, supportsBinary, callback) => {
    if (withNativeBlob && data instanceof Blob) {
      if (supportsBinary) {
        return callback(data);
      } else {
        return encodeBlobAsBase64(data, callback);
      }
    } else if (withNativeArrayBuffer && (data instanceof ArrayBuffer || isView(data))) {
      if (supportsBinary) {
        return callback(data);
      } else {
        return encodeBlobAsBase64(new Blob([data]), callback);
      }
    }
    return callback(PACKET_TYPES[type] + (data || ""));
  };
  var encodeBlobAsBase64 = (data, callback) => {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const content = fileReader.result.split(",")[1];
      callback("b" + (content || ""));
    };
    return fileReader.readAsDataURL(data);
  };
  function toArray(data) {
    if (data instanceof Uint8Array) {
      return data;
    } else if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    } else {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
  }
  var TEXT_ENCODER;
  function encodePacketToBinary(packet, callback) {
    if (withNativeBlob && packet.data instanceof Blob) {
      return packet.data.arrayBuffer().then(toArray).then(callback);
    } else if (withNativeArrayBuffer && (packet.data instanceof ArrayBuffer || isView(packet.data))) {
      return callback(toArray(packet.data));
    }
    encodePacket(packet, false, (encoded) => {
      if (!TEXT_ENCODER) {
        TEXT_ENCODER = new TextEncoder();
      }
      callback(TEXT_ENCODER.encode(encoded));
    });
  }

  // node_modules/engine.io-parser/build/esm/contrib/base64-arraybuffer.js
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  var decode = (base64) => {
    let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }
    const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
    for (i = 0; i < len; i += 4) {
      encoded1 = lookup[base64.charCodeAt(i)];
      encoded2 = lookup[base64.charCodeAt(i + 1)];
      encoded3 = lookup[base64.charCodeAt(i + 2)];
      encoded4 = lookup[base64.charCodeAt(i + 3)];
      bytes[p++] = encoded1 << 2 | encoded2 >> 4;
      bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
      bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
    }
    return arraybuffer;
  };

  // node_modules/engine.io-parser/build/esm/decodePacket.browser.js
  var withNativeArrayBuffer2 = typeof ArrayBuffer === "function";
  var decodePacket = (encodedPacket, binaryType) => {
    if (typeof encodedPacket !== "string") {
      return {
        type: "message",
        data: mapBinary(encodedPacket, binaryType)
      };
    }
    const type = encodedPacket.charAt(0);
    if (type === "b") {
      return {
        type: "message",
        data: decodeBase64Packet(encodedPacket.substring(1), binaryType)
      };
    }
    const packetType = PACKET_TYPES_REVERSE[type];
    if (!packetType) {
      return ERROR_PACKET;
    }
    return encodedPacket.length > 1 ? {
      type: PACKET_TYPES_REVERSE[type],
      data: encodedPacket.substring(1)
    } : {
      type: PACKET_TYPES_REVERSE[type]
    };
  };
  var decodeBase64Packet = (data, binaryType) => {
    if (withNativeArrayBuffer2) {
      const decoded = decode(data);
      return mapBinary(decoded, binaryType);
    } else {
      return { base64: true, data };
    }
  };
  var mapBinary = (data, binaryType) => {
    switch (binaryType) {
      case "blob":
        if (data instanceof Blob) {
          return data;
        } else {
          return new Blob([data]);
        }
      case "arraybuffer":
      default:
        if (data instanceof ArrayBuffer) {
          return data;
        } else {
          return data.buffer;
        }
    }
  };

  // node_modules/engine.io-parser/build/esm/index.js
  var SEPARATOR = String.fromCharCode(30);
  var encodePayload = (packets, callback) => {
    const length = packets.length;
    const encodedPackets = new Array(length);
    let count = 0;
    packets.forEach((packet, i) => {
      encodePacket(packet, false, (encodedPacket) => {
        encodedPackets[i] = encodedPacket;
        if (++count === length) {
          callback(encodedPackets.join(SEPARATOR));
        }
      });
    });
  };
  var decodePayload = (encodedPayload, binaryType) => {
    const encodedPackets = encodedPayload.split(SEPARATOR);
    const packets = [];
    for (let i = 0; i < encodedPackets.length; i++) {
      const decodedPacket = decodePacket(encodedPackets[i], binaryType);
      packets.push(decodedPacket);
      if (decodedPacket.type === "error") {
        break;
      }
    }
    return packets;
  };
  function createPacketEncoderStream() {
    return new TransformStream({
      transform(packet, controller) {
        encodePacketToBinary(packet, (encodedPacket) => {
          const payloadLength = encodedPacket.length;
          let header;
          if (payloadLength < 126) {
            header = new Uint8Array(1);
            new DataView(header.buffer).setUint8(0, payloadLength);
          } else if (payloadLength < 65536) {
            header = new Uint8Array(3);
            const view = new DataView(header.buffer);
            view.setUint8(0, 126);
            view.setUint16(1, payloadLength);
          } else {
            header = new Uint8Array(9);
            const view = new DataView(header.buffer);
            view.setUint8(0, 127);
            view.setBigUint64(1, BigInt(payloadLength));
          }
          if (packet.data && typeof packet.data !== "string") {
            header[0] |= 128;
          }
          controller.enqueue(header);
          controller.enqueue(encodedPacket);
        });
      }
    });
  }
  var TEXT_DECODER;
  function totalLength(chunks) {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  }
  function concatChunks(chunks, size) {
    if (chunks[0].length === size) {
      return chunks.shift();
    }
    const buffer = new Uint8Array(size);
    let j = 0;
    for (let i = 0; i < size; i++) {
      buffer[i] = chunks[0][j++];
      if (j === chunks[0].length) {
        chunks.shift();
        j = 0;
      }
    }
    if (chunks.length && j < chunks[0].length) {
      chunks[0] = chunks[0].slice(j);
    }
    return buffer;
  }
  function createPacketDecoderStream(maxPayload, binaryType) {
    if (!TEXT_DECODER) {
      TEXT_DECODER = new TextDecoder();
    }
    const chunks = [];
    let state = 0;
    let expectedLength = -1;
    let isBinary2 = false;
    return new TransformStream({
      transform(chunk, controller) {
        chunks.push(chunk);
        while (true) {
          if (state === 0) {
            if (totalLength(chunks) < 1) {
              break;
            }
            const header = concatChunks(chunks, 1);
            isBinary2 = (header[0] & 128) === 128;
            expectedLength = header[0] & 127;
            if (expectedLength < 126) {
              state = 3;
            } else if (expectedLength === 126) {
              state = 1;
            } else {
              state = 2;
            }
          } else if (state === 1) {
            if (totalLength(chunks) < 2) {
              break;
            }
            const headerArray = concatChunks(chunks, 2);
            expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
            state = 3;
          } else if (state === 2) {
            if (totalLength(chunks) < 8) {
              break;
            }
            const headerArray = concatChunks(chunks, 8);
            const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
            const n = view.getUint32(0);
            if (n > Math.pow(2, 53 - 32) - 1) {
              controller.enqueue(ERROR_PACKET);
              break;
            }
            expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
            state = 3;
          } else {
            if (totalLength(chunks) < expectedLength) {
              break;
            }
            const data = concatChunks(chunks, expectedLength);
            controller.enqueue(decodePacket(isBinary2 ? data : TEXT_DECODER.decode(data), binaryType));
            state = 0;
          }
          if (expectedLength === 0 || expectedLength > maxPayload) {
            controller.enqueue(ERROR_PACKET);
            break;
          }
        }
      }
    });
  }
  var protocol = 4;

  // node_modules/@socket.io/component-emitter/lib/esm/index.js
  function Emitter(obj) {
    if (obj)
      return mixin(obj);
  }
  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj;
  }
  Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
    return this;
  };
  Emitter.prototype.once = function(event, fn) {
    function on2() {
      this.off(event, on2);
      fn.apply(this, arguments);
    }
    on2.fn = fn;
    this.on(event, on2);
    return this;
  };
  Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    if (0 == arguments.length) {
      this._callbacks = {};
      return this;
    }
    var callbacks = this._callbacks["$" + event];
    if (!callbacks)
      return this;
    if (1 == arguments.length) {
      delete this._callbacks["$" + event];
      return this;
    }
    var cb;
    for (var i = 0; i < callbacks.length; i++) {
      cb = callbacks[i];
      if (cb === fn || cb.fn === fn) {
        callbacks.splice(i, 1);
        break;
      }
    }
    if (callbacks.length === 0) {
      delete this._callbacks["$" + event];
    }
    return this;
  };
  Emitter.prototype.emit = function(event) {
    this._callbacks = this._callbacks || {};
    var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
    for (var i = 1; i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (var i = 0, len = callbacks.length; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }
    return this;
  };
  Emitter.prototype.emitReserved = Emitter.prototype.emit;
  Emitter.prototype.listeners = function(event) {
    this._callbacks = this._callbacks || {};
    return this._callbacks["$" + event] || [];
  };
  Emitter.prototype.hasListeners = function(event) {
    return !!this.listeners(event).length;
  };

  // node_modules/engine.io-client/build/esm/globals.js
  var nextTick = (() => {
    const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
    if (isPromiseAvailable) {
      return (cb) => Promise.resolve().then(cb);
    } else {
      return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
    }
  })();
  var globalThisShim = (() => {
    if (typeof self !== "undefined") {
      return self;
    } else if (typeof window !== "undefined") {
      return window;
    } else {
      return Function("return this")();
    }
  })();
  var defaultBinaryType = "arraybuffer";
  function createCookieJar() {
  }

  // node_modules/engine.io-client/build/esm/util.js
  function pick(obj, ...attr) {
    return attr.reduce((acc, k) => {
      if (obj.hasOwnProperty(k)) {
        acc[k] = obj[k];
      }
      return acc;
    }, {});
  }
  var NATIVE_SET_TIMEOUT = globalThisShim.setTimeout;
  var NATIVE_CLEAR_TIMEOUT = globalThisShim.clearTimeout;
  function installTimerFunctions(obj, opts) {
    if (opts.useNativeTimers) {
      obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThisShim);
      obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThisShim);
    } else {
      obj.setTimeoutFn = globalThisShim.setTimeout.bind(globalThisShim);
      obj.clearTimeoutFn = globalThisShim.clearTimeout.bind(globalThisShim);
    }
  }
  var BASE64_OVERHEAD = 1.33;
  function byteLength(obj) {
    if (typeof obj === "string") {
      return utf8Length(obj);
    }
    return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
  }
  function utf8Length(str) {
    let c = 0, length = 0;
    for (let i = 0, l = str.length; i < l; i++) {
      c = str.charCodeAt(i);
      if (c < 128) {
        length += 1;
      } else if (c < 2048) {
        length += 2;
      } else if (c < 55296 || c >= 57344) {
        length += 3;
      } else {
        i++;
        length += 4;
      }
    }
    return length;
  }
  function randomString() {
    return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
  }

  // node_modules/engine.io-client/build/esm/contrib/parseqs.js
  function encode(obj) {
    let str = "";
    for (let i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (str.length)
          str += "&";
        str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
      }
    }
    return str;
  }
  function decode2(qs) {
    let qry = {};
    let pairs = qs.split("&");
    for (let i = 0, l = pairs.length; i < l; i++) {
      let pair = pairs[i].split("=");
      qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return qry;
  }

  // node_modules/engine.io-client/build/esm/transport.js
  var TransportError = class extends Error {
    constructor(reason, description, context) {
      super(reason);
      this.description = description;
      this.context = context;
      this.type = "TransportError";
    }
  };
  var Transport = class extends Emitter {
    /**
     * Transport abstract constructor.
     *
     * @param {Object} opts - options
     * @protected
     */
    constructor(opts) {
      super();
      this.writable = false;
      installTimerFunctions(this, opts);
      this.opts = opts;
      this.query = opts.query;
      this.socket = opts.socket;
      this.supportsBinary = !opts.forceBase64;
    }
    /**
     * Emits an error.
     *
     * @param {String} reason
     * @param description
     * @param context - the error context
     * @return {Transport} for chaining
     * @protected
     */
    onError(reason, description, context) {
      super.emitReserved("error", new TransportError(reason, description, context));
      return this;
    }
    /**
     * Opens the transport.
     */
    open() {
      this.readyState = "opening";
      this.doOpen();
      return this;
    }
    /**
     * Closes the transport.
     */
    close() {
      if (this.readyState === "opening" || this.readyState === "open") {
        this.doClose();
        this.onClose();
      }
      return this;
    }
    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     */
    send(packets) {
      if (this.readyState === "open") {
        this.write(packets);
      } else {
      }
    }
    /**
     * Called upon open
     *
     * @protected
     */
    onOpen() {
      this.readyState = "open";
      this.writable = true;
      super.emitReserved("open");
    }
    /**
     * Called with data.
     *
     * @param {String} data
     * @protected
     */
    onData(data) {
      const packet = decodePacket(data, this.socket.binaryType);
      this.onPacket(packet);
    }
    /**
     * Called with a decoded packet.
     *
     * @protected
     */
    onPacket(packet) {
      super.emitReserved("packet", packet);
    }
    /**
     * Called upon close.
     *
     * @protected
     */
    onClose(details) {
      this.readyState = "closed";
      super.emitReserved("close", details);
    }
    /**
     * Pauses the transport, in order not to lose packets during an upgrade.
     *
     * @param onPause
     */
    pause(onPause) {
    }
    createUri(schema, query = {}) {
      return schema + "://" + this._hostname() + this._port() + this.opts.path + this._query(query);
    }
    _hostname() {
      const hostname = this.opts.hostname;
      return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
    }
    _port() {
      if (this.opts.port && (this.opts.secure && Number(this.opts.port) !== 443 || !this.opts.secure && Number(this.opts.port) !== 80)) {
        return ":" + this.opts.port;
      } else {
        return "";
      }
    }
    _query(query) {
      const encodedQuery = encode(query);
      return encodedQuery.length ? "?" + encodedQuery : "";
    }
  };

  // node_modules/engine.io-client/build/esm/transports/polling.js
  var Polling = class extends Transport {
    constructor() {
      super(...arguments);
      this._polling = false;
    }
    get name() {
      return "polling";
    }
    /**
     * Opens the socket (triggers polling). We write a PING message to determine
     * when the transport is open.
     *
     * @protected
     */
    doOpen() {
      this._poll();
    }
    /**
     * Pauses polling.
     *
     * @param {Function} onPause - callback upon buffers are flushed and transport is paused
     * @package
     */
    pause(onPause) {
      this.readyState = "pausing";
      const pause = () => {
        this.readyState = "paused";
        onPause();
      };
      if (this._polling || !this.writable) {
        let total = 0;
        if (this._polling) {
          total++;
          this.once("pollComplete", function() {
            --total || pause();
          });
        }
        if (!this.writable) {
          total++;
          this.once("drain", function() {
            --total || pause();
          });
        }
      } else {
        pause();
      }
    }
    /**
     * Starts polling cycle.
     *
     * @private
     */
    _poll() {
      this._polling = true;
      this.doPoll();
      this.emitReserved("poll");
    }
    /**
     * Overloads onData to detect payloads.
     *
     * @protected
     */
    onData(data) {
      const callback = (packet) => {
        if ("opening" === this.readyState && packet.type === "open") {
          this.onOpen();
        }
        if ("close" === packet.type) {
          this.onClose({ description: "transport closed by the server" });
          return false;
        }
        this.onPacket(packet);
      };
      decodePayload(data, this.socket.binaryType).forEach(callback);
      if ("closed" !== this.readyState) {
        this._polling = false;
        this.emitReserved("pollComplete");
        if ("open" === this.readyState) {
          this._poll();
        } else {
        }
      }
    }
    /**
     * For polling, send a close packet.
     *
     * @protected
     */
    doClose() {
      const close = () => {
        this.write([{ type: "close" }]);
      };
      if ("open" === this.readyState) {
        close();
      } else {
        this.once("open", close);
      }
    }
    /**
     * Writes a packets payload.
     *
     * @param {Array} packets - data packets
     * @protected
     */
    write(packets) {
      this.writable = false;
      encodePayload(packets, (data) => {
        this.doWrite(data, () => {
          this.writable = true;
          this.emitReserved("drain");
        });
      });
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
      const schema = this.opts.secure ? "https" : "http";
      const query = this.query || {};
      if (false !== this.opts.timestampRequests) {
        query[this.opts.timestampParam] = randomString();
      }
      if (!this.supportsBinary && !query.sid) {
        query.b64 = 1;
      }
      return this.createUri(schema, query);
    }
  };

  // node_modules/engine.io-client/build/esm/contrib/has-cors.js
  var value = false;
  try {
    value = typeof XMLHttpRequest !== "undefined" && "withCredentials" in new XMLHttpRequest();
  } catch (err) {
  }
  var hasCORS = value;

  // node_modules/engine.io-client/build/esm/transports/polling-xhr.js
  function empty() {
  }
  var BaseXHR = class extends Polling {
    /**
     * XHR Polling constructor.
     *
     * @param {Object} opts
     * @package
     */
    constructor(opts) {
      super(opts);
      if (typeof location !== "undefined") {
        const isSSL = "https:" === location.protocol;
        let port = location.port;
        if (!port) {
          port = isSSL ? "443" : "80";
        }
        this.xd = typeof location !== "undefined" && opts.hostname !== location.hostname || port !== opts.port;
      }
    }
    /**
     * Sends data.
     *
     * @param {String} data to send.
     * @param {Function} called upon flush.
     * @private
     */
    doWrite(data, fn) {
      const req = this.request({
        method: "POST",
        data
      });
      req.on("success", fn);
      req.on("error", (xhrStatus, context) => {
        this.onError("xhr post error", xhrStatus, context);
      });
    }
    /**
     * Starts a poll cycle.
     *
     * @private
     */
    doPoll() {
      const req = this.request();
      req.on("data", this.onData.bind(this));
      req.on("error", (xhrStatus, context) => {
        this.onError("xhr poll error", xhrStatus, context);
      });
      this.pollXhr = req;
    }
  };
  var Request = class _Request extends Emitter {
    /**
     * Request constructor
     *
     * @param {Object} options
     * @package
     */
    constructor(createRequest, uri, opts) {
      super();
      this.createRequest = createRequest;
      installTimerFunctions(this, opts);
      this._opts = opts;
      this._method = opts.method || "GET";
      this._uri = uri;
      this._data = void 0 !== opts.data ? opts.data : null;
      this._create();
    }
    /**
     * Creates the XHR object and sends the request.
     *
     * @private
     */
    _create() {
      var _a;
      const opts = pick(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
      opts.xdomain = !!this._opts.xd;
      const xhr = this._xhr = this.createRequest(opts);
      try {
        xhr.open(this._method, this._uri, true);
        try {
          if (this._opts.extraHeaders) {
            xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
            for (let i in this._opts.extraHeaders) {
              if (this._opts.extraHeaders.hasOwnProperty(i)) {
                xhr.setRequestHeader(i, this._opts.extraHeaders[i]);
              }
            }
          }
        } catch (e) {
        }
        if ("POST" === this._method) {
          try {
            xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
          } catch (e) {
          }
        }
        try {
          xhr.setRequestHeader("Accept", "*/*");
        } catch (e) {
        }
        (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
        if ("withCredentials" in xhr) {
          xhr.withCredentials = this._opts.withCredentials;
        }
        if (this._opts.requestTimeout) {
          xhr.timeout = this._opts.requestTimeout;
        }
        xhr.onreadystatechange = () => {
          var _a2;
          if (xhr.readyState === 3) {
            (_a2 = this._opts.cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(
              // @ts-ignore
              xhr.getResponseHeader("set-cookie")
            );
          }
          if (4 !== xhr.readyState)
            return;
          if (200 === xhr.status || 1223 === xhr.status) {
            this._onLoad();
          } else {
            this.setTimeoutFn(() => {
              this._onError(typeof xhr.status === "number" ? xhr.status : 0);
            }, 0);
          }
        };
        xhr.send(this._data);
      } catch (e) {
        this.setTimeoutFn(() => {
          this._onError(e);
        }, 0);
        return;
      }
      if (typeof document !== "undefined") {
        this._index = _Request.requestsCount++;
        _Request.requests[this._index] = this;
      }
    }
    /**
     * Called upon error.
     *
     * @private
     */
    _onError(err) {
      this.emitReserved("error", err, this._xhr);
      this._cleanup(true);
    }
    /**
     * Cleans up house.
     *
     * @private
     */
    _cleanup(fromError) {
      if ("undefined" === typeof this._xhr || null === this._xhr) {
        return;
      }
      this._xhr.onreadystatechange = empty;
      if (fromError) {
        try {
          this._xhr.abort();
        } catch (e) {
        }
      }
      if (typeof document !== "undefined") {
        delete _Request.requests[this._index];
      }
      this._xhr = null;
    }
    /**
     * Called upon load.
     *
     * @private
     */
    _onLoad() {
      const data = this._xhr.responseText;
      if (data !== null) {
        this.emitReserved("data", data);
        this.emitReserved("success");
        this._cleanup();
      }
    }
    /**
     * Aborts the request.
     *
     * @package
     */
    abort() {
      this._cleanup();
    }
  };
  Request.requestsCount = 0;
  Request.requests = {};
  if (typeof document !== "undefined") {
    if (typeof attachEvent === "function") {
      attachEvent("onunload", unloadHandler);
    } else if (typeof addEventListener === "function") {
      const terminationEvent = "onpagehide" in globalThisShim ? "pagehide" : "unload";
      addEventListener(terminationEvent, unloadHandler, false);
    }
  }
  function unloadHandler() {
    for (let i in Request.requests) {
      if (Request.requests.hasOwnProperty(i)) {
        Request.requests[i].abort();
      }
    }
  }
  var hasXHR2 = function() {
    const xhr = newRequest({
      xdomain: false
    });
    return xhr && xhr.responseType !== null;
  }();
  var XHR = class extends BaseXHR {
    constructor(opts) {
      super(opts);
      const forceBase64 = opts && opts.forceBase64;
      this.supportsBinary = hasXHR2 && !forceBase64;
    }
    request(opts = {}) {
      Object.assign(opts, { xd: this.xd }, this.opts);
      return new Request(newRequest, this.uri(), opts);
    }
  };
  function newRequest(opts) {
    const xdomain = opts.xdomain;
    try {
      if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
        return new XMLHttpRequest();
      }
    } catch (e) {
    }
    if (!xdomain) {
      try {
        return new globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
      } catch (e) {
      }
    }
  }

  // node_modules/engine.io-client/build/esm/transports/websocket.js
  var isReactNative = typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative";
  var BaseWS = class extends Transport {
    get name() {
      return "websocket";
    }
    doOpen() {
      const uri = this.uri();
      const protocols = this.opts.protocols;
      const opts = isReactNative ? {} : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
      if (this.opts.extraHeaders) {
        opts.headers = this.opts.extraHeaders;
      }
      try {
        this.ws = this.createSocket(uri, protocols, opts);
      } catch (err) {
        return this.emitReserved("error", err);
      }
      this.ws.binaryType = this.socket.binaryType;
      this.addEventListeners();
    }
    /**
     * Adds event listeners to the socket
     *
     * @private
     */
    addEventListeners() {
      this.ws.onopen = () => {
        if (this.opts.autoUnref) {
          this.ws._socket.unref();
        }
        this.onOpen();
      };
      this.ws.onclose = (closeEvent) => this.onClose({
        description: "websocket connection closed",
        context: closeEvent
      });
      this.ws.onmessage = (ev) => this.onData(ev.data);
      this.ws.onerror = (e) => this.onError("websocket error", e);
    }
    write(packets) {
      this.writable = false;
      for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        const lastPacket = i === packets.length - 1;
        encodePacket(packet, this.supportsBinary, (data) => {
          try {
            this.doWrite(packet, data);
          } catch (e) {
          }
          if (lastPacket) {
            nextTick(() => {
              this.writable = true;
              this.emitReserved("drain");
            }, this.setTimeoutFn);
          }
        });
      }
    }
    doClose() {
      if (typeof this.ws !== "undefined") {
        this.ws.onerror = () => {
        };
        this.ws.close();
        this.ws = null;
      }
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
      const schema = this.opts.secure ? "wss" : "ws";
      const query = this.query || {};
      if (this.opts.timestampRequests) {
        query[this.opts.timestampParam] = randomString();
      }
      if (!this.supportsBinary) {
        query.b64 = 1;
      }
      return this.createUri(schema, query);
    }
  };
  var WebSocketCtor = globalThisShim.WebSocket || globalThisShim.MozWebSocket;
  var WS = class extends BaseWS {
    createSocket(uri, protocols, opts) {
      return !isReactNative ? protocols ? new WebSocketCtor(uri, protocols) : new WebSocketCtor(uri) : new WebSocketCtor(uri, protocols, opts);
    }
    doWrite(_packet, data) {
      this.ws.send(data);
    }
  };

  // node_modules/engine.io-client/build/esm/transports/webtransport.js
  var WT = class extends Transport {
    get name() {
      return "webtransport";
    }
    doOpen() {
      try {
        this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
      } catch (err) {
        return this.emitReserved("error", err);
      }
      this._transport.closed.then(() => {
        this.onClose();
      }).catch((err) => {
        this.onError("webtransport error", err);
      });
      this._transport.ready.then(() => {
        this._transport.createBidirectionalStream().then((stream) => {
          const decoderStream = createPacketDecoderStream(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
          const reader = stream.readable.pipeThrough(decoderStream).getReader();
          const encoderStream = createPacketEncoderStream();
          encoderStream.readable.pipeTo(stream.writable);
          this._writer = encoderStream.writable.getWriter();
          const read = () => {
            reader.read().then(({ done, value: value2 }) => {
              if (done) {
                return;
              }
              this.onPacket(value2);
              read();
            }).catch((err) => {
            });
          };
          read();
          const packet = { type: "open" };
          if (this.query.sid) {
            packet.data = `{"sid":"${this.query.sid}"}`;
          }
          this._writer.write(packet).then(() => this.onOpen());
        });
      });
    }
    write(packets) {
      this.writable = false;
      for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        const lastPacket = i === packets.length - 1;
        this._writer.write(packet).then(() => {
          if (lastPacket) {
            nextTick(() => {
              this.writable = true;
              this.emitReserved("drain");
            }, this.setTimeoutFn);
          }
        });
      }
    }
    doClose() {
      var _a;
      (_a = this._transport) === null || _a === void 0 ? void 0 : _a.close();
    }
  };

  // node_modules/engine.io-client/build/esm/transports/index.js
  var transports = {
    websocket: WS,
    webtransport: WT,
    polling: XHR
  };

  // node_modules/engine.io-client/build/esm/contrib/parseuri.js
  var re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
  var parts = [
    "source",
    "protocol",
    "authority",
    "userInfo",
    "user",
    "password",
    "host",
    "port",
    "relative",
    "path",
    "directory",
    "file",
    "query",
    "anchor"
  ];
  function parse(str) {
    if (str.length > 8e3) {
      throw "URI too long";
    }
    const src = str, b = str.indexOf("["), e = str.indexOf("]");
    if (b != -1 && e != -1) {
      str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
    }
    let m = re.exec(str || ""), uri = {}, i = 14;
    while (i--) {
      uri[parts[i]] = m[i] || "";
    }
    if (b != -1 && e != -1) {
      uri.source = src;
      uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
      uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
      uri.ipv6uri = true;
    }
    uri.pathNames = pathNames(uri, uri["path"]);
    uri.queryKey = queryKey(uri, uri["query"]);
    return uri;
  }
  function pathNames(obj, path) {
    const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
    if (path.slice(0, 1) == "/" || path.length === 0) {
      names.splice(0, 1);
    }
    if (path.slice(-1) == "/") {
      names.splice(names.length - 1, 1);
    }
    return names;
  }
  function queryKey(uri, query) {
    const data = {};
    query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
      if ($1) {
        data[$1] = $2;
      }
    });
    return data;
  }

  // node_modules/engine.io-client/build/esm/socket.js
  var withEventListeners = typeof addEventListener === "function" && typeof removeEventListener === "function";
  var OFFLINE_EVENT_LISTENERS = [];
  if (withEventListeners) {
    addEventListener("offline", () => {
      OFFLINE_EVENT_LISTENERS.forEach((listener) => listener());
    }, false);
  }
  var SocketWithoutUpgrade = class _SocketWithoutUpgrade extends Emitter {
    /**
     * Socket constructor.
     *
     * @param {String|Object} uri - uri or options
     * @param {Object} opts - options
     */
    constructor(uri, opts) {
      super();
      this.binaryType = defaultBinaryType;
      this.writeBuffer = [];
      this._prevBufferLen = 0;
      this._pingInterval = -1;
      this._pingTimeout = -1;
      this._maxPayload = -1;
      this._pingTimeoutTime = Infinity;
      if (uri && "object" === typeof uri) {
        opts = uri;
        uri = null;
      }
      if (uri) {
        const parsedUri = parse(uri);
        opts.hostname = parsedUri.host;
        opts.secure = parsedUri.protocol === "https" || parsedUri.protocol === "wss";
        opts.port = parsedUri.port;
        if (parsedUri.query)
          opts.query = parsedUri.query;
      } else if (opts.host) {
        opts.hostname = parse(opts.host).host;
      }
      installTimerFunctions(this, opts);
      this.secure = null != opts.secure ? opts.secure : typeof location !== "undefined" && "https:" === location.protocol;
      if (opts.hostname && !opts.port) {
        opts.port = this.secure ? "443" : "80";
      }
      this.hostname = opts.hostname || (typeof location !== "undefined" ? location.hostname : "localhost");
      this.port = opts.port || (typeof location !== "undefined" && location.port ? location.port : this.secure ? "443" : "80");
      this.transports = [];
      this._transportsByName = {};
      opts.transports.forEach((t) => {
        const transportName = t.prototype.name;
        this.transports.push(transportName);
        this._transportsByName[transportName] = t;
      });
      this.opts = Object.assign({
        path: "/engine.io",
        agent: false,
        withCredentials: false,
        upgrade: true,
        timestampParam: "t",
        rememberUpgrade: false,
        addTrailingSlash: true,
        rejectUnauthorized: true,
        perMessageDeflate: {
          threshold: 1024
        },
        transportOptions: {},
        closeOnBeforeunload: false
      }, opts);
      this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : "");
      if (typeof this.opts.query === "string") {
        this.opts.query = decode2(this.opts.query);
      }
      if (withEventListeners) {
        if (this.opts.closeOnBeforeunload) {
          this._beforeunloadEventListener = () => {
            if (this.transport) {
              this.transport.removeAllListeners();
              this.transport.close();
            }
          };
          addEventListener("beforeunload", this._beforeunloadEventListener, false);
        }
        if (this.hostname !== "localhost") {
          this._offlineEventListener = () => {
            this._onClose("transport close", {
              description: "network connection lost"
            });
          };
          OFFLINE_EVENT_LISTENERS.push(this._offlineEventListener);
        }
      }
      if (this.opts.withCredentials) {
        this._cookieJar = createCookieJar();
      }
      this._open();
    }
    /**
     * Creates transport of the given type.
     *
     * @param {String} name - transport name
     * @return {Transport}
     * @private
     */
    createTransport(name) {
      const query = Object.assign({}, this.opts.query);
      query.EIO = protocol;
      query.transport = name;
      if (this.id)
        query.sid = this.id;
      const opts = Object.assign({}, this.opts, {
        query,
        socket: this,
        hostname: this.hostname,
        secure: this.secure,
        port: this.port
      }, this.opts.transportOptions[name]);
      return new this._transportsByName[name](opts);
    }
    /**
     * Initializes transport to use and starts probe.
     *
     * @private
     */
    _open() {
      if (this.transports.length === 0) {
        this.setTimeoutFn(() => {
          this.emitReserved("error", "No transports available");
        }, 0);
        return;
      }
      const transportName = this.opts.rememberUpgrade && _SocketWithoutUpgrade.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1 ? "websocket" : this.transports[0];
      this.readyState = "opening";
      const transport = this.createTransport(transportName);
      transport.open();
      this.setTransport(transport);
    }
    /**
     * Sets the current transport. Disables the existing one (if any).
     *
     * @private
     */
    setTransport(transport) {
      if (this.transport) {
        this.transport.removeAllListeners();
      }
      this.transport = transport;
      transport.on("drain", this._onDrain.bind(this)).on("packet", this._onPacket.bind(this)).on("error", this._onError.bind(this)).on("close", (reason) => this._onClose("transport close", reason));
    }
    /**
     * Called when connection is deemed open.
     *
     * @private
     */
    onOpen() {
      this.readyState = "open";
      _SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === this.transport.name;
      this.emitReserved("open");
      this.flush();
    }
    /**
     * Handles a packet.
     *
     * @private
     */
    _onPacket(packet) {
      if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
        this.emitReserved("packet", packet);
        this.emitReserved("heartbeat");
        switch (packet.type) {
          case "open":
            this.onHandshake(JSON.parse(packet.data));
            break;
          case "ping":
            this._sendPacket("pong");
            this.emitReserved("ping");
            this.emitReserved("pong");
            this._resetPingTimeout();
            break;
          case "error":
            const err = new Error("server error");
            err.code = packet.data;
            this._onError(err);
            break;
          case "message":
            this.emitReserved("data", packet.data);
            this.emitReserved("message", packet.data);
            break;
        }
      } else {
      }
    }
    /**
     * Called upon handshake completion.
     *
     * @param {Object} data - handshake obj
     * @private
     */
    onHandshake(data) {
      this.emitReserved("handshake", data);
      this.id = data.sid;
      this.transport.query.sid = data.sid;
      this._pingInterval = data.pingInterval;
      this._pingTimeout = data.pingTimeout;
      this._maxPayload = data.maxPayload;
      this.onOpen();
      if ("closed" === this.readyState)
        return;
      this._resetPingTimeout();
    }
    /**
     * Sets and resets ping timeout timer based on server pings.
     *
     * @private
     */
    _resetPingTimeout() {
      this.clearTimeoutFn(this._pingTimeoutTimer);
      const delay = this._pingInterval + this._pingTimeout;
      this._pingTimeoutTime = Date.now() + delay;
      this._pingTimeoutTimer = this.setTimeoutFn(() => {
        this._onClose("ping timeout");
      }, delay);
      if (this.opts.autoUnref) {
        this._pingTimeoutTimer.unref();
      }
    }
    /**
     * Called on `drain` event
     *
     * @private
     */
    _onDrain() {
      this.writeBuffer.splice(0, this._prevBufferLen);
      this._prevBufferLen = 0;
      if (0 === this.writeBuffer.length) {
        this.emitReserved("drain");
      } else {
        this.flush();
      }
    }
    /**
     * Flush write buffers.
     *
     * @private
     */
    flush() {
      if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
        const packets = this._getWritablePackets();
        this.transport.send(packets);
        this._prevBufferLen = packets.length;
        this.emitReserved("flush");
      }
    }
    /**
     * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
     * long-polling)
     *
     * @private
     */
    _getWritablePackets() {
      const shouldCheckPayloadSize = this._maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1;
      if (!shouldCheckPayloadSize) {
        return this.writeBuffer;
      }
      let payloadSize = 1;
      for (let i = 0; i < this.writeBuffer.length; i++) {
        const data = this.writeBuffer[i].data;
        if (data) {
          payloadSize += byteLength(data);
        }
        if (i > 0 && payloadSize > this._maxPayload) {
          return this.writeBuffer.slice(0, i);
        }
        payloadSize += 2;
      }
      return this.writeBuffer;
    }
    /**
     * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
     *
     * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
     * `write()` method then the message would not be buffered by the Socket.IO client.
     *
     * @return {boolean}
     * @private
     */
    /* private */
    _hasPingExpired() {
      if (!this._pingTimeoutTime)
        return true;
      const hasExpired = Date.now() > this._pingTimeoutTime;
      if (hasExpired) {
        this._pingTimeoutTime = 0;
        nextTick(() => {
          this._onClose("ping timeout");
        }, this.setTimeoutFn);
      }
      return hasExpired;
    }
    /**
     * Sends a message.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    write(msg, options, fn) {
      this._sendPacket("message", msg, options, fn);
      return this;
    }
    /**
     * Sends a message. Alias of {@link Socket#write}.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    send(msg, options, fn) {
      this._sendPacket("message", msg, options, fn);
      return this;
    }
    /**
     * Sends a packet.
     *
     * @param {String} type: packet type.
     * @param {String} data.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @private
     */
    _sendPacket(type, data, options, fn) {
      if ("function" === typeof data) {
        fn = data;
        data = void 0;
      }
      if ("function" === typeof options) {
        fn = options;
        options = null;
      }
      if ("closing" === this.readyState || "closed" === this.readyState) {
        return;
      }
      options = options || {};
      options.compress = false !== options.compress;
      const packet = {
        type,
        data,
        options
      };
      this.emitReserved("packetCreate", packet);
      this.writeBuffer.push(packet);
      if (fn)
        this.once("flush", fn);
      this.flush();
    }
    /**
     * Closes the connection.
     */
    close() {
      const close = () => {
        this._onClose("forced close");
        this.transport.close();
      };
      const cleanupAndClose = () => {
        this.off("upgrade", cleanupAndClose);
        this.off("upgradeError", cleanupAndClose);
        close();
      };
      const waitForUpgrade = () => {
        this.once("upgrade", cleanupAndClose);
        this.once("upgradeError", cleanupAndClose);
      };
      if ("opening" === this.readyState || "open" === this.readyState) {
        this.readyState = "closing";
        if (this.writeBuffer.length) {
          this.once("drain", () => {
            if (this.upgrading) {
              waitForUpgrade();
            } else {
              close();
            }
          });
        } else if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      }
      return this;
    }
    /**
     * Called upon transport error
     *
     * @private
     */
    _onError(err) {
      _SocketWithoutUpgrade.priorWebsocketSuccess = false;
      if (this.opts.tryAllTransports && this.transports.length > 1 && this.readyState === "opening") {
        this.transports.shift();
        return this._open();
      }
      this.emitReserved("error", err);
      this._onClose("transport error", err);
    }
    /**
     * Called upon transport close.
     *
     * @private
     */
    _onClose(reason, description) {
      if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
        this.clearTimeoutFn(this._pingTimeoutTimer);
        this.transport.removeAllListeners("close");
        this.transport.close();
        this.transport.removeAllListeners();
        if (withEventListeners) {
          if (this._beforeunloadEventListener) {
            removeEventListener("beforeunload", this._beforeunloadEventListener, false);
          }
          if (this._offlineEventListener) {
            const i = OFFLINE_EVENT_LISTENERS.indexOf(this._offlineEventListener);
            if (i !== -1) {
              OFFLINE_EVENT_LISTENERS.splice(i, 1);
            }
          }
        }
        this.readyState = "closed";
        this.id = null;
        this.emitReserved("close", reason, description);
        this.writeBuffer = [];
        this._prevBufferLen = 0;
      }
    }
  };
  SocketWithoutUpgrade.protocol = protocol;
  var SocketWithUpgrade = class extends SocketWithoutUpgrade {
    constructor() {
      super(...arguments);
      this._upgrades = [];
    }
    onOpen() {
      super.onOpen();
      if ("open" === this.readyState && this.opts.upgrade) {
        for (let i = 0; i < this._upgrades.length; i++) {
          this._probe(this._upgrades[i]);
        }
      }
    }
    /**
     * Probes a transport.
     *
     * @param {String} name - transport name
     * @private
     */
    _probe(name) {
      let transport = this.createTransport(name);
      let failed = false;
      SocketWithoutUpgrade.priorWebsocketSuccess = false;
      const onTransportOpen = () => {
        if (failed)
          return;
        transport.send([{ type: "ping", data: "probe" }]);
        transport.once("packet", (msg) => {
          if (failed)
            return;
          if ("pong" === msg.type && "probe" === msg.data) {
            this.upgrading = true;
            this.emitReserved("upgrading", transport);
            if (!transport)
              return;
            SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === transport.name;
            this.transport.pause(() => {
              if (failed)
                return;
              if ("closed" === this.readyState)
                return;
              cleanup();
              this.setTransport(transport);
              transport.send([{ type: "upgrade" }]);
              this.emitReserved("upgrade", transport);
              transport = null;
              this.upgrading = false;
              this.flush();
            });
          } else {
            const err = new Error("probe error");
            err.transport = transport.name;
            this.emitReserved("upgradeError", err);
          }
        });
      };
      function freezeTransport() {
        if (failed)
          return;
        failed = true;
        cleanup();
        transport.close();
        transport = null;
      }
      const onerror = (err) => {
        const error = new Error("probe error: " + err);
        error.transport = transport.name;
        freezeTransport();
        this.emitReserved("upgradeError", error);
      };
      function onTransportClose() {
        onerror("transport closed");
      }
      function onclose() {
        onerror("socket closed");
      }
      function onupgrade(to) {
        if (transport && to.name !== transport.name) {
          freezeTransport();
        }
      }
      const cleanup = () => {
        transport.removeListener("open", onTransportOpen);
        transport.removeListener("error", onerror);
        transport.removeListener("close", onTransportClose);
        this.off("close", onclose);
        this.off("upgrading", onupgrade);
      };
      transport.once("open", onTransportOpen);
      transport.once("error", onerror);
      transport.once("close", onTransportClose);
      this.once("close", onclose);
      this.once("upgrading", onupgrade);
      if (this._upgrades.indexOf("webtransport") !== -1 && name !== "webtransport") {
        this.setTimeoutFn(() => {
          if (!failed) {
            transport.open();
          }
        }, 200);
      } else {
        transport.open();
      }
    }
    onHandshake(data) {
      this._upgrades = this._filterUpgrades(data.upgrades);
      super.onHandshake(data);
    }
    /**
     * Filters upgrades, returning only those matching client transports.
     *
     * @param {Array} upgrades - server upgrades
     * @private
     */
    _filterUpgrades(upgrades) {
      const filteredUpgrades = [];
      for (let i = 0; i < upgrades.length; i++) {
        if (~this.transports.indexOf(upgrades[i]))
          filteredUpgrades.push(upgrades[i]);
      }
      return filteredUpgrades;
    }
  };
  var Socket = class extends SocketWithUpgrade {
    constructor(uri, opts = {}) {
      const o = typeof uri === "object" ? uri : opts;
      if (!o.transports || o.transports && typeof o.transports[0] === "string") {
        o.transports = (o.transports || ["polling", "websocket", "webtransport"]).map((transportName) => transports[transportName]).filter((t) => !!t);
      }
      super(uri, o);
    }
  };

  // node_modules/engine.io-client/build/esm/index.js
  var protocol2 = Socket.protocol;

  // node_modules/socket.io-client/build/esm/url.js
  function url(uri, path = "", loc) {
    let obj = uri;
    loc = loc || typeof location !== "undefined" && location;
    if (null == uri)
      uri = loc.protocol + "//" + loc.host;
    if (typeof uri === "string") {
      if ("/" === uri.charAt(0)) {
        if ("/" === uri.charAt(1)) {
          uri = loc.protocol + uri;
        } else {
          uri = loc.host + uri;
        }
      }
      if (!/^(https?|wss?):\/\//.test(uri)) {
        if ("undefined" !== typeof loc) {
          uri = loc.protocol + "//" + uri;
        } else {
          uri = "https://" + uri;
        }
      }
      obj = parse(uri);
    }
    if (!obj.port) {
      if (/^(http|ws)$/.test(obj.protocol)) {
        obj.port = "80";
      } else if (/^(http|ws)s$/.test(obj.protocol)) {
        obj.port = "443";
      }
    }
    obj.path = obj.path || "/";
    const ipv6 = obj.host.indexOf(":") !== -1;
    const host = ipv6 ? "[" + obj.host + "]" : obj.host;
    obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
    obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : ":" + obj.port);
    return obj;
  }

  // node_modules/socket.io-parser/build/esm/index.js
  var esm_exports = {};
  __export(esm_exports, {
    Decoder: () => Decoder,
    Encoder: () => Encoder,
    PacketType: () => PacketType,
    isPacketValid: () => isPacketValid,
    protocol: () => protocol3
  });

  // node_modules/socket.io-parser/build/esm/is-binary.js
  var withNativeArrayBuffer3 = typeof ArrayBuffer === "function";
  var isView2 = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
  };
  var toString = Object.prototype.toString;
  var withNativeBlob2 = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
  var withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
  function isBinary(obj) {
    return withNativeArrayBuffer3 && (obj instanceof ArrayBuffer || isView2(obj)) || withNativeBlob2 && obj instanceof Blob || withNativeFile && obj instanceof File;
  }
  function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
      return false;
    }
    if (Array.isArray(obj)) {
      for (let i = 0, l = obj.length; i < l; i++) {
        if (hasBinary(obj[i])) {
          return true;
        }
      }
      return false;
    }
    if (isBinary(obj)) {
      return true;
    }
    if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
      return hasBinary(obj.toJSON(), true);
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
        return true;
      }
    }
    return false;
  }

  // node_modules/socket.io-parser/build/esm/binary.js
  function deconstructPacket(packet) {
    const buffers = [];
    const packetData = packet.data;
    const pack = packet;
    pack.data = _deconstructPacket(packetData, buffers);
    pack.attachments = buffers.length;
    return { packet: pack, buffers };
  }
  function _deconstructPacket(data, buffers) {
    if (!data)
      return data;
    if (isBinary(data)) {
      const placeholder = { _placeholder: true, num: buffers.length };
      buffers.push(data);
      return placeholder;
    } else if (Array.isArray(data)) {
      const newData = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        newData[i] = _deconstructPacket(data[i], buffers);
      }
      return newData;
    } else if (typeof data === "object" && !(data instanceof Date)) {
      const newData = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          newData[key] = _deconstructPacket(data[key], buffers);
        }
      }
      return newData;
    }
    return data;
  }
  function reconstructPacket(packet, buffers) {
    packet.data = _reconstructPacket(packet.data, buffers);
    delete packet.attachments;
    return packet;
  }
  function _reconstructPacket(data, buffers) {
    if (!data)
      return data;
    if (data && data._placeholder === true) {
      const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
      if (isIndexValid) {
        return buffers[data.num];
      } else {
        throw new Error("illegal attachments");
      }
    } else if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        data[i] = _reconstructPacket(data[i], buffers);
      }
    } else if (typeof data === "object") {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          data[key] = _reconstructPacket(data[key], buffers);
        }
      }
    }
    return data;
  }

  // node_modules/socket.io-parser/build/esm/index.js
  var RESERVED_EVENTS = [
    "connect",
    // used on the client side
    "connect_error",
    // used on the client side
    "disconnect",
    // used on both sides
    "disconnecting",
    // used on the server side
    "newListener",
    // used by the Node.js EventEmitter
    "removeListener"
    // used by the Node.js EventEmitter
  ];
  var protocol3 = 5;
  var PacketType;
  (function(PacketType2) {
    PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
    PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
    PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
    PacketType2[PacketType2["ACK"] = 3] = "ACK";
    PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
    PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
    PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
  })(PacketType || (PacketType = {}));
  var Encoder = class {
    /**
     * Encoder constructor
     *
     * @param {function} replacer - custom replacer to pass down to JSON.parse
     */
    constructor(replacer) {
      this.replacer = replacer;
    }
    /**
     * Encode a packet as a single string if non-binary, or as a
     * buffer sequence, depending on packet type.
     *
     * @param {Object} obj - packet object
     */
    encode(obj) {
      if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
        if (hasBinary(obj)) {
          return this.encodeAsBinary({
            type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
            nsp: obj.nsp,
            data: obj.data,
            id: obj.id
          });
        }
      }
      return [this.encodeAsString(obj)];
    }
    /**
     * Encode packet as string.
     */
    encodeAsString(obj) {
      let str = "" + obj.type;
      if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
        str += obj.attachments + "-";
      }
      if (obj.nsp && "/" !== obj.nsp) {
        str += obj.nsp + ",";
      }
      if (null != obj.id) {
        str += obj.id;
      }
      if (null != obj.data) {
        str += JSON.stringify(obj.data, this.replacer);
      }
      return str;
    }
    /**
     * Encode packet as 'buffer sequence' by removing blobs, and
     * deconstructing packet into object with placeholders and
     * a list of buffers.
     */
    encodeAsBinary(obj) {
      const deconstruction = deconstructPacket(obj);
      const pack = this.encodeAsString(deconstruction.packet);
      const buffers = deconstruction.buffers;
      buffers.unshift(pack);
      return buffers;
    }
  };
  var Decoder = class _Decoder extends Emitter {
    /**
     * Decoder constructor
     *
     * @param {function} reviver - custom reviver to pass down to JSON.stringify
     */
    constructor(reviver) {
      super();
      this.reviver = reviver;
    }
    /**
     * Decodes an encoded packet string into packet JSON.
     *
     * @param {String} obj - encoded packet
     */
    add(obj) {
      let packet;
      if (typeof obj === "string") {
        if (this.reconstructor) {
          throw new Error("got plaintext data when reconstructing a packet");
        }
        packet = this.decodeString(obj);
        const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
        if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
          packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
          this.reconstructor = new BinaryReconstructor(packet);
          if (packet.attachments === 0) {
            super.emitReserved("decoded", packet);
          }
        } else {
          super.emitReserved("decoded", packet);
        }
      } else if (isBinary(obj) || obj.base64) {
        if (!this.reconstructor) {
          throw new Error("got binary data when not reconstructing a packet");
        } else {
          packet = this.reconstructor.takeBinaryData(obj);
          if (packet) {
            this.reconstructor = null;
            super.emitReserved("decoded", packet);
          }
        }
      } else {
        throw new Error("Unknown type: " + obj);
      }
    }
    /**
     * Decode a packet String (JSON data)
     *
     * @param {String} str
     * @return {Object} packet
     */
    decodeString(str) {
      let i = 0;
      const p = {
        type: Number(str.charAt(0))
      };
      if (PacketType[p.type] === void 0) {
        throw new Error("unknown packet type " + p.type);
      }
      if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
        const start = i + 1;
        while (str.charAt(++i) !== "-" && i != str.length) {
        }
        const buf = str.substring(start, i);
        if (buf != Number(buf) || str.charAt(i) !== "-") {
          throw new Error("Illegal attachments");
        }
        p.attachments = Number(buf);
      }
      if ("/" === str.charAt(i + 1)) {
        const start = i + 1;
        while (++i) {
          const c = str.charAt(i);
          if ("," === c)
            break;
          if (i === str.length)
            break;
        }
        p.nsp = str.substring(start, i);
      } else {
        p.nsp = "/";
      }
      const next = str.charAt(i + 1);
      if ("" !== next && Number(next) == next) {
        const start = i + 1;
        while (++i) {
          const c = str.charAt(i);
          if (null == c || Number(c) != c) {
            --i;
            break;
          }
          if (i === str.length)
            break;
        }
        p.id = Number(str.substring(start, i + 1));
      }
      if (str.charAt(++i)) {
        const payload = this.tryParse(str.substr(i));
        if (_Decoder.isPayloadValid(p.type, payload)) {
          p.data = payload;
        } else {
          throw new Error("invalid payload");
        }
      }
      return p;
    }
    tryParse(str) {
      try {
        return JSON.parse(str, this.reviver);
      } catch (e) {
        return false;
      }
    }
    static isPayloadValid(type, payload) {
      switch (type) {
        case PacketType.CONNECT:
          return isObject(payload);
        case PacketType.DISCONNECT:
          return payload === void 0;
        case PacketType.CONNECT_ERROR:
          return typeof payload === "string" || isObject(payload);
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          return Array.isArray(payload);
      }
    }
    /**
     * Deallocates a parser's resources
     */
    destroy() {
      if (this.reconstructor) {
        this.reconstructor.finishedReconstruction();
        this.reconstructor = null;
      }
    }
  };
  var BinaryReconstructor = class {
    constructor(packet) {
      this.packet = packet;
      this.buffers = [];
      this.reconPack = packet;
    }
    /**
     * Method to be called when binary data received from connection
     * after a BINARY_EVENT packet.
     *
     * @param {Buffer | ArrayBuffer} binData - the raw binary data received
     * @return {null | Object} returns null if more binary data is expected or
     *   a reconstructed packet object if all buffers have been received.
     */
    takeBinaryData(binData) {
      this.buffers.push(binData);
      if (this.buffers.length === this.reconPack.attachments) {
        const packet = reconstructPacket(this.reconPack, this.buffers);
        this.finishedReconstruction();
        return packet;
      }
      return null;
    }
    /**
     * Cleans up binary packet reconstruction variables.
     */
    finishedReconstruction() {
      this.reconPack = null;
      this.buffers = [];
    }
  };
  function isNamespaceValid(nsp) {
    return typeof nsp === "string";
  }
  var isInteger = Number.isInteger || function(value2) {
    return typeof value2 === "number" && isFinite(value2) && Math.floor(value2) === value2;
  };
  function isAckIdValid(id) {
    return id === void 0 || isInteger(id);
  }
  function isObject(value2) {
    return Object.prototype.toString.call(value2) === "[object Object]";
  }
  function isDataValid(type, payload) {
    switch (type) {
      case PacketType.CONNECT:
        return payload === void 0 || isObject(payload);
      case PacketType.DISCONNECT:
        return payload === void 0;
      case PacketType.EVENT:
        return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
      case PacketType.ACK:
        return Array.isArray(payload);
      case PacketType.CONNECT_ERROR:
        return typeof payload === "string" || isObject(payload);
      default:
        return false;
    }
  }
  function isPacketValid(packet) {
    return isNamespaceValid(packet.nsp) && isAckIdValid(packet.id) && isDataValid(packet.type, packet.data);
  }

  // node_modules/socket.io-client/build/esm/on.js
  function on(obj, ev, fn) {
    obj.on(ev, fn);
    return function subDestroy() {
      obj.off(ev, fn);
    };
  }

  // node_modules/socket.io-client/build/esm/socket.js
  var RESERVED_EVENTS2 = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
    newListener: 1,
    removeListener: 1
  });
  var Socket2 = class extends Emitter {
    /**
     * `Socket` constructor.
     */
    constructor(io, nsp, opts) {
      super();
      this.connected = false;
      this.recovered = false;
      this.receiveBuffer = [];
      this.sendBuffer = [];
      this._queue = [];
      this._queueSeq = 0;
      this.ids = 0;
      this.acks = {};
      this.flags = {};
      this.io = io;
      this.nsp = nsp;
      if (opts && opts.auth) {
        this.auth = opts.auth;
      }
      this._opts = Object.assign({}, opts);
      if (this.io._autoConnect)
        this.open();
    }
    /**
     * Whether the socket is currently disconnected
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log(socket.disconnected); // false
     * });
     *
     * socket.on("disconnect", () => {
     *   console.log(socket.disconnected); // true
     * });
     */
    get disconnected() {
      return !this.connected;
    }
    /**
     * Subscribe to open, close and packet events
     *
     * @private
     */
    subEvents() {
      if (this.subs)
        return;
      const io = this.io;
      this.subs = [
        on(io, "open", this.onopen.bind(this)),
        on(io, "packet", this.onpacket.bind(this)),
        on(io, "error", this.onerror.bind(this)),
        on(io, "close", this.onclose.bind(this))
      ];
    }
    /**
     * Whether the Socket will try to reconnect when its Manager connects or reconnects.
     *
     * @example
     * const socket = io();
     *
     * console.log(socket.active); // true
     *
     * socket.on("disconnect", (reason) => {
     *   if (reason === "io server disconnect") {
     *     // the disconnection was initiated by the server, you need to manually reconnect
     *     console.log(socket.active); // false
     *   }
     *   // else the socket will automatically try to reconnect
     *   console.log(socket.active); // true
     * });
     */
    get active() {
      return !!this.subs;
    }
    /**
     * "Opens" the socket.
     *
     * @example
     * const socket = io({
     *   autoConnect: false
     * });
     *
     * socket.connect();
     */
    connect() {
      if (this.connected)
        return this;
      this.subEvents();
      if (!this.io["_reconnecting"])
        this.io.open();
      if ("open" === this.io._readyState)
        this.onopen();
      return this;
    }
    /**
     * Alias for {@link connect()}.
     */
    open() {
      return this.connect();
    }
    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * socket.send("hello");
     *
     * // this is equivalent to
     * socket.emit("message", "hello");
     *
     * @return self
     */
    send(...args) {
      args.unshift("message");
      this.emit.apply(this, args);
      return this;
    }
    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @example
     * socket.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the server
     * socket.emit("hello", "world", (val) => {
     *   // ...
     * });
     *
     * @return self
     */
    emit(ev, ...args) {
      var _a, _b, _c;
      if (RESERVED_EVENTS2.hasOwnProperty(ev)) {
        throw new Error('"' + ev.toString() + '" is a reserved event name');
      }
      args.unshift(ev);
      if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
        this._addToQueue(args);
        return this;
      }
      const packet = {
        type: PacketType.EVENT,
        data: args
      };
      packet.options = {};
      packet.options.compress = this.flags.compress !== false;
      if ("function" === typeof args[args.length - 1]) {
        const id = this.ids++;
        const ack = args.pop();
        this._registerAckCallback(id, ack);
        packet.id = id;
      }
      const isTransportWritable = (_b = (_a = this.io.engine) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.writable;
      const isConnected = this.connected && !((_c = this.io.engine) === null || _c === void 0 ? void 0 : _c._hasPingExpired());
      const discardPacket = this.flags.volatile && !isTransportWritable;
      if (discardPacket) {
      } else if (isConnected) {
        this.notifyOutgoingListeners(packet);
        this.packet(packet);
      } else {
        this.sendBuffer.push(packet);
      }
      this.flags = {};
      return this;
    }
    /**
     * @private
     */
    _registerAckCallback(id, ack) {
      var _a;
      const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
      if (timeout === void 0) {
        this.acks[id] = ack;
        return;
      }
      const timer = this.io.setTimeoutFn(() => {
        delete this.acks[id];
        for (let i = 0; i < this.sendBuffer.length; i++) {
          if (this.sendBuffer[i].id === id) {
            this.sendBuffer.splice(i, 1);
          }
        }
        ack.call(this, new Error("operation has timed out"));
      }, timeout);
      const fn = (...args) => {
        this.io.clearTimeoutFn(timer);
        ack.apply(this, args);
      };
      fn.withError = true;
      this.acks[id] = fn;
    }
    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * // without timeout
     * const response = await socket.emitWithAck("hello", "world");
     *
     * // with a specific timeout
     * try {
     *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
     * } catch (err) {
     *   // the server did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when the server acknowledges the event
     */
    emitWithAck(ev, ...args) {
      return new Promise((resolve, reject) => {
        const fn = (arg1, arg2) => {
          return arg1 ? reject(arg1) : resolve(arg2);
        };
        fn.withError = true;
        args.push(fn);
        this.emit(ev, ...args);
      });
    }
    /**
     * Add the packet to the queue.
     * @param args
     * @private
     */
    _addToQueue(args) {
      let ack;
      if (typeof args[args.length - 1] === "function") {
        ack = args.pop();
      }
      const packet = {
        id: this._queueSeq++,
        tryCount: 0,
        pending: false,
        args,
        flags: Object.assign({ fromQueue: true }, this.flags)
      };
      args.push((err, ...responseArgs) => {
        if (packet !== this._queue[0]) {
        }
        const hasError = err !== null;
        if (hasError) {
          if (packet.tryCount > this._opts.retries) {
            this._queue.shift();
            if (ack) {
              ack(err);
            }
          }
        } else {
          this._queue.shift();
          if (ack) {
            ack(null, ...responseArgs);
          }
        }
        packet.pending = false;
        return this._drainQueue();
      });
      this._queue.push(packet);
      this._drainQueue();
    }
    /**
     * Send the first packet of the queue, and wait for an acknowledgement from the server.
     * @param force - whether to resend a packet that has not been acknowledged yet
     *
     * @private
     */
    _drainQueue(force = false) {
      if (!this.connected || this._queue.length === 0) {
        return;
      }
      const packet = this._queue[0];
      if (packet.pending && !force) {
        return;
      }
      packet.pending = true;
      packet.tryCount++;
      this.flags = packet.flags;
      this.emit.apply(this, packet.args);
    }
    /**
     * Sends a packet.
     *
     * @param packet
     * @private
     */
    packet(packet) {
      packet.nsp = this.nsp;
      this.io._packet(packet);
    }
    /**
     * Called upon engine `open`.
     *
     * @private
     */
    onopen() {
      if (typeof this.auth == "function") {
        this.auth((data) => {
          this._sendConnectPacket(data);
        });
      } else {
        this._sendConnectPacket(this.auth);
      }
    }
    /**
     * Sends a CONNECT packet to initiate the Socket.IO session.
     *
     * @param data
     * @private
     */
    _sendConnectPacket(data) {
      this.packet({
        type: PacketType.CONNECT,
        data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data) : data
      });
    }
    /**
     * Called upon engine or manager `error`.
     *
     * @param err
     * @private
     */
    onerror(err) {
      if (!this.connected) {
        this.emitReserved("connect_error", err);
      }
    }
    /**
     * Called upon engine `close`.
     *
     * @param reason
     * @param description
     * @private
     */
    onclose(reason, description) {
      this.connected = false;
      delete this.id;
      this.emitReserved("disconnect", reason, description);
      this._clearAcks();
    }
    /**
     * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
     * the server.
     *
     * @private
     */
    _clearAcks() {
      Object.keys(this.acks).forEach((id) => {
        const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
        if (!isBuffered) {
          const ack = this.acks[id];
          delete this.acks[id];
          if (ack.withError) {
            ack.call(this, new Error("socket has been disconnected"));
          }
        }
      });
    }
    /**
     * Called with socket packet.
     *
     * @param packet
     * @private
     */
    onpacket(packet) {
      const sameNamespace = packet.nsp === this.nsp;
      if (!sameNamespace)
        return;
      switch (packet.type) {
        case PacketType.CONNECT:
          if (packet.data && packet.data.sid) {
            this.onconnect(packet.data.sid, packet.data.pid);
          } else {
            this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
          }
          break;
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          this.onevent(packet);
          break;
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          this.onack(packet);
          break;
        case PacketType.DISCONNECT:
          this.ondisconnect();
          break;
        case PacketType.CONNECT_ERROR:
          this.destroy();
          const err = new Error(packet.data.message);
          err.data = packet.data.data;
          this.emitReserved("connect_error", err);
          break;
      }
    }
    /**
     * Called upon a server event.
     *
     * @param packet
     * @private
     */
    onevent(packet) {
      const args = packet.data || [];
      if (null != packet.id) {
        args.push(this.ack(packet.id));
      }
      if (this.connected) {
        this.emitEvent(args);
      } else {
        this.receiveBuffer.push(Object.freeze(args));
      }
    }
    emitEvent(args) {
      if (this._anyListeners && this._anyListeners.length) {
        const listeners = this._anyListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, args);
        }
      }
      super.emit.apply(this, args);
      if (this._pid && args.length && typeof args[args.length - 1] === "string") {
        this._lastOffset = args[args.length - 1];
      }
    }
    /**
     * Produces an ack callback to emit with an event.
     *
     * @private
     */
    ack(id) {
      const self2 = this;
      let sent = false;
      return function(...args) {
        if (sent)
          return;
        sent = true;
        self2.packet({
          type: PacketType.ACK,
          id,
          data: args
        });
      };
    }
    /**
     * Called upon a server acknowledgement.
     *
     * @param packet
     * @private
     */
    onack(packet) {
      const ack = this.acks[packet.id];
      if (typeof ack !== "function") {
        return;
      }
      delete this.acks[packet.id];
      if (ack.withError) {
        packet.data.unshift(null);
      }
      ack.apply(this, packet.data);
    }
    /**
     * Called upon server connect.
     *
     * @private
     */
    onconnect(id, pid) {
      this.id = id;
      this.recovered = pid && this._pid === pid;
      this._pid = pid;
      this.connected = true;
      this.emitBuffered();
      this._drainQueue(true);
      this.emitReserved("connect");
    }
    /**
     * Emit buffered events (received and emitted).
     *
     * @private
     */
    emitBuffered() {
      this.receiveBuffer.forEach((args) => this.emitEvent(args));
      this.receiveBuffer = [];
      this.sendBuffer.forEach((packet) => {
        this.notifyOutgoingListeners(packet);
        this.packet(packet);
      });
      this.sendBuffer = [];
    }
    /**
     * Called upon server disconnect.
     *
     * @private
     */
    ondisconnect() {
      this.destroy();
      this.onclose("io server disconnect");
    }
    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @private
     */
    destroy() {
      if (this.subs) {
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs = void 0;
      }
      this.io["_destroy"](this);
    }
    /**
     * Disconnects the socket manually. In that case, the socket will not try to reconnect.
     *
     * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
     *
     * @example
     * const socket = io();
     *
     * socket.on("disconnect", (reason) => {
     *   // console.log(reason); prints "io client disconnect"
     * });
     *
     * socket.disconnect();
     *
     * @return self
     */
    disconnect() {
      if (this.connected) {
        this.packet({ type: PacketType.DISCONNECT });
      }
      this.destroy();
      if (this.connected) {
        this.onclose("io client disconnect");
      }
      return this;
    }
    /**
     * Alias for {@link disconnect()}.
     *
     * @return self
     */
    close() {
      return this.disconnect();
    }
    /**
     * Sets the compress flag.
     *
     * @example
     * socket.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    compress(compress) {
      this.flags.compress = compress;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
     * ready to send messages.
     *
     * @example
     * socket.volatile.emit("hello"); // the server may or may not receive it
     *
     * @returns self
     */
    get volatile() {
      this.flags.volatile = true;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the server:
     *
     * @example
     * socket.timeout(5000).emit("my-event", (err) => {
     *   if (err) {
     *     // the server did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @returns self
     */
    timeout(timeout) {
      this.flags.timeout = timeout;
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @example
     * socket.onAny((event, ...args) => {
     *   console.log(`got ${event}`);
     * });
     *
     * @param listener
     */
    onAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.push(listener);
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * socket.prependAny((event, ...args) => {
     *   console.log(`got event ${event}`);
     * });
     *
     * @param listener
     */
    prependAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.unshift(listener);
      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`got event ${event}`);
     * }
     *
     * socket.onAny(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAny(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAny();
     *
     * @param listener
     */
    offAny(listener) {
      if (!this._anyListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyListeners;
        for (let i = 0; i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyListeners = [];
      }
      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAny() {
      return this._anyListeners || [];
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.onAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    onAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.push(listener);
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.prependAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    prependAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.unshift(listener);
      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`sent event ${event}`);
     * }
     *
     * socket.onAnyOutgoing(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAnyOutgoing(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAnyOutgoing();
     *
     * @param [listener] - the catch-all listener (optional)
     */
    offAnyOutgoing(listener) {
      if (!this._anyOutgoingListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyOutgoingListeners;
        for (let i = 0; i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyOutgoingListeners = [];
      }
      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAnyOutgoing() {
      return this._anyOutgoingListeners || [];
    }
    /**
     * Notify the listeners for each packet sent
     *
     * @param packet
     *
     * @private
     */
    notifyOutgoingListeners(packet) {
      if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
        const listeners = this._anyOutgoingListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, packet.data);
        }
      }
    }
  };

  // node_modules/socket.io-client/build/esm/contrib/backo2.js
  function Backoff(opts) {
    opts = opts || {};
    this.ms = opts.min || 100;
    this.max = opts.max || 1e4;
    this.factor = opts.factor || 2;
    this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
  }
  Backoff.prototype.duration = function() {
    var ms = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
      var rand = Math.random();
      var deviation = Math.floor(rand * this.jitter * ms);
      ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, this.max) | 0;
  };
  Backoff.prototype.reset = function() {
    this.attempts = 0;
  };
  Backoff.prototype.setMin = function(min) {
    this.ms = min;
  };
  Backoff.prototype.setMax = function(max) {
    this.max = max;
  };
  Backoff.prototype.setJitter = function(jitter) {
    this.jitter = jitter;
  };

  // node_modules/socket.io-client/build/esm/manager.js
  var Manager = class extends Emitter {
    constructor(uri, opts) {
      var _a;
      super();
      this.nsps = {};
      this.subs = [];
      if (uri && "object" === typeof uri) {
        opts = uri;
        uri = void 0;
      }
      opts = opts || {};
      opts.path = opts.path || "/socket.io";
      this.opts = opts;
      installTimerFunctions(this, opts);
      this.reconnection(opts.reconnection !== false);
      this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
      this.reconnectionDelay(opts.reconnectionDelay || 1e3);
      this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
      this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
      this.backoff = new Backoff({
        min: this.reconnectionDelay(),
        max: this.reconnectionDelayMax(),
        jitter: this.randomizationFactor()
      });
      this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
      this._readyState = "closed";
      this.uri = uri;
      const _parser = opts.parser || esm_exports;
      this.encoder = new _parser.Encoder();
      this.decoder = new _parser.Decoder();
      this._autoConnect = opts.autoConnect !== false;
      if (this._autoConnect)
        this.open();
    }
    reconnection(v) {
      if (!arguments.length)
        return this._reconnection;
      this._reconnection = !!v;
      if (!v) {
        this.skipReconnect = true;
      }
      return this;
    }
    reconnectionAttempts(v) {
      if (v === void 0)
        return this._reconnectionAttempts;
      this._reconnectionAttempts = v;
      return this;
    }
    reconnectionDelay(v) {
      var _a;
      if (v === void 0)
        return this._reconnectionDelay;
      this._reconnectionDelay = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
      return this;
    }
    randomizationFactor(v) {
      var _a;
      if (v === void 0)
        return this._randomizationFactor;
      this._randomizationFactor = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
      return this;
    }
    reconnectionDelayMax(v) {
      var _a;
      if (v === void 0)
        return this._reconnectionDelayMax;
      this._reconnectionDelayMax = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
      return this;
    }
    timeout(v) {
      if (!arguments.length)
        return this._timeout;
      this._timeout = v;
      return this;
    }
    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @private
     */
    maybeReconnectOnOpen() {
      if (!this._reconnecting && this._reconnection && this.backoff.attempts === 0) {
        this.reconnect();
      }
    }
    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} fn - optional, callback
     * @return self
     * @public
     */
    open(fn) {
      if (~this._readyState.indexOf("open"))
        return this;
      this.engine = new Socket(this.uri, this.opts);
      const socket = this.engine;
      const self2 = this;
      this._readyState = "opening";
      this.skipReconnect = false;
      const openSubDestroy = on(socket, "open", function() {
        self2.onopen();
        fn && fn();
      });
      const onError = (err) => {
        this.cleanup();
        this._readyState = "closed";
        this.emitReserved("error", err);
        if (fn) {
          fn(err);
        } else {
          this.maybeReconnectOnOpen();
        }
      };
      const errorSub = on(socket, "error", onError);
      if (false !== this._timeout) {
        const timeout = this._timeout;
        const timer = this.setTimeoutFn(() => {
          openSubDestroy();
          onError(new Error("timeout"));
          socket.close();
        }, timeout);
        if (this.opts.autoUnref) {
          timer.unref();
        }
        this.subs.push(() => {
          this.clearTimeoutFn(timer);
        });
      }
      this.subs.push(openSubDestroy);
      this.subs.push(errorSub);
      return this;
    }
    /**
     * Alias for open()
     *
     * @return self
     * @public
     */
    connect(fn) {
      return this.open(fn);
    }
    /**
     * Called upon transport open.
     *
     * @private
     */
    onopen() {
      this.cleanup();
      this._readyState = "open";
      this.emitReserved("open");
      const socket = this.engine;
      this.subs.push(
        on(socket, "ping", this.onping.bind(this)),
        on(socket, "data", this.ondata.bind(this)),
        on(socket, "error", this.onerror.bind(this)),
        on(socket, "close", this.onclose.bind(this)),
        // @ts-ignore
        on(this.decoder, "decoded", this.ondecoded.bind(this))
      );
    }
    /**
     * Called upon a ping.
     *
     * @private
     */
    onping() {
      this.emitReserved("ping");
    }
    /**
     * Called with data.
     *
     * @private
     */
    ondata(data) {
      try {
        this.decoder.add(data);
      } catch (e) {
        this.onclose("parse error", e);
      }
    }
    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    ondecoded(packet) {
      nextTick(() => {
        this.emitReserved("packet", packet);
      }, this.setTimeoutFn);
    }
    /**
     * Called upon socket error.
     *
     * @private
     */
    onerror(err) {
      this.emitReserved("error", err);
    }
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @public
     */
    socket(nsp, opts) {
      let socket = this.nsps[nsp];
      if (!socket) {
        socket = new Socket2(this, nsp, opts);
        this.nsps[nsp] = socket;
      } else if (this._autoConnect && !socket.active) {
        socket.connect();
      }
      return socket;
    }
    /**
     * Called upon a socket close.
     *
     * @param socket
     * @private
     */
    _destroy(socket) {
      const nsps = Object.keys(this.nsps);
      for (const nsp of nsps) {
        const socket2 = this.nsps[nsp];
        if (socket2.active) {
          return;
        }
      }
      this._close();
    }
    /**
     * Writes a packet.
     *
     * @param packet
     * @private
     */
    _packet(packet) {
      const encodedPackets = this.encoder.encode(packet);
      for (let i = 0; i < encodedPackets.length; i++) {
        this.engine.write(encodedPackets[i], packet.options);
      }
    }
    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @private
     */
    cleanup() {
      this.subs.forEach((subDestroy) => subDestroy());
      this.subs.length = 0;
      this.decoder.destroy();
    }
    /**
     * Close the current socket.
     *
     * @private
     */
    _close() {
      this.skipReconnect = true;
      this._reconnecting = false;
      this.onclose("forced close");
    }
    /**
     * Alias for close()
     *
     * @private
     */
    disconnect() {
      return this._close();
    }
    /**
     * Called when:
     *
     * - the low-level engine is closed
     * - the parser encountered a badly formatted packet
     * - all sockets are disconnected
     *
     * @private
     */
    onclose(reason, description) {
      var _a;
      this.cleanup();
      (_a = this.engine) === null || _a === void 0 ? void 0 : _a.close();
      this.backoff.reset();
      this._readyState = "closed";
      this.emitReserved("close", reason, description);
      if (this._reconnection && !this.skipReconnect) {
        this.reconnect();
      }
    }
    /**
     * Attempt a reconnection.
     *
     * @private
     */
    reconnect() {
      if (this._reconnecting || this.skipReconnect)
        return this;
      const self2 = this;
      if (this.backoff.attempts >= this._reconnectionAttempts) {
        this.backoff.reset();
        this.emitReserved("reconnect_failed");
        this._reconnecting = false;
      } else {
        const delay = this.backoff.duration();
        this._reconnecting = true;
        const timer = this.setTimeoutFn(() => {
          if (self2.skipReconnect)
            return;
          this.emitReserved("reconnect_attempt", self2.backoff.attempts);
          if (self2.skipReconnect)
            return;
          self2.open((err) => {
            if (err) {
              self2._reconnecting = false;
              self2.reconnect();
              this.emitReserved("reconnect_error", err);
            } else {
              self2.onreconnect();
            }
          });
        }, delay);
        if (this.opts.autoUnref) {
          timer.unref();
        }
        this.subs.push(() => {
          this.clearTimeoutFn(timer);
        });
      }
    }
    /**
     * Called upon successful reconnect.
     *
     * @private
     */
    onreconnect() {
      const attempt = this.backoff.attempts;
      this._reconnecting = false;
      this.backoff.reset();
      this.emitReserved("reconnect", attempt);
    }
  };

  // node_modules/socket.io-client/build/esm/index.js
  var cache = {};
  function lookup2(uri, opts) {
    if (typeof uri === "object") {
      opts = uri;
      uri = void 0;
    }
    opts = opts || {};
    const parsed = url(uri, opts.path || "/socket.io");
    const source = parsed.source;
    const id = parsed.id;
    const path = parsed.path;
    const sameNamespace = cache[id] && path in cache[id]["nsps"];
    const newConnection = opts.forceNew || opts["force new connection"] || false === opts.multiplex || sameNamespace;
    let io;
    if (newConnection) {
      io = new Manager(source, opts);
    } else {
      if (!cache[id]) {
        cache[id] = new Manager(source, opts);
      }
      io = cache[id];
    }
    if (parsed.query && !opts.query) {
      opts.query = parsed.queryKey;
    }
    return io.socket(parsed.path, opts);
  }
  Object.assign(lookup2, {
    Manager,
    Socket: Socket2,
    io: lookup2,
    connect: lookup2
  });

  // src/services/aos.service.ts
  var AosService = class {
    constructor(websocketUrl = "https://kit.digitalauto.tech", targetId) {
      this.websocketUrl = websocketUrl;
      this.targetId = targetId;
      this.socket = null;
      this.isConnected = false;
      this.messageHandlers = /* @__PURE__ */ new Map();
      this.pendingRequests = /* @__PURE__ */ new Map();
      if (websocketUrl.startsWith("ws://") || websocketUrl.startsWith("wss://")) {
        this.websocketUrl = websocketUrl.replace(/^wss?:\/\//, "https://");
      }
    }
    // Set the target ID (edge device or container)
    setTargetId(targetId) {
      this.targetId = targetId;
      console.log("[AosService] Target ID set to:", targetId);
    }
    async connect() {
      if (this.isConnected || this.socket && this.socket.connected) {
        return;
      }
      return new Promise((resolve, reject) => {
        try {
          console.log("[AosService] Connecting to Socket.IO:", this.websocketUrl);
          this.socket = lookup2(this.websocketUrl, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1e3
          });
          const connectionTimeout = setTimeout(() => {
            reject(new Error("Connection timeout"));
          }, 1e4);
          this.socket.on("connect", () => {
            clearTimeout(connectionTimeout);
            this.isConnected = true;
            this.setupEventHandlers();
            console.log("[AosService] Connected to AOS Service");
            resolve();
          });
          this.socket.on("connect_error", (error) => {
            clearTimeout(connectionTimeout);
            console.error("[AosService] Socket.IO connection error:", error);
            reject(new Error("Socket.IO connection failed: " + error.message));
          });
          this.socket.on("disconnect", () => {
            console.log("[AosService] Socket.IO disconnected");
            this.isConnected = false;
          });
        } catch (error) {
          reject(error);
        }
      });
    }
    disconnect() {
      this.isConnected = false;
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.pendingRequests.forEach((request) => {
        clearTimeout(request.timeout);
        request.reject(new Error("Connection closed"));
      });
      this.pendingRequests.clear();
      console.log("[AosService] Disconnected");
    }
    setupEventHandlers() {
      if (!this.socket)
        return;
      this.socket.on("messageToKit-kitReply", (message) => {
        this.handleMessage(message);
      });
      this.socket.on("broadcastToClient", (message) => {
        this.handleMessage(message);
      });
      this.socket.on("aos-build-progress", (message) => {
        const handler = this.messageHandlers.get("aos-build-progress");
        if (handler)
          handler(message);
      });
      this.socket.on("aos-deploy-status", (message) => {
        const handler = this.messageHandlers.get("aos-deploy-status");
        if (handler)
          handler(message);
      });
      console.log("[AosService] Event handlers registered");
    }
    handleMessage(message) {
      if (message.id && this.pendingRequests.has(message.id)) {
        const request = this.pendingRequests.get(message.id);
        clearTimeout(request.timeout);
        this.pendingRequests.delete(message.id);
        if (message.type === "error" || message.error) {
          request.reject(new Error(message.error || "Unknown error"));
        } else {
          request.resolve(message);
        }
        return;
      }
      if (message.type) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
          handler(message);
        }
      }
    }
    sendCommand(cmd, data = {}) {
      if (!this.isConnected || !this.socket) {
        return Promise.reject(new Error("Not connected to AOS Service"));
      }
      const messageId = "aos-msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      return new Promise((resolve, reject) => {
        const timeoutMs = cmd === "aos_build_deploy" ? 18e4 : cmd === "aos_run_automation" ? 12e4 : 6e4;
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(messageId);
          reject(new Error(`Request timeout (${timeoutMs / 1e3}s) \u2014 check if the Docker instance is responding`));
        }, timeoutMs);
        this.pendingRequests.set(messageId, { resolve, reject, timeout });
        const message = {
          id: messageId,
          cmd,
          to_kit_id: this.targetId || "default",
          type: cmd,
          ...data
        };
        console.log("[AosService] Sending command:", cmd);
        console.log("[AosService] Message:", message);
        try {
          this.socket.emit("messageToKit", message);
        } catch (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(messageId);
          reject(error);
        }
      });
    }
    // Build and deploy AOS application
    async buildAndDeploy(request) {
      const lang = request.language || "python";
      const data = {
        yamlConfig: request.yamlConfig,
        language: lang
      };
      if (lang === "python") {
        data.pythonCode = request.pythonCode || "";
      } else {
        data.cppCode = request.cppCode || "";
      }
      console.log("[AosService] Building app with language:", lang, "code length:", (request.cppCode || request.pythonCode || "").length);
      const response = await this.sendCommand("aos_build_deploy", data);
      if (response.status === "started" || response.result === "success" || response.status === "building" || response.status === "success") {
        return {
          status: response.status || "building",
          appId: response.appId || response.executionId || response.app_id || request.name,
          executionId: response.executionId || response.appId || request.name,
          message: response.message || "Build started"
        };
      } else {
        throw new Error(response.result || response.message || response.error || "Build failed");
      }
    }
    // Get deployed AOS applications
    async getDeployedApps() {
      const response = await this.sendCommand("aos_list_apps", {});
      if (response.applications && Array.isArray(response.applications)) {
        return {
          applications: response.applications.map((app) => ({
            app_id: app.app_id || app.appId || app.name,
            name: app.name || app.app_name || "Unknown",
            status: app.status || "unknown",
            type: "cpp",
            deploy_time: app.deploy_time || app.startTime || (/* @__PURE__ */ new Date()).toISOString(),
            config: app.config
          }))
        };
      }
      return { applications: [] };
    }
    // Start an AOS application
    async startApp(appId) {
      return this.sendCommand("aos_start_app", { appId });
    }
    // Stop an AOS application
    async stopApp(appId) {
      return this.sendCommand("aos_stop_app", { appId });
    }
    // Get deployment status from AosCloud
    async getDeploymentStatus(serviceUuid, unitUid, subjectId) {
      const response = await this.sendCommand("aos_get_deployment_status", { serviceUuid, unitUid, subjectId });
      if (response.status === "success" && response.service) {
        return {
          status: "success",
          service: response.service,
          subject: response.subject,
          unit: response.unit,
          timestamp: response.timestamp
        };
      }
      throw new Error(response.message || "Failed to fetch deployment status");
    }
    // List services from AosCloud
    async listServices() {
      return this.sendCommand("aos_list_services", {});
    }
    // List units from AosCloud
    async listUnits() {
      return this.sendCommand("aos_list_units", {});
    }
    // List subjects from AosCloud
    async listSubjects() {
      return this.sendCommand("aos_list_subjects", {});
    }
    // Get units assigned to a service
    async getServiceUnits(serviceUuid) {
      return this.sendCommand("aos_get_service_units", { serviceUuid });
    }
    // Get service version history
    async getServiceVersions(serviceUuid) {
      return this.sendCommand("aos_get_service_versions", { serviceUuid });
    }
    // Get unit monitoring (CPU/RAM/disk)
    async getUnitMonitoring(unitUid) {
      return this.sendCommand("aos_get_unit_monitoring", { unitUid });
    }
    // Get recent alerts
    async getAlerts() {
      return this.sendCommand("aos_get_alerts", {});
    }
    // Request service logs from a unit
    async requestServiceLog(serviceUuid, unitUid, subjectId, minutes = 60) {
      return this.sendCommand("aos_request_service_log", { serviceUuid, unitUid, subjectId, minutes });
    }
    // Get service log request statuses
    async getServiceLogStatus() {
      return this.sendCommand("aos_get_service_log_status", {});
    }
    // Get build status (by buildId or all)
    async getBuildStatus(buildId) {
      return this.sendCommand("aos_get_build_status", { buildId });
    }
    // Get service stdout from VM via SSH or AosCloud API
    async getServiceStdout(sshPort, lines = 50, filter, serviceUuid, unitUid, subjectId) {
      return this.sendCommand("aos_get_service_stdout", { sshPort, lines, filter, serviceUuid, unitUid, subjectId });
    }
    // Upload a .p12 certificate to the toolchain container
    async uploadCertificate(certBase64, certName = "aos-user-sp") {
      return this.sendCommand("aos_upload_cert", { certData: certBase64, certName });
    }
    // Check certificate status on the toolchain container
    async checkCertificate(certName = "aos-user-sp") {
      return this.sendCommand("aos_check_cert", { certName });
    }
    // Remove the uploaded .p12 (and derived .pem) from the toolchain container
    async removeCertificate(certName = "aos-user-sp") {
      return this.sendCommand("aos_remove_cert", { certName });
    }
    // Get installed toolchain package versions (aos-signer, aos-keys, aos-prov)
    async getToolchainInfo() {
      return this.sendCommand("aos_get_toolchain_info", {});
    }
    // Get unit version info from AosCloud (aos_version, os_version, etc.)
    async getUnitInfo(unitUid) {
      return this.sendCommand("aos_get_unit_info", { unitUid });
    }
    // Run the AosEdge setup automation (unit config, unit set, subject, service assignment)
    // for the given unit's system UID — mirrors aos-automation.py, executed natively on the toolchain.
    async runAosAutomation(systemUid) {
      return this.sendCommand("aos_run_automation", { systemUid });
    }
    // Restart an AOS application
    async restartApp(appId) {
      return this.sendCommand("aos_restart_app", { appId });
    }
    // Uninstall an AOS application
    async uninstallApp(appId) {
      return this.sendCommand("aos_uninstall_app", { appId });
    }
    // Console subscription methods
    async subscribeConsole(appId) {
      await this.sendCommand("aos_console_subscribe", { appId });
    }
    async unsubscribeConsole(appId) {
      await this.sendCommand("aos_console_unsubscribe", { appId });
    }
    async getAppOutput(appId, lines = 100) {
      return this.sendCommand("aos_app_output", { appId, lines });
    }
    // Event listeners
    onConsoleOutput(callback) {
      this.messageHandlers.set("aos_console_output", callback);
    }
    onBuildProgress(callback) {
      this.messageHandlers.set("aos-build-progress", callback);
    }
    onDeployStatus(callback) {
      this.messageHandlers.set("aos-deploy-status", callback);
      this.messageHandlers.set("aos_build_deploy", callback);
    }
    onAppStatus(callback) {
      this.messageHandlers.set("aos_app_status_update", callback);
    }
    // Connection status
    isServiceConnected() {
      return this.isConnected;
    }
    removeAllListeners() {
      this.messageHandlers.clear();
    }
  };

  // src/presets/index.ts
  var PRESETS = {
    // ── C++ Presets ──
    helloAos: {
      name: "Hello AOS",
      appName: "hello-aos",
      description: "Simple hello world application (aos-signer 2.x format)",
      cpp: `#include <iostream>
#include <thread>
#include <chrono>

#define VERSION "1.0.0"

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "AosEdge Hello Service" << std::endl;
    std::cout << "Version: " << VERSION << std::endl;
    std::cout << "Deployed via aos-edge-toolchain!" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    int count = 0;
    while (true) {
        std::this_thread::sleep_for(std::chrono::seconds(10));
        count++;
        std::cout << "[" << count << "] Hello from AosEdge! v" << VERSION << std::endl;
        std::cout.flush();
    }

    return 0;
}`,
      yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "hello-aos"
      title: "Hello AOS Service"
      description: "Simple hello world application"
    version: "1.0.0"
    sourceFolder: "hello-aos"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/hello-aos"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
    },
    kuksaWriter: {
      name: "Signal Writer - Zonal Domain",
      appName: "signal-writer",
      description: "Writes Speed, SoC, AmbientTemp to KUKSA Databroker on Zonal node",
      cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <cmath>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"

static bool set_signal(kuksa::val::v1::VAL::Stub* stub,
                       const std::string& path, float value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_float_(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    return stub->Set(&context, request, &response).ok();
}

int main(int argc, char* argv[]) {
    std::string target = "10.0.0.100:55556";
    int interval = 2;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (auto i = std::getenv("WRITE_INTERVAL"))        interval = std::atoi(i);
    if (argc > 1) target   = argv[1];
    if (argc > 2) interval = std::atoi(argv[2]);

    std::cout << "========================================" << std::endl;
    std::cout << "  KUKSA Signal Writer" << std::endl;
    std::cout << "  Version:    " << VERSION << std::endl;
    std::cout << "  Databroker: " << target << std::endl;
    std::cout << "  Interval:   " << interval << "s" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[Writer] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) std::cerr << "[Writer] Unreachable: " << target << std::endl;
        std::cout << "[Writer] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    int t = 0;
    while (true) {
        float speed = 40.0f + 30.0f * std::sin(t * 0.1f);
        float temp  = 22.0f +  5.0f * std::sin(t * 0.05f);
        float soc   = std::fmax(0.0f, std::fmin(100.0f, 80.0f - t * 0.01f));

        set_signal(stub.get(), "Vehicle.Speed", speed);
        set_signal(stub.get(), "Vehicle.Cabin.HVAC.AmbientAirTemperature", temp);
        set_signal(stub.get(), "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current", soc);

        if (t % 5 == 0) {
            std::cout << "[Writer] t=" << t
                      << " Speed=" << speed
                      << " Temp=" << temp
                      << " SoC=" << soc << std::endl;
            std::cout.flush();
        }
        t++;
        std::this_thread::sleep_for(std::chrono::seconds(interval));
    }
    return 0;
}`,
      yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "signal-writer"
      title: "Signal Writer - Zonal Domain"
      description: "Writes Speed, SoC, AmbientTemp to KUKSA Databroker"
    version: "1.0.0"
    sourceFolder: "signal-writer"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/signal-writer"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55556"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
    },
    kuksaReader: {
      name: "KUKSA Reader",
      appName: "kuksa-reader",
      description: "Subscribes to vehicle signals from KUKSA Databroker via gRPC Subscribe() streaming",
      cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"

static std::string format_value(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return std::to_string(dp.float_());
        case kuksa::val::v1::Datapoint::kDouble: return std::to_string(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return std::to_string(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return std::to_string(dp.uint32());
        case kuksa::val::v1::Datapoint::kBool:   return dp.bool_() ? "true" : "false";
        case kuksa::val::v1::Datapoint::kString: return dp.string();
        default: return "N/A";
    }
}

int main(int argc, char* argv[]) {
    std::string target = "10.0.0.100:55556";
    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (argc > 1) target = argv[1];

    std::cout << "========================================" << std::endl;
    std::cout << "  KUKSA Signal Reader (Subscribe)" << std::endl;
    std::cout << "  Version:    " << VERSION << std::endl;
    std::cout << "  Databroker: " << target << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[Reader] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) { std::cerr << "[Reader] Unreachable: " << target << std::endl; return 1; }
        std::cout << "[Reader] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    kuksa::val::v1::SubscribeRequest sub_req;
    for (const auto& path : {"Vehicle.Speed",
                              "Vehicle.Cabin.HVAC.AmbientAirTemperature",
                              "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"}) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }

    std::cout << "[Reader] Subscribing to 3 signals..." << std::endl;
    std::cout.flush();

    int msg_count = 0;
    while (true) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;
        while (reader->Read(&response)) {
            msg_count++;
            std::cout << "[Reader] #" << msg_count << ":";
            for (const auto& update : response.updates())
                std::cout << " " << update.entry().path()
                          << "=" << format_value(update.entry().value());
            std::cout << std::endl;
            std::cout.flush();
        }
        auto status = reader->Finish();
        std::cerr << "[Reader] Stream ended: " << status.error_message() << std::endl;
        std::cout << "[Reader] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
    return 0;
}`,
      yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "kuksa-reader"
      title: "KUKSA Reader"
      description: "Subscribes to vehicle signals from KUKSA Databroker"
    version: "1.0.0"
    sourceFolder: "kuksa-reader"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/kuksa-reader"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
    },
    evRangeExtender: {
      name: "EV Range Extender - HPC Domain",
      appName: "ev-range-extender",
      description: "Battery management, range computation, power-saving mode control for HPC node",
      cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <cmath>
#include <atomic>
#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"
#define VERSION "1.0.7"
#define SOC_THRESHOLD 30.0f
#define SOC_THRESHOLD_1 50.0f
#define NORMAL_EFFICIENCY 5.5f
#define DEGRADED_EFFICIENCY 4.0f

static float get_signal(kuksa::val::v1::VAL::Stub* stub,
                        const std::string& path) {
    kuksa::val::v1::GetRequest request;
    auto* entry = request.add_entries();
    entry->set_path(path);
    entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
    entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::GetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
    auto status = stub->Get(&context, request, &response);
    if (!status.ok() || response.entries_size() == 0) return -1.0f;
    const auto& dp = response.entries(0).value();
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_();
        case kuksa::val::v1::Datapoint::kDouble: return static_cast<float>(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return static_cast<float>(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<float>(dp.uint32());
        default: return -1.0f;
    }
}

static bool set_signal(kuksa::val::v1::VAL::Stub* stub,
                       const std::string& path, float value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_float_(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static bool set_acct_signal(kuksa::val::v1::VAL::Stub* stub,
                       const std::string& path, int value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_int32(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

int main(int argc, char* argv[]) {
    std::string target = "10.0.0.100:55555";
    int interval = 2;
    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (auto i = std::getenv("CHECK_INTERVAL"))        interval = std::atoi(i);
    if (argc > 1) target   = argv[1];
    if (argc > 2) interval = std::atoi(argv[2]);
    const float soc_threshold = std::getenv("SOC_THRESHOLD")
        ? std::atof(std::getenv("SOC_THRESHOLD"))
        : SOC_THRESHOLD;
    const float soc_threshold_1 = std::getenv("SOC_THRESHOLD_1")
        ? std::atof(std::getenv("SOC_THRESHOLD_1"))
        : SOC_THRESHOLD_1;
    std::cout << "========================================" << std::endl;
    std::cout << "  EV Range Extender" << std::endl;
    std::cout << "  Version:       " << VERSION << std::endl;
    std::cout << "  Databroker:    " << target << std::endl;
    std::cout << "  Interval:      " << interval << "s" << std::endl;
    std::cout << "  SoC threshold: " << soc_threshold << "%" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();
    auto channel = grpc::CreateChannel(target,
                                       grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);
    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[RangeExt] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) {
            std::cerr << "[RangeExt] Unreachable: " << target << std::endl;
            return 1;
        }
        std::cout << "[RangeExt] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }
    std::string prev_mode = "";
    int cycle = 0;
    while (true) {
        cycle++;
        float soc  = get_signal(stub.get(),
            "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current");
        float temp = get_signal(stub.get(),
            "Vehicle.Cabin.HVAC.AmbientAirTemperature");
        if (soc < 0) soc = 50.0f;
        std::string mode;
        float range;
        float light_intensity;
        float seat_heating;
        float cabin_temp;
        int seat_cool;
        int seat_heat;
        if (soc < soc_threshold) {
            mode = "POWER_SAVE";
            range = soc * DEGRADED_EFFICIENCY;
            light_intensity = 30.0f;
            seat_heating = 0.0f;
        } else {
            mode = "NORMAL";
            range = soc * NORMAL_EFFICIENCY;
            light_intensity = 100.0f;
            seat_heating = 1.0f;
            cabin_temp=30.0f;
        }
        if (soc < soc_threshold_1 ) {
            cabin_temp=0.0f;
        }
        if (soc < soc_threshold){
            set_acct_signal(stub.get(), "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling", seat_cool);
            set_acct_signal(stub.get(), "Vehicle.Cabin.Seat.Row1.DriverSide.Heating", seat_heat);
        }
        set_signal(stub.get(), "Vehicle.Powertrain.Range", range);
        set_signal(stub.get(),
            "Vehicle.Cabin.Lights.AmbientLight.Intensity", light_intensity);
        set_signal(stub.get(), "Vehicle.Cabin.Seat.Heating", seat_heating);
        set_signal(stub.get(), "Vehicle.Cabin.HVAC.AmbientAirTemperature", cabin_temp);
        if (mode != prev_mode) {
            std::cout << "[RangeExt] *** MODE CHANGE: " << mode << " ***"
                      << std::endl;
            prev_mode = mode;
        }
        if (cycle % 5 == 1) {
            std::cout << "[RangeExt] cycle=" << cycle
                      << " mode=" << mode
                      << " SoC=" << soc << "%"
                      << " Temp=" << (temp >= 0 ? std::to_string((int)temp) : "N/A") << "C"
                      << " Range=" << range << "km"
                      << " Lights=" << light_intensity
                      << " SeatHeat=" << seat_heating
                      << " CabinTemperature=" << cabin_temp
                      << " seat_cool=" << seat_cool
                      << " seat_heat=" << seat_heat
                      << std::endl;
            std::cout.flush();
        }
        std::this_thread::sleep_for(std::chrono::seconds(interval));
    }
    return 0;
}`,
      yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "ev-range-extender"
      title: "EV Range Extender - HPC Domain"
      description: "Battery management, range computation, power-saving mode control"
    version: "3.0.1"
    sourceFolder: "ev-range-extender"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/ev-range-extender"
      env:
        - "KUKSA_DATABROKER_ADDR=10.0.0.100:55555"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
    },
    batteryEnergySaver: {
      name: "Battery Energy Saver - HPC Domain",
      appName: "battery-energy-saver",
      description: "Forces HVAC and seat heating/cooling off when SoC drops below configurable thresholds; blocks re-activation while battery is low",
      cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <csignal>
#include <atomic>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"
#define DEFAULT_HVAC_OFF_THRESHOLD 50.0f
#define DEFAULT_SEAT_OFF_THRESHOLD 30.0f

static const char* RANGE_PATH     = "Vehicle.Powertrain.Range";
static const char* SOC_PATH       = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current";
static const char* HVAC_PATH      = "Vehicle.Cabin.HVAC.AmbientAirTemperature";
static const char* SEAT_HEAT_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating";

static std::atomic<bool> g_running{true};

static float as_float(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_();
        case kuksa::val::v1::Datapoint::kDouble: return static_cast<float>(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return static_cast<float>(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<float>(dp.uint32());
        default: return 0.0f;
    }
}

static int as_int(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kInt32:  return dp.int32();
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<int>(dp.uint32());
        case kuksa::val::v1::Datapoint::kFloat:  return static_cast<int>(dp.float_());
        case kuksa::val::v1::Datapoint::kBool:   return dp.bool_() ? 1 : 0;
        default: return 0;
    }
}

static bool set_float(kuksa::val::v1::VAL::Stub* stub,
                      const std::string& path, float value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_float_(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static bool set_int(kuksa::val::v1::VAL::Stub* stub,
                    const std::string& path, int value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_int32(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static void run(kuksa::val::v1::VAL::Stub* stub,
                float hvac_threshold, float seat_threshold) {
    float soc = 100.0f, vehicle_range = 0.0f;
    bool  hvac_cut = false, seat_cut = false;

    kuksa::val::v1::SubscribeRequest sub_req;
    for (const char* path : { RANGE_PATH, SOC_PATH, HVAC_PATH, SEAT_HEAT_PATH }) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }

    while (g_running) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;

        while (g_running && reader->Read(&response)) {
            for (const auto& update : response.updates()) {
                const std::string& path = update.entry().path();
                const auto& dp = update.entry().value();

                if (path == RANGE_PATH) {
                    vehicle_range = as_float(dp);
                } else if (path == SOC_PATH) {
                    soc = as_float(dp);
                    std::cout << "Charge: " << soc << "% | Range: " << vehicle_range << std::endl;

                    if (soc < hvac_threshold && !hvac_cut) {
                        std::cout << "[!] SoC=" << soc << "% < " << hvac_threshold << "%  ->  Turning HVAC off" << std::endl;
                        set_float(stub, HVAC_PATH, 0.0f);
                        hvac_cut = true;
                    } else if (soc >= hvac_threshold && hvac_cut) {
                        std::cout << "[+] SoC=" << soc << "%  ->  HVAC restriction lifted" << std::endl;
                        hvac_cut = false;
                    }
                    if (soc < seat_threshold && !seat_cut) {
                        std::cout << "[!] SoC=" << soc << "% < " << seat_threshold << "%  ->  Turning Seat Heating off" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                        seat_cut = true;
                    } else if (soc >= seat_threshold && seat_cut) {
                        std::cout << "[+] SoC=" << soc << "%  ->  Seat restriction lifted" << std::endl;
                        seat_cut = false;
                    }
                } else if (path == HVAC_PATH && hvac_cut) {
                    if (as_float(dp) != 0.0f) {
                        std::cout << "[!] Battery low  ->  blocking HVAC re-activation" << std::endl;
                        set_float(stub, HVAC_PATH, 0.0f);
                    }
                } else if (path == SEAT_HEAT_PATH && seat_cut) {
                    if (as_int(dp) != 0) {
                        std::cout << "[!] Battery low  ->  blocking Seat Heating re-activation" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                    }
                }
            }
        }

        if (!g_running) break;
        auto status = reader->Finish();
        std::cerr << "[EnergySaver] Stream ended: " << status.error_message() << std::endl;
        std::cout << "[EnergySaver] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
}

int main(int argc, char* argv[]) {
    std::string target   = "172.17.0.1:55555";
    float hvac_threshold = DEFAULT_HVAC_OFF_THRESHOLD;
    float seat_threshold = DEFAULT_SEAT_OFF_THRESHOLD;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target         = t;
    if (auto h = std::getenv("HVAC_OFF_THRESHOLD"))    hvac_threshold = std::atof(h);
    if (auto s = std::getenv("SEAT_OFF_THRESHOLD"))    seat_threshold = std::atof(s);
    if (argc > 1) target         = argv[1];
    if (argc > 2) hvac_threshold = std::atof(argv[2]);
    if (argc > 3) seat_threshold = std::atof(argv[3]);

    std::signal(SIGINT,  [](int) { g_running = false; });
    std::signal(SIGTERM, [](int) { g_running = false; });

    std::cout << "======================================================" << std::endl;
    std::cout << "  Battery Energy Saver" << std::endl;
    std::cout << "  Version:         " << VERSION << std::endl;
    std::cout << "  Databroker:      " << target << std::endl;
    std::cout << "  HVAC off below:  " << hvac_threshold << "%" << std::endl;
    std::cout << "  Seat off below:  " << seat_threshold << "%" << std::endl;
    std::cout << "  TLS:             Disabled (insecure)" << std::endl;
    std::cout << "======================================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[EnergySaver] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) { std::cerr << "[EnergySaver] Unreachable: " << target << std::endl; return 1; }
        std::cout << "[EnergySaver] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::cout << "[EnergySaver] Subscribing to signals..." << std::endl;
    std::cout.flush();

    run(stub.get(), hvac_threshold, seat_threshold);

    std::cout << "Battery Energy Saver: shutdown, no signal reset needed." << std::endl;
    return 0;
}`,
      yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "battery-energy-saver"
      title: "Battery Energy Saver - HPC Domain"
      description: "Forces HVAC and seat heating/cooling off when SoC drops below thresholds"
    version: "1.0.0"
    sourceFolder: "battery-energy-saver"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/battery-energy-saver"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "HVAC_OFF_THRESHOLD=50.0"
        - "SEAT_OFF_THRESHOLD=30.0"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
    },
    signalReporter: {
      name: "Signal Reporter - Dashboard Relay",
      appName: "signal-reporter",
      description: "Subscribes to all 9 vehicle signals and relays to dashboard via HTTP on HPC node",
      cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <sstream>
#include <cstring>
#include <sys/socket.h>
#include <netdb.h>
#include <unistd.h>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.17"

static std::string format_value(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:
            return std::to_string(dp.float_());
        case kuksa::val::v1::Datapoint::kDouble:
            return std::to_string(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:
            return std::to_string(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32:
            return std::to_string(dp.uint32());
        case kuksa::val::v1::Datapoint::kBool:
            return dp.bool_() ? "true" : "false";
        case kuksa::val::v1::Datapoint::kString:
            return dp.string();
        default:
            return "null";
    }
}

static bool http_post(const std::string& host, int port,
                      const std::string& path, const std::string& body) {
    struct addrinfo hints{}, *res;
    hints.ai_family   = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;

    if (getaddrinfo(host.c_str(), std::to_string(port).c_str(),
                    &hints, &res) != 0)
        return false;

    int fd = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
    if (fd < 0) { freeaddrinfo(res); return false; }

    struct timeval tv{2, 0};
    setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    if (connect(fd, res->ai_addr, res->ai_addrlen) < 0) {
        close(fd); freeaddrinfo(res); return false;
    }
    freeaddrinfo(res);

    std::ostringstream req;
    req << "POST " << path << " HTTP/1.1\\r\\n"
        << "Host: " << host << ":" << port << "\\r\\n"
        << "Content-Type: application/json\\r\\n"
        << "Content-Length: " << body.size() << "\\r\\n"
        << "Connection: close\\r\\n\\r\\n"
        << body;

    std::string s = req.str();
    send(fd, s.c_str(), s.size(), 0);

    char buf[256];
    recv(fd, buf, sizeof(buf) - 1, 0);
    close(fd);
    return true;
}

static void parse_host_port(const std::string& url,
                            std::string& host, int& port) {
    auto colon = url.rfind(':');
    if (colon != std::string::npos) {
        host = url.substr(0, colon);
        port = std::atoi(url.substr(colon + 1).c_str());
    } else {
        host = url;
        port = 9100;
    }
}

int main(int argc, char* argv[]) {
    std::string kuksa_target = "10.0.0.100:55555";
    std::string relay_url    = "10.0.0.1:9100";

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) kuksa_target = t;
    if (auto r = std::getenv("SIGNAL_RELAY_URL"))      relay_url    = r;
    if (argc > 1) kuksa_target = argv[1];
    if (argc > 2) relay_url    = argv[2];

    std::string relay_host;
    int relay_port;
    parse_host_port(relay_url, relay_host, relay_port);

    std::cout << "========================================" << std::endl;
    std::cout << "  Signal Reporter" << std::endl;
    std::cout << "  Version:    " << VERSION << std::endl;
    std::cout << "  Databroker: " << kuksa_target << std::endl;
    std::cout << "  Relay:      " << relay_host << ":" << relay_port << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(kuksa_target,
                                       grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
        if (stub->GetServerInfo(&ctx, req, &resp).ok()) {
            std::cout << "[Reporter] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) {
            std::cerr << "[Reporter] Unreachable: " << kuksa_target << std::endl;
            return 1;
        }
        std::cout << "[Reporter] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    const char* paths[] = {
        "Vehicle.Speed",
        "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
        "Vehicle.Powertrain.Range",
        "Vehicle.Cabin.HVAC.AmbientAirTemperature",
        "Vehicle.Cabin.HVAC.TargetTemperature",
        "Vehicle.Cabin.Lights.AmbientLight.Intensity",
        "Vehicle.Cabin.Seat.Heating",
        "Vehicle.Cabin.Seat.VentilationLevel",
        "Vehicle.Infotainment.Display.Brightness"
    };

    kuksa::val::v1::SubscribeRequest sub_req;
    for (const auto& p : paths) {
        auto* entry = sub_req.add_entries();
        entry->set_path(p);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }

    std::cout << "[Reporter] Subscribing to " << sub_req.entries_size()
              << " signals..." << std::endl;
    std::cout.flush();

    int msg_count = 0;
    int post_ok   = 0;
    int post_fail = 0;

    while (true) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;

        while (reader->Read(&response)) {
            msg_count++;

            for (const auto& update : response.updates()) {
                const auto& path = update.entry().path();
                std::string val  = format_value(update.entry().value());

                auto now = std::chrono::system_clock::now();
                auto ms  = std::chrono::duration_cast<std::chrono::milliseconds>(
                    now.time_since_epoch()).count();

                std::ostringstream json;
                json << "{\\"signal\\":\\"" << path
                     << "\\",\\"value\\":" << val
                     << ",\\"ts\\":" << ms << "}";

                if (http_post(relay_host, relay_port,
                              "/signal", json.str())) {
                    post_ok++;
                } else {
                    post_fail++;
                }
            }

            if (msg_count % 50 == 0) {
                std::cout << "[Reporter] msgs=" << msg_count
                          << " posted=" << post_ok
                          << " failed=" << post_fail << std::endl;
                std::cout.flush();
            }
        }

        auto status = reader->Finish();
        std::cerr << "[Reporter] Stream ended: "
                  << status.error_message() << std::endl;
        std::cout << "[Reporter] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
    return 0;
}`,
      yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      id: 242dd4d4-7236-432d-88b9-ba9bbb3288f8
      title: "Signal Reporter - Dashboard Relay"
      description: "Subscribes to all 9 vehicle signals and relays to dashboard via HTTP"
    version: "1.0.17"
    sourceFolder: "signal-reporter"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/signal-reporter"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "SIGNAL_RELAY_URL=172.17.0.1:9100"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
    },
    batteryEnergySaverSdvRuntime: {
      name: "Battery Energy Saver - sdv-runtime / VSS 4.0",
      appName: "battery-energy-saver-sdv",
      description: "Same HVAC/seat cutoff logic as the HPC variant but corrected for sdv-runtime: HVAC path is IsAirConditioningActive (bool actuator) and all actuator writes target actuator_target instead of value",
      cpp: `/*
 * Battery Energy Saver \u2014 sdv-runtime / VSS 4.0
 * ===============================================
 *
 * WHAT THIS SERVICE DOES
 * ----------------------
 * Subscribes to the vehicle's State-of-Charge (SoC) via KUKSA Databroker.
 * When SoC drops below configurable thresholds it commands actuators off:
 *   - SoC < HVAC_OFF_THRESHOLD (default 50%) -> set IsAirConditioningActive = false
 *   - SoC < SEAT_OFF_THRESHOLD (default 30%) -> set Seat.Row1.DriverSide.Heating = 0
 * While the battery is low it also blocks any attempt to re-enable those actuators.
 *
 * ARCHITECTURE
 * ------------
 *
 *   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
 *   \u2502  Host machine                       \u2502
 *   \u2502                                     \u2502
 *   \u2502  docker run -p 55555:55555          \u2502
 *   \u2502    ghcr.io/eclipse-autowrx/         \u2502
 *   \u2502    sdv-runtime:latest               \u2502
 *   \u2502         \u2502                           \u2502
 *   \u2502         \u2502  KUKSA Databroker :55555  \u2502
 *   \u2502         \u2502  (gRPC, VSS 4.0)          \u2502
 *   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
 *             \u2502
 *   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
 *   \u2502  AOS HPC VM                         \u2502
 *   \u2502         \u2502                           \u2502
 *   \u2502  battery-energy-saver-sdv           \u2502
 *   \u2502  (this service, deployed via        \u2502
 *   \u2502   AosCloud onto the HPC node)       \u2502
 *   \u2502                                     \u2502
 *   \u2502  env: KUKSA_DATABROKER_ADDR=        \u2502
 *   \u2502       <host-ip>:55555               \u2502
 *   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
 *
 * SETUP
 * -----
 * 1. Start sdv-runtime on the host:
 *      docker run -d -p 55555:55555 ghcr.io/eclipse-autowrx/sdv-runtime:latest
 *
 * 2. Find the host IP reachable from the AOS VM.
 *    From inside the VM the Docker bridge gateway is typically 172.17.0.1,
 *    but if the VM is on a separate NAT network use the host's LAN IP instead
 *    (e.g. 10.x.x.x).  Confirm reachability:
 *      nc -zv <host-ip> 55555
 *
 * 3. In the YAML config below, set KUKSA_DATABROKER_ADDR to that IP:
 *      env:
 *        - "KUKSA_DATABROKER_ADDR=<host-ip>:55555"
 *
 * 4. Build and deploy via AosCloud (Build -> Deploy in this UI).
 *
 * VERIFYING THE COMMUNICATION (Python client on the host)
 * -------------------------------------------------------
 * Install:  pip install kuksa-client
 *
 *   from kuksa_client.grpc import VSSClient, Datapoint
 *   import time
 *
 *   SOC  = 'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current'
 *   RANGE= 'Vehicle.Powertrain.Range'
 *   HVAC = 'Vehicle.Cabin.HVAC.IsAirConditioningActive'
 *   SEAT = 'Vehicle.Cabin.Seat.Row1.DriverSide.Heating'
 *
 *   with VSSClient('<host-ip>', 55555) as c:
 *       # 1. Normal charge \u2014 no cutoff
 *       c.set_current_values({SOC: Datapoint(80.0), RANGE: Datapoint(250)})
 *       time.sleep(1)
 *
 *       # 2. Drop SoC below HVAC threshold \u2014 service sets HVAC target = False
 *       c.set_current_values({SOC: Datapoint(40.0)})
 *       time.sleep(1)
 *
 *       # 3. Try to re-enable HVAC while battery is still low
 *       c.set_target_values({HVAC: Datapoint(True)})
 *       time.sleep(1)
 *       # Service detects it and forces HVAC target back to False
 *
 *       # 4. Read back what the service wrote
 *       tgt = c.get_target_values([HVAC, SEAT])
 *       print(tgt[HVAC].value)   # False  (service enforced it)
 *
 *       # 5. Drop below seat threshold too
 *       c.set_current_values({SOC: Datapoint(25.0)})
 *       time.sleep(1)
 *       tgt = c.get_target_values([HVAC, SEAT])
 *       print(tgt[SEAT].value)   # 0  (seat heating cut)
 *
 * SERVICE LOGS ON THE AOS VM
 * --------------------------
 * Find the service PID:
 *   cat /run/aos/runtime/<instance-id>/.pid
 * Stream its output:
 *   journalctl _PID=<pid> -f
 *
 * You should see:
 *   Charge: 80% | Range: 250
 *   Charge: 40% | Range: 250
 *   [!] SoC=40% < 50%  ->  Turning HVAC off
 *   [!] Battery low    ->  blocking HVAC re-activation   <- after step 3
 *   [!] SoC=25% < 30%  ->  Turning Seat Heating off
 *   [+] SoC=55%        ->  HVAC restriction lifted
 */

#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <csignal>
#include <atomic>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"
#define DEFAULT_HVAC_OFF_THRESHOLD 50.0f
#define DEFAULT_SEAT_OFF_THRESHOLD 30.0f

static const char* RANGE_PATH     = "Vehicle.Powertrain.Range";
static const char* SOC_PATH       = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current";
static const char* HVAC_PATH      = "Vehicle.Cabin.HVAC.IsAirConditioningActive";
static const char* SEAT_HEAT_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating";

static std::atomic<bool> g_running{true};

static float as_float(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_();
        case kuksa::val::v1::Datapoint::kDouble: return static_cast<float>(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return static_cast<float>(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<float>(dp.uint32());
        default: return 0.0f;
    }
}

static bool as_bool(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kBool:   return dp.bool_();
        case kuksa::val::v1::Datapoint::kInt32:  return dp.int32() != 0;
        case kuksa::val::v1::Datapoint::kUint32: return dp.uint32() != 0;
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_() != 0.0f;
        default: return false;
    }
}

static int as_int(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kInt32:  return dp.int32();
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<int>(dp.uint32());
        case kuksa::val::v1::Datapoint::kFloat:  return static_cast<int>(dp.float_());
        case kuksa::val::v1::Datapoint::kBool:   return dp.bool_() ? 1 : 0;
        default: return 0;
    }
}

// sdv-runtime requires actuator writes to go to actuator_target, not value
static bool set_bool(kuksa::val::v1::VAL::Stub* stub,
                     const std::string& path, bool value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_actuator_target()->set_bool_(value);
    update->add_fields(kuksa::val::v1::FIELD_ACTUATOR_TARGET);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static bool set_int(kuksa::val::v1::VAL::Stub* stub,
                    const std::string& path, int value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_actuator_target()->set_int32(value);
    update->add_fields(kuksa::val::v1::FIELD_ACTUATOR_TARGET);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static void run(kuksa::val::v1::VAL::Stub* stub,
                float hvac_threshold, float seat_threshold) {
    float soc = 100.0f, vehicle_range = 0.0f;
    bool  hvac_cut = false, seat_cut = false;

    kuksa::val::v1::SubscribeRequest sub_req;
    // Sensors: read current value
    for (const char* path : { RANGE_PATH, SOC_PATH }) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }
    // Actuators: watch actuator_target to block re-activation while battery is low
    for (const char* path : { HVAC_PATH, SEAT_HEAT_PATH }) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_TARGET_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_ACTUATOR_TARGET);
    }

    while (g_running) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;

        while (g_running && reader->Read(&response)) {
            for (const auto& update : response.updates()) {
                const std::string& path = update.entry().path();

                if (path == RANGE_PATH) {
                    vehicle_range = as_float(update.entry().value());
                } else if (path == SOC_PATH) {
                    soc = as_float(update.entry().value());
                    std::cout << "Charge: " << soc << "% | Range: " << vehicle_range << std::endl;

                    if (soc < hvac_threshold && !hvac_cut) {
                        std::cout << "[!] SoC=" << soc << "% < " << hvac_threshold << "%  ->  Turning HVAC off" << std::endl;
                        set_bool(stub, HVAC_PATH, false);
                        hvac_cut = true;
                    } else if (soc >= hvac_threshold && hvac_cut) {
                        std::cout << "[+] SoC=" << soc << "%  ->  HVAC restriction lifted" << std::endl;
                        hvac_cut = false;
                    }
                    if (soc < seat_threshold && !seat_cut) {
                        std::cout << "[!] SoC=" << soc << "% < " << seat_threshold << "%  ->  Turning Seat Heating off" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                        seat_cut = true;
                    } else if (soc >= seat_threshold && seat_cut) {
                        std::cout << "[+] SoC=" << soc << "%  ->  Seat restriction lifted" << std::endl;
                        seat_cut = false;
                    }
                } else if (path == HVAC_PATH && hvac_cut) {
                    if (as_bool(update.entry().actuator_target())) {
                        std::cout << "[!] Battery low  ->  blocking HVAC re-activation" << std::endl;
                        set_bool(stub, HVAC_PATH, false);
                    }
                } else if (path == SEAT_HEAT_PATH && seat_cut) {
                    if (as_int(update.entry().actuator_target()) != 0) {
                        std::cout << "[!] Battery low  ->  blocking Seat Heating re-activation" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                    }
                }
            }
        }

        if (!g_running) break;
        auto status = reader->Finish();
        std::cerr << "[EnergySaver] Stream ended: " << status.error_message() << std::endl;
        std::cout << "[EnergySaver] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
}

int main(int argc, char* argv[]) {
    std::string target   = "172.17.0.1:55555";
    float hvac_threshold = DEFAULT_HVAC_OFF_THRESHOLD;
    float seat_threshold = DEFAULT_SEAT_OFF_THRESHOLD;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target         = t;
    if (auto h = std::getenv("HVAC_OFF_THRESHOLD"))    hvac_threshold = std::atof(h);
    if (auto s = std::getenv("SEAT_OFF_THRESHOLD"))    seat_threshold = std::atof(s);
    if (argc > 1) target         = argv[1];
    if (argc > 2) hvac_threshold = std::atof(argv[2]);
    if (argc > 3) seat_threshold = std::atof(argv[3]);

    std::signal(SIGINT,  [](int) { g_running = false; });
    std::signal(SIGTERM, [](int) { g_running = false; });

    std::cout << "======================================================" << std::endl;
    std::cout << "  Battery Energy Saver (sdv-runtime / VSS 4.0)" << std::endl;
    std::cout << "  Version:         " << VERSION << std::endl;
    std::cout << "  Databroker:      " << target << std::endl;
    std::cout << "  HVAC off below:  " << hvac_threshold << "%" << std::endl;
    std::cout << "  Seat off below:  " << seat_threshold << "%" << std::endl;
    std::cout << "  HVAC signal:     IsAirConditioningActive (bool actuator)" << std::endl;
    std::cout << "  TLS:             Disabled (insecure)" << std::endl;
    std::cout << "======================================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[EnergySaver] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) { std::cerr << "[EnergySaver] Unreachable: " << target << std::endl; return 1; }
        std::cout << "[EnergySaver] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::cout << "[EnergySaver] Subscribing to signals..." << std::endl;
    std::cout.flush();

    run(stub.get(), hvac_threshold, seat_threshold);

    std::cout << "Battery Energy Saver: shutdown, no signal reset needed." << std::endl;
    return 0;
}`,
      yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "battery-energy-saver-sdv"
      title: "Battery Energy Saver - sdv-runtime / VSS 4.0"
      description: "HVAC/seat cutoff logic corrected for sdv-runtime with actuator_target writes"
    version: "1.0.0"
    sourceFolder: "battery-energy-saver-sdv"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/battery-energy-saver-sdv"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "HVAC_OFF_THRESHOLD=50.0"
        - "SEAT_OFF_THRESHOLD=30.0"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
    },
    // ── Python Presets ──
    helloPython: {
      name: "Hello Python",
      appName: "hello-world-python",
      description: "Simple demo service in Python",
      language: "python",
      python: `#!/usr/bin/env python3
# Copyright (c) 2018-2025 EPAM Systems
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import time
import json
import datetime
import logging

from urllib import request

logger = logging.getLogger(__name__)

# Go to https://webhook.site/#/
#   and copy from "Your unique URL (Please copy it from here, not from the address bar!)" field
#   and paste server link to HTTP_REQUEST_RECEIVER_URL

HTTP_REQUEST_RECEIVER_URL = "https://webhook.site/21a820fd-df75-4286-b9e4-67ca4ee2af70"

DATA_SENDING_DELAY = 2
WAIT_TIMEOUT = 5
DELAY_AFTER_ERROR = 2


def main():
    # Initialize data accessor to "VIN" attribute and get this attribute.
    greetings = 'Hello world!'

    # Send information to HTTP server.
    while True:
        try:
            logger.info("Sending telemetry to '{url}'".format(url=HTTP_REQUEST_RECEIVER_URL))
            json_data={"Unit said": greetings, "datetime": datetime.datetime.now().isoformat()}

            params = json.dumps(json_data).encode('utf8')
            request_data = request.Request(
                HTTP_REQUEST_RECEIVER_URL,
                data=params,
                headers={'content-type': 'application/json'}
            )
            request.urlopen(request_data)
            time.sleep(DATA_SENDING_DELAY)

        except KeyboardInterrupt:
            logger.info("Received Keyboard interrupt. shutting down")
            break
        except Exception as exc:
            logger.error(
                "Unhandled exception: {exc_name}".format(exc_name=exc.__class__.__name__),
                exc_info=True,
            )
            time.sleep(DELAY_AFTER_ERROR)
            continue


if __name__ == '__main__':
    main()
`,
      yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Documentation: https://docs.aosedge.tech/docs/reference/file-formats/service-config

# Schema version (required, must be 2)
schemaVersion: 2

# Publisher information (optional)
publisher:
  author: "Developer Name"
  company: "Company Name"

# Publishing information (required: tlsKey; optional: domain, signKey)
publish:
  tlsKey: "aos-user-sp.p12"
  # signKey: "/path/to/sign-key.pem"  # Optional: separate signing key
  # domain: "aoscloud.io"             # Optional: if not specified, will be extracted from tlsKey certificate

# List of deployable items (like services) to include in the deployment bundle
items:
  # First service item
  - identity:
      type: "service"
      codename: "hello-world-python"
      title: "Hello World Service (Python)"
      description: "Simple demo service in Python"
    version: "1.0.2"
    sourceFolder: "hello-world-python"

    # Images for different architectures
    images:
      # x86 architecture image under service source folder
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    # Service configuration
    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000           # DMIPS
        ramLimit: 512MiB         # 256 MiB
        storageLimit: 32MiB       # 32 MiB
        stateLimit: 1MiB         # 100 MiB
        tmpLimit: 256MiB         # 256 MiB`
    },
    seatEcu: {
      name: "Seat ECU (EV Range Extender)",
      appName: "demo-ev-range-extender-seat-ecu",
      description: "Seat Control Module \u2014 consumes dashboard seat heating/cooling commands over Zenoh, writes to Kuksa Databroker",
      language: "python",
      python: `"""Seat ECU (SCM) service.

Consumes the host dashboard's seat heating/cooling commands over Zenoh,
writes corresponding values directly into the shared Kuksa Databroker on
the primary node, and sends status updates back to the dashboard's
indicator panel.

Connectivity: runs as a Zenoh *client* that dials the router on the
primary node (no inbound listener), and a Kuksa gRPC client pointed at
the single broker. The service is stateless and may migrate between
nodes; both endpoints are fixed on the primary node, so its current
node does not matter.

Signal flow (inbound \u2014 dashboard control)
-----------------------------------------
  pytk_dashboard.py
    \u251C\u2500 sim/cabin/seat/heating \u2500\u2510
    \u2514\u2500 sim/cabin/seat/hc       \u2534\u2500Zenoh\u2500\u25BA router \u2500\u25BA seat_ecu.py
                                                       \u2502
                                           write VSS over gRPC \u25BC
                      Kuksa: Vehicle.Cabin.Seat.Row1.DriverSide.Heating
                             Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling

Dashboard update
----------------
    Kuksa change (this ECU's write, or any other writer)
        \u2514\u2500\u25BA _dashboard_forwarder (Kuksa subscription)
                \u2514\u2500\u25BA Zenoh dash/status/seat \u2500\u25BA router \u2500\u25BA dashboard indicator

Note: heating is 0\u2013100 %; hc is \u2013100 (cooling) to +100 (heating).
"""

import argparse
import asyncio
import json
import sys
import threading
from datetime import datetime, timezone
from typing import Any

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient

DEFAULT_ROUTER = "tcp/zenoh:7447"  # zenoh router (resolves to primary node)
DEFAULT_KUKSA_HOST = "kuksa"
DEFAULT_KUKSA_PORT = 55555
SEAT_HEAT_VSS_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"
SEAT_HC_VSS_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling"

SOURCE_LABEL = "vm2"  # embedded in every outgoing envelope
DASH_STATUS_KEY = "dash/status/seat"  # reverse channel to dashboard


KEY_TO_VSS = {
    "sim/cabin/seat/heating": (
        SEAT_HEAT_VSS_PATH,
        int,
    ),
    "sim/cabin/seat/hc": (
        SEAT_HC_VSS_PATH,
        int,
    ),
}

KEY_PREFIX = "sim/cabin/seat/**"


# VSS path -> dashboard indicator key used by IndicatorPanel.
VSS_TO_DASH_KEY = {
   # SEAT_HEAT_VSS_PATH: "seat.heating",   # SEAT_HEAT_VSS_PATH is broken (absent in VSS spec)
    SEAT_HC_VSS_PATH: "seat.heating_cooling",
}


def _seat_status(vss_path: str, value: Any) -> str:
    """Map a (path, value) pair to the dashboard indicator state.

    Indicator semantics (see module docstring):
       Heating          > 0  -> "heating"  (dashboard renders red)
       HeatingCooling   > 0  -> "heating"  (dashboard renders red)
       HeatingCooling   < 0  -> "cooling"  (dashboard renders blue)
       all other (=== 0)     -> "off"      (dashboard renders blue/idle)
    """
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "off"
    if v > 0:
        return "heating"
    if vss_path.endswith("HeatingCooling") and v < 0:
        return "cooling"
    return "off"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [seat] {msg}", flush=True)


def build_zenoh_config(router_endpoint: str) -> zenoh.Config:
    # Client mode: dial the router on the primary node and open NO
    # inbound listener. Pub/sub still flows both ways over the outbound
    # link, so no inbound port is exposed and the ECU stays reachable
    # no matter which node it migrates to.
    #
    # Scouting is disabled so the client connects ONLY to the configured
    # router and never auto-discovers or meshes with other peers/routers
    # (deterministic connectivity; no rogue-router vector). Verify these
    # key names against the Zenoh version in the runtime image.
    config = zenoh.Config()
    config.insert_json5("mode", '"client"')
    config.insert_json5("connect/endpoints", f'["{router_endpoint}"]')
    config.insert_json5("scouting/multicast/enabled", "false")
    config.insert_json5("scouting/gossip/enabled", "false")
    return config


class _LatestValueQueue:
    """Coalescing latest-value queue for a small number of VSS paths.

    Producers (the Zenoh worker thread) call \`offer(path, value, cast,
    src)\` on every incoming sample. When multiple samples for the same
    path arrive before the consumer drains, only the LAST one survives.
    The single consumer (one asyncio task) calls \`take()\` and gets a
    snapshot of all pending paths, then clears the slot.

    For seat the queue is especially useful because Heating and
    HeatingCooling toggles can flip near-simultaneously (the host
    dashboard's mutex publishes them in quick succession). Both end
    up in the same snapshot and are written to Kuksa in a single
    batched RPC.
    """

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        self._lock = threading.Lock()
        self._pending: dict[str, tuple[Any, Any, str]] = {}
        self._evt = asyncio.Event()

    def offer(self, path: str, value: Any, cast: Any, src: str) -> None:
        """Producer side. Safe to call from any thread; never blocks."""
        with self._lock:
            self._pending[path] = (value, cast, src)
        self._loop.call_soon_threadsafe(self._evt.set)

    async def take(self) -> dict[str, tuple[Any, Any, str]]:
        """Consumer side. Awaits at least one offered value, returns snapshot."""
        while True:
            await self._evt.wait()
            with self._lock:
                if self._pending:
                    snapshot = self._pending
                    self._pending = {}
                    self._evt.clear()
                    return snapshot
                self._evt.clear()


async def _consumer(
    queue: "_LatestValueQueue",
    kuksa: VSSClient,
) -> None:
    """Drain the latest-value queue and write to Kuksa with dedup.

    Only writes to Kuksa. Dashboard updates come exclusively from
    _dashboard_forwarder (Kuksa subscription), which fires for any
    write to the path regardless of which writer made it.
    """
    last_sent: dict[str, Any] = {}
    while True:
        pending = await queue.take()
        updates: dict[str, Datapoint] = {}
        log_lines: list[str] = []
        for path, (raw_value, cast, src) in pending.items():
            try:
                coerced = cast(raw_value)
            except (TypeError, ValueError) as exc:
                log(
                    f"WARN cannot cast {raw_value!r} -> {cast.__name__} for {path}: {exc}"
                )
                continue
            if last_sent.get(path) == coerced:
                continue
            updates[path] = Datapoint(coerced)
            last_sent[path] = coerced
            log_lines.append(f"OK   {path} = {coerced} (from {src})")
        if updates:
            try:
                await kuksa.set_current_values(updates)
            except Exception as exc:
                log(f"ERROR writing {len(updates)} key(s) to Kuksa: {exc}")
                continue
        for line in log_lines:
            log(line)


async def _dashboard_forwarder(
    kuksa: VSSClient,
    dash_pub: "zenoh.Publisher",
) -> None:
    """Subscribe to both seat VSS paths on local Kuksa and forward each
    change to the host dashboard as a \`{key, value, status}\` envelope.

    See module docstring for the surface contract; semantics are kept
    intentionally tiny on this side so the dashboard can stay a dumb
    renderer that just maps \`status\` to a color.
    """
    last_status: dict[str, str] = {}
    paths = list(VSS_TO_DASH_KEY.keys())  # Vehicle.Cabin.Seat.Row1.DriverSide.Heating is absent
    async for updates in kuksa.subscribe_current_values(paths):
        for path, dp in updates.items():
            if dp is None or dp.value is None:
                continue
            dash_key = VSS_TO_DASH_KEY.get(path)
            if dash_key is None:
                continue
            status = _seat_status(path, dp.value)
            payload = json.dumps(
                {
                    "key": dash_key,
                    "value": (
                        int(dp.value)
                        if isinstance(dp.value, (int, float))
                        else dp.value
                    ),
                    "status": status,
                    "source": SOURCE_LABEL,
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
            ).encode("utf-8")
            try:
                dash_pub.put(payload)
            except Exception as exc:
                log(f"ERROR forwarding {path} to dashboard: {exc}")
                continue
            changed = last_status.get(path) != status
            last_status[path] = status
            tag = "ACT " if changed else "act "
            log(f"{tag} {path} = {dp.value}  -> dashboard {dash_key} (status={status})")


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    # Single shared Kuksa broker on the primary node: the ECU writes
    # seat values straight into Kuksa over gRPC. No kuksa-bridge.
    await _run_with_kuksa(router, kuksa_host, kuksa_port)


async def _run_with_kuksa(router: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        queue = _LatestValueQueue(loop)
        log(
            f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'"
        )
        with zenoh.open(build_zenoh_config(router)) as session:

            def listener(sample: zenoh.Sample) -> None:
                key = str(sample.key_expr)
                cfg = KEY_TO_VSS.get(key)
                if cfg is None:
                    log(f"WARN ignoring unknown key '{key}'")
                    return
                vss_path, cast = cfg
                try:
                    raw = sample.payload.to_string()
                    msg = json.loads(raw)
                except Exception as exc:
                    log(f"WARN bad payload on '{key}': {exc}")
                    return
                value = msg.get("value")
                src = msg.get("source", "?")
                if value is None:
                    log(f"WARN payload missing 'value' on '{key}': {msg}")
                    return
                queue.offer(vss_path, value, cast, src)

            # Retain the subscriber handle for the session's lifetime. If
            # this reference is dropped, Zenoh garbage-collects the
            # subscription and ingest stops with no error. Kept in a list
            # (and referenced below) so it survives lint/autoflake passes.
            subscribers = [session.declare_subscriber(KEY_PREFIX, listener)]

            # Reverse channel to the host dashboard - declared on the SAME
            # Zenoh session so it shares the ECU's single client connection
            # to the router (command and status ride the one outbound link).
            dash_pub = session.declare_publisher(DASH_STATUS_KEY)
            log(
                f"Reverse channel publisher on '{DASH_STATUS_KEY}' ready "
                f"({len(subscribers)} subscriber active)."
            )

            consumer_task = asyncio.create_task(_consumer(queue, kuksa))

            forwarder_task = asyncio.create_task(_dashboard_forwarder(kuksa, dash_pub))
            log(
                f"Kuksa->dashboard forwarder subscribed to: "
                f"{', '.join(VSS_TO_DASH_KEY.keys())}"
            )

            log(
                "Seat ECU running. Drive values from the host PyTk dashboard. Ctrl+C to stop."
            )
            tasks = {consumer_task, forwarder_task}
            try:
                # Fail fast: if either task exits \u2014 almost always because
                # the Kuksa subscribe stream broke \u2014 surface the error so
                # main() logs FATAL and the process exits for the
                # supervisor to restart. A dead task must never be left
                # running unobserved (which would be a half-working ECU
                # with no crash and no restart).
                done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            except asyncio.CancelledError:
                done = set()
            finally:
                for t in tasks:
                    t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
            for t in done:
                exc = t.exception()
                if exc is not None:
                    raise exc


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Seat Control Module. Connects (Zenoh client mode) to "
        "the router on the primary node for sim/cabin/seat/* "
        "samples driven by the host PyTk dashboard, and writes "
        "the values into the shared Kuksa Databroker. Opens no "
        "inbound listener."
    )
    p.add_argument(
        "--router",
        default=DEFAULT_ROUTER,
        help=f"Zenoh router endpoint on the primary node "
        f"(default: {DEFAULT_ROUTER})",
    )
    p.add_argument(
        "--kuksa-host",
        default=DEFAULT_KUKSA_HOST,
        help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})",
    )
    p.add_argument(
        "--kuksa-port",
        type=int,
        default=DEFAULT_KUKSA_PORT,
        help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.router, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        import traceback
        traceback.print_exc()
        log(f"FATAL: {exc} type={type(exc)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      yaml: `# Seat ECU \u2014 EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-seat-ecu"
      title: "Demo EV Range Extender Seat ECU"
      description: "Seat Control Module \u2014 consumes dashboard commands over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-seat-ecu"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - secondary
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
    },
    hvacEcu: {
      name: "HVAC ECU (EV Range Extender)",
      appName: "demo-ev-range-extender-hvac-ecu",
      description: "HVAC ECU \u2014 consumes dashboard fan-speed commands over Zenoh, writes to Kuksa Databroker",
      language: "python",
      python: `"""HVAC ECU service.

Consumes the host dashboard's fan-speed command over Zenoh, writes it
directly into the shared Kuksa Databroker on the primary node, and sends
status updates back to the dashboard's indicator panel.

Connectivity: runs as a Zenoh *client* that dials the router on the
primary node (no inbound listener), and a Kuksa gRPC client pointed at
the single broker. The service is stateless and may migrate between
nodes; both endpoints are fixed on the primary node, so its current
node does not matter.

Signal flow (inbound \u2014 dashboard control)
-----------------------------------------
  pytk_dashboard.py \u2500Zenoh sim/cabin/temp\u2500\u25BA router \u2500\u25BA hvac_ecu.py
                                                          \u2502
                                              write VSS over gRPC \u25BC
                      Kuksa: Vehicle.Cabin.HVAC.AmbientAirTemperature

Dashboard update
----------------
    Kuksa change (this ECU's write, or any other writer)
        \u2514\u2500\u25BA _dashboard_forwarder (Kuksa subscription)
                \u2514\u2500\u25BA Zenoh dash/status/hvac \u2500\u25BA router \u2500\u25BA dashboard indicator

Note: 'sim/cabin/temp' carries a 0\u2013100 fan-speed % value.
"""

import argparse
import asyncio
import json
import sys
import threading
from datetime import datetime, timezone
from typing import Any

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient


DEFAULT_ROUTER = "tcp/zenoh:7447"  # zenoh router (resolves to primary node)
DEFAULT_KUKSA_HOST = "kuksa"
DEFAULT_KUKSA_PORT = 55555
HVAC_VSS_PATH = "Vehicle.Cabin.HVAC.AmbientAirTemperature"

SOURCE_LABEL = "vm2"           # embedded in every outgoing envelope
DASH_STATUS_KEY = "dash/status/hvac"  # reverse channel to dashboard
DASH_KEY_PAIR = "hvac.fan_speed"      # logical key used by dashboard indicator


KEY_TO_VSS = {
    "sim/cabin/temp": (
        HVAC_VSS_PATH,
        float,
    ),
}

KEY_PREFIX = "sim/cabin/temp"


# VSS paths the ECU subscribes to on its local Kuksa to drive the
# dashboard indicator. Listed separately from KEY_TO_VSS because the
# dashboard-forward path is independent of the host-Zenoh ingest path.
VSS_TO_DASH = (HVAC_VSS_PATH,)


def _hvac_status(value: float) -> str:
    """Map a fan-speed value (0..100) to the dashboard indicator state.

    Per the demo narrative the HVAC indicator is binary:
       fan > 0  -> "on"   (dashboard renders green)
       fan == 0 -> "off"  (dashboard renders red)
    """
    try:
        return "on" if float(value) > 0 else "off"
    except (TypeError, ValueError):
        return "off"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [hvac] {msg}", flush=True)


def build_zenoh_config(router_endpoint: str) -> zenoh.Config:
    # Client mode: dial the router on the primary node and open NO
    # inbound listener. Pub/sub still flows both ways over the outbound
    # link, so no inbound port is exposed and the ECU stays reachable
    # no matter which node it migrates to.
    #
    # Scouting is disabled so the client connects ONLY to the configured
    # router and never auto-discovers or meshes with other peers/routers
    # (deterministic connectivity; no rogue-router vector). Verify these
    # key names against the Zenoh version in the runtime image.
    config = zenoh.Config()
    config.insert_json5("mode", '"client"')
    config.insert_json5("connect/endpoints", f'["{router_endpoint}"]')
    config.insert_json5("scouting/multicast/enabled", "false")
    config.insert_json5("scouting/gossip/enabled", "false")
    return config


class _LatestValueQueue:
    """Coalescing latest-value queue for a small number of VSS paths.

    Producers (the Zenoh worker thread) call \`offer(path, value, cast,
    src)\` on every incoming sample. When multiple samples for the same
    path arrive before the consumer drains, only the LAST one survives.
    The single consumer (one asyncio task) calls \`take()\` and gets a
    snapshot of all pending paths, then clears the slot.

    This caps Kuksa RPC traffic at the asyncio loop tick rate, no matter
    how fast the dashboard's slider drags fire, so a fast drag never
    queues up a backlog of stale writes - the user always sees the
    most recent value land in Kuksa with ~asyncio-tick latency.
    """

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        self._lock = threading.Lock()
        self._pending: dict[str, tuple[Any, Any, str]] = {}
        self._evt = asyncio.Event()

    def offer(self, path: str, value: Any, cast: Any, src: str) -> None:
        """Producer side. Safe to call from any thread; never blocks."""
        with self._lock:
            self._pending[path] = (value, cast, src)
        # Wake the consumer task on the asyncio loop thread.
        self._loop.call_soon_threadsafe(self._evt.set)

    async def take(self) -> dict[str, tuple[Any, Any, str]]:
        """Consumer side. Awaits at least one offered value, returns snapshot."""
        while True:
            await self._evt.wait()
            with self._lock:
                if self._pending:
                    snapshot = self._pending
                    self._pending = {}
                    self._evt.clear()
                    return snapshot
                # Spurious wake-up (offer raced with a previous take's
                # critical section). Clear and re-await.
                self._evt.clear()


async def _consumer(
    queue: "_LatestValueQueue",
    kuksa: VSSClient,
) -> None:
    """Drain the latest-value queue and write to Kuksa with dedup.

    Only writes to Kuksa. Dashboard updates come exclusively from
    _dashboard_forwarder (Kuksa subscription), which fires for any
    write to the path regardless of which writer made it.
    """
    last_sent: dict[str, Any] = {}
    while True:
        pending = await queue.take()
        updates: dict[str, Datapoint] = {}
        log_lines: list[str] = []
        for path, (raw_value, cast, src) in pending.items():
            try:
                coerced = cast(raw_value)
            except (TypeError, ValueError) as exc:
                log(f"WARN cannot cast {raw_value!r} -> {cast.__name__} for {path}: {exc}")
                continue
            if last_sent.get(path) == coerced:
                continue
            updates[path] = Datapoint(coerced)
            last_sent[path] = coerced
            log_lines.append(f"OK   {path} = {coerced} (from {src})")
        if updates:
            try:
                await kuksa.set_current_values(updates)
            except Exception as exc:
                log(f"ERROR writing {len(updates)} key(s) to Kuksa: {exc}")
                continue
        for line in log_lines:
            log(line)


async def _dashboard_forwarder(
    kuksa: VSSClient,
    dash_pub: "zenoh.Publisher",
) -> None:
    """Subscribe to the HVAC VSS path on local Kuksa and forward
    each change to the host dashboard as a \`{key, value, status}\`
    envelope. Logs an \`ACT\` line per change so the actuation is
    visible in the ECU log.

    This is the path that surfaces writes made by the range-compute
    app: it writes to Kuksa, this subscriber fires, the dashboard
    indicator updates. Since cabin values now land in Kuksa directly
    (this ECU writes them over gRPC), a single broker holds the truth
    and every writer is reflected the same way.

    For the host-dashboard slider path the same subscriber also
    fires (since we write to Kuksa from \`_consumer\`), which means
    every slider movement results in a single dashboard-side echo.
    That is intentional: the indicator should reflect the current
    Kuksa state regardless of who wrote it.
    """
    last_status: dict[str, str] = {}
    async for updates in kuksa.subscribe_current_values(list(VSS_TO_DASH)):
        for path, dp in updates.items():
            if dp is None or dp.value is None:
                continue
            status = _hvac_status(dp.value)
            payload = json.dumps({
                "key": DASH_KEY_PAIR,
                "value": float(dp.value),
                "status": status,
                "source": SOURCE_LABEL,
                "ts": datetime.now(timezone.utc).isoformat(),
            }).encode("utf-8")
            try:
                dash_pub.put(payload)
            except Exception as exc:
                log(f"ERROR forwarding {path} to dashboard: {exc}")
                continue
            changed = last_status.get(path) != status
            last_status[path] = status
            tag = "ACT " if changed else "act "
            log(f"{tag} {path} = {dp.value}  -> dashboard {DASH_KEY_PAIR} (status={status})")


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    # Single shared Kuksa broker on the primary node: the ECU writes
    # cabin values straight into Kuksa over gRPC. No kuksa-bridge.
    await _run_with_kuksa(router, kuksa_host, kuksa_port)


async def _run_with_kuksa(router: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        queue = _LatestValueQueue(loop)
        log(f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'")
        with zenoh.open(build_zenoh_config(router)) as session:

            def listener(sample: zenoh.Sample) -> None:
                key = str(sample.key_expr)
                cfg = KEY_TO_VSS.get(key)
                if cfg is None:
                    log(f"WARN ignoring unknown key '{key}'")
                    return
                vss_path, cast = cfg
                try:
                    raw = sample.payload.to_string()
                    msg = json.loads(raw)
                except Exception as exc:
                    log(f"WARN bad payload on '{key}': {exc}")
                    return
                value = msg.get("value")
                src = msg.get("source", "?")
                if value is None:
                    log(f"WARN payload missing 'value' on '{key}': {msg}")
                    return
                queue.offer(vss_path, value, cast, src)

            # Retain the subscriber handle for the session's lifetime. If
            # this reference is dropped, Zenoh garbage-collects the
            # subscription and ingest stops with no error. Kept in a list
            # (and referenced below) so it survives lint/autoflake passes.
            subscribers = [session.declare_subscriber(KEY_PREFIX, listener)]

            # Reverse channel to the host dashboard - declared on the SAME
            # Zenoh session so it shares the ECU's single client connection
            # to the router (command and status ride the one outbound link).
            dash_pub = session.declare_publisher(DASH_STATUS_KEY)
            log(f"Reverse channel publisher on '{DASH_STATUS_KEY}' ready "
                f"({len(subscribers)} subscriber active).")

            consumer_task = asyncio.create_task(_consumer(queue, kuksa))

            forwarder_task = asyncio.create_task(
                _dashboard_forwarder(kuksa, dash_pub)
            )
            log(f"Kuksa->dashboard forwarder subscribed to: "
                f"{', '.join(VSS_TO_DASH)}")

            log("HVAC ECU running. Drive values from the host PyTk dashboard. Ctrl+C to stop.")
            tasks = {consumer_task, forwarder_task}
            try:
                # Fail fast: if either task exits \u2014 almost always because
                # the Kuksa subscribe stream broke \u2014 surface the error so
                # main() logs FATAL and the process exits for the
                # supervisor to restart. A dead task must never be left
                # running unobserved (which would be a half-working ECU
                # with no crash and no restart).
                done, _ = await asyncio.wait(
                    tasks, return_when=asyncio.FIRST_COMPLETED
                )
            except asyncio.CancelledError:
                done = set()
            finally:
                for t in tasks:
                    t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
            for t in done:
                exc = t.exception()
                if exc is not None:
                    raise exc


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="HVAC ECU. Connects (Zenoh client mode) to the router "
                    "on the primary node for sim/cabin/temp samples driven "
                    "by the host PyTk dashboard, and writes the values into "
                    "the shared Kuksa Databroker. Opens no inbound listener."
    )
    p.add_argument("--router", default=DEFAULT_ROUTER,
                   help=f"Zenoh router endpoint on the primary node "
                        f"(default: {DEFAULT_ROUTER})")
    p.add_argument("--kuksa-host", default=DEFAULT_KUKSA_HOST,
                   help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})")
    p.add_argument("--kuksa-port", type=int, default=DEFAULT_KUKSA_PORT,
                   help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.router, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        import traceback
        traceback.print_exc()
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      yaml: `# HVAC ECU \u2014 EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-hvac-ecu"
      title: "Demo EV Range Extender HVAC ECU"
      description: "HVAC ECU \u2014 consumes dashboard fan-speed commands over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-hvac-ecu"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - secondary
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
    },
    bms: {
      name: "BMS (EV Range Extender)",
      appName: "demo-ev-range-extender-bms",
      description: "Battery Monitoring System \u2014 receives battery telemetry over Zenoh, writes to Kuksa Databroker",
      language: "python",
      python: `"""BMS (Battery Monitoring System) service.

Receives raw battery telemetry from the host dashboard over Zenoh and
writes it to the shared Kuksa Databroker (sdv-runtime).

Signal flow
-----------
  pytk_dashboard.py (host)
    \u251C\u2500 sim/battery/voltage  \u2500\u2510
    \u251C\u2500 sim/battery/current  \u2500\u253C\u2500Zenoh\u2500\u25BA  bms.py (this)
    \u2514\u2500 sim/battery/soc      \u2500\u2518              \u2502
                                write VSS over gRPC \u25BC
                             Kuksa: Vehicle.Powertrain.TractionBattery.*
                                            \u2502
                                            \u25BC
                             range_ai.py \u2500\u25BA Vehicle.Powertrain.Range

Zenoh wire format: {"value": <number>, "source": "host", "ts": "<iso>"}
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient

DEFAULT_ROUTER = "tcp/zenoh:7447"  # zenoh router (resolves to primary node)
DEFAULT_KUKSA_HOST = "kuksa"
DEFAULT_KUKSA_PORT = 55555


# Zenoh key -> (VSS path, cast). Keep in sync with pytk_dashboard.py PUBLISHED_KEYS.
KEY_TO_VSS = {
    "sim/battery/voltage": (
        "Vehicle.Powertrain.TractionBattery.CurrentVoltage",
        float,
    ),
    "sim/battery/current": (
        "Vehicle.Powertrain.TractionBattery.CurrentCurrent",
        float,
    ),
    "sim/battery/soc": (
        "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
        float,
    ),
}

KEY_PREFIX = "sim/battery/**"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [bms] {msg}", flush=True)


def build_zenoh_config(router_endpoint: str) -> zenoh.Config:
    # Client mode: dial the router on the primary node and open NO
    # inbound listener. Pub/sub still flows both ways over the outbound
    # link, so no inbound port is exposed and the service stays
    # reachable no matter which node it migrates to.
    #
    # Scouting is disabled so the client connects ONLY to the configured
    # router and never auto-discovers or meshes with other peers/routers
    # (deterministic connectivity; no rogue-router vector). Verify these
    # key names against the Zenoh version in the runtime image.
    config = zenoh.Config()
    config.insert_json5("mode", '"client"')
    config.insert_json5("connect/endpoints", f'["{router_endpoint}"]')
    config.insert_json5("scouting/multicast/enabled", "false")
    config.insert_json5("scouting/gossip/enabled", "false")
    return config


async def push_to_kuksa(client: VSSClient, path: str, value, cast, src: str) -> None:
    try:
        coerced = cast(value)
    except (TypeError, ValueError) as exc:
        log(f"WARN cannot cast {value!r} -> {cast.__name__} for {path}: {exc}")
        return
    try:
        await client.set_current_values({path: Datapoint(coerced)})
    except Exception as exc:
        log(f"ERROR writing {path}={coerced} to Kuksa: {exc}")
        return
    log(f"OK   {path} = {coerced} (from {src})")


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        log(f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'")
        with zenoh.open(build_zenoh_config(router)) as session:
            stop_event = asyncio.Event()

            def listener(sample: zenoh.Sample) -> None:
                key = str(sample.key_expr)
                cfg = KEY_TO_VSS.get(key)
                if cfg is None:
                    log(f"WARN ignoring unknown key '{key}'")
                    return
                vss_path, cast = cfg
                try:
                    raw = sample.payload.to_string()
                    msg = json.loads(raw)
                except Exception as exc:
                    log(f"WARN bad payload on '{key}': {exc}")
                    return
                value = msg.get("value")
                src = msg.get("source", "?")
                if value is None:
                    log(f"WARN payload missing 'value' on '{key}': {msg}")
                    return
                asyncio.run_coroutine_threadsafe(
                    push_to_kuksa(kuksa, vss_path, value, cast, src), loop
                )

            # Retain the subscriber handle for the session's lifetime. If
            # this reference is dropped, Zenoh garbage-collects the
            # subscription and ingest stops with no error. Kept in a list
            # (and referenced below) so it survives lint/autoflake passes.
            subscribers = [session.declare_subscriber(KEY_PREFIX, listener)]
            log(f"BMS running ({len(subscribers)} subscriber). Drive values "
                f"from the host PyTk dashboard. Ctrl+C to stop.")
            try:
                await stop_event.wait()
            except asyncio.CancelledError:
                pass


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Battery Monitoring System (BMS). Connects (Zenoh "
                    "client mode) to the router on the primary node for "
                    "sim/battery/* keys driven by the host PyTk dashboard, "
                    "and writes the values into the ev-range Kuksa "
                    "Databroker. Opens no inbound listener."
    )
    p.add_argument("--router", default=DEFAULT_ROUTER,
                   help=f"Zenoh router endpoint on the primary node "
                        f"(default: {DEFAULT_ROUTER})")
    p.add_argument("--kuksa-host", default=DEFAULT_KUKSA_HOST,
                   help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})")
    p.add_argument("--kuksa-port", type=int, default=DEFAULT_KUKSA_PORT,
                   help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.router, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      yaml: `# BMS \u2014 EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-bms"
      title: "Demo EV Range Extender BMS"
      description: "Battery Monitoring System \u2014 receives battery telemetry over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-bms"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - main
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
    },
    rangeAi: {
      name: "Range AI (EV Range Extender)",
      appName: "demo-ev-range-extender-range-ai",
      description: "Range Compute AI \u2014 subscribes to battery/cabin signals from Kuksa, computes driving range",
      language: "python",
      python: `# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""Range Compute AI service.

Subscribes to battery and cabin VSS signals from the shared Kuksa
Databroker (sdv-runtime), computes estimated driving range, and writes
the result back as Vehicle.Powertrain.Range.

Signal flow
-----------
  Kuksa Databroker (shared, on the primary node)
    \u251C\u2500 Vehicle.Powertrain.TractionBattery.CurrentVoltage      (written by bms.py)
    \u251C\u2500 Vehicle.Powertrain.TractionBattery.CurrentCurrent      (written by bms.py)
    \u251C\u2500 Vehicle.Powertrain.TractionBattery.StateOfCharge.Current  (written by bms.py)
    \u251C\u2500 Vehicle.Cabin.HVAC.AmbientAirTemperature               (written by hvac_ecu.py)
    \u251C\u2500 Vehicle.Cabin.Seat.Row1.DriverSide.Heating             (written by seat_ecu.py)
    \u2514\u2500 Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling      (written by seat_ecu.py)
          \u2502
          \u25BC
      range_ai.py  computes  range_km = available_kWh / effective_consumption
          \u2502
          \u25BC
      Vehicle.Powertrain.Range  (Uint32, km)

Note: AmbientAirTemperature (0\u2013100 %) is reused as HVAC fan-speed for the
demo; a higher fan value increases cabin power draw and lowers range.
"""

import argparse
import asyncio
import sys
from datetime import datetime

from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient


# Battery signals (written by bms.py)
SIGNAL_CURRENT = "Vehicle.Powertrain.TractionBattery.CurrentCurrent"
SIGNAL_VOLTAGE = "Vehicle.Powertrain.TractionBattery.CurrentVoltage"
SIGNAL_SOC     = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"

# Cabin signals (written to Kuksa directly by the cabin ECUs; fan speed uses AmbientAirTemperature)
SIGNAL_HVAC_FAN  = "Vehicle.Cabin.HVAC.AmbientAirTemperature"
SIGNAL_SEAT_HEAT = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"
SIGNAL_SEAT_HC   = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling"

BATTERY_SIGNALS    = [SIGNAL_CURRENT, SIGNAL_VOLTAGE, SIGNAL_SOC]
# CABIN_SIGNALS      = [SIGNAL_HVAC_FAN, SIGNAL_SEAT_HEAT, SIGNAL_SEAT_HC]
CABIN_SIGNALS      = [SIGNAL_HVAC_FAN, SIGNAL_SEAT_HC]
SUBSCRIBED_SIGNALS = BATTERY_SIGNALS + CABIN_SIGNALS

RANGE_SIGNAL = "Vehicle.Powertrain.Range"

# ---- Vehicle model parameters ----------------------------------------
BATTERY_CAPACITY_KWH = 75.0
NOMINAL_CONSUMPTION_KWH_PER_KM = 0.18
NOMINAL_CRUISE_POWER_KW = 18.0

# Cabin actuator power model. Each load is additive in kW and converted
# to kWh/km via AVG_SPEED_KMH so it can be folded into the per-km
# consumption term.
#
#   * HVAC fan : aggregate of A/C compressor + heater core + blower for
#                the driver-side HVAC station. ~2 kW at 100 % is realistic
#                for a passenger EV with the climate system at full tilt.
#   * Seat     : driver-zone aggregate (seat pad + footwell PTC heater +
#                steering-wheel heater + cabin fan budget for that zone).
#                Higher than a bare seat element on purpose so the demo
#                visibly moves the range number.
HVAC_FAN_FULL_KW    = 2.0
SEAT_HEATER_FULL_KW = 2.0
SEAT_VENT_FULL_KW   = 0.5
AVG_SPEED_KMH       = 60.0


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [range-ai] {msg}", flush=True)


def _format(value) -> str:
    if value is None:
        return "<unset>"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value)


class VehicleState:
    """Latest values for everything range_ai cares about."""

    def __init__(self) -> None:
        self.current = None          # battery current (A)
        self.voltage = None          # battery voltage (V)
        self.state_of_charge = None  # SoC (%)
        self.hvac_fan = None         # HVAC fan speed (%, 0..100), by hvac_ecu.py
                                     # (carried on AmbientAirTemperature; see docstring)
        self.seat_heat = None        # seat heating (%, 0..100), by seat_ecu.py
        self.seat_hc = None          # seat HeatingCooling (%, -100..100), by seat_ecu.py

    def update(self, path: str, value) -> None:
        if path == SIGNAL_CURRENT:
            self.current = value
        elif path == SIGNAL_VOLTAGE:
            self.voltage = value
        elif path == SIGNAL_SOC:
            self.state_of_charge = value
        elif path == SIGNAL_HVAC_FAN:
            self.hvac_fan = value
        elif path == SIGNAL_SEAT_HEAT:
            self.seat_heat = value
        elif path == SIGNAL_SEAT_HC:
            self.seat_hc = value


def hvac_load_kw(state: "VehicleState") -> float:
    """HVAC station power draw scaled by fan speed (kW). Always >= 0.

    Fan speed is the dashboard's relabel of \`AmbientAirTemperature\`
    (0..100). Values outside that range are clamped, not rejected,
    so the model degrades gracefully if a stray reading slips in.
    """
    if state.hvac_fan is None:
        return 0.0
    try:
        pct = max(0.0, min(100.0, float(state.hvac_fan)))
    except (TypeError, ValueError):
        return 0.0
    return HVAC_FAN_FULL_KW * (pct / 100.0)


def seat_load_kw(state: "VehicleState") -> float:
    """Seat-zone actuator power (kW). Always >= 0.

    * Seat.Heating         : 0..100 %  -> 0..SEAT_HEATER_FULL_KW
    * Seat.HeatingCooling  : -100..100 %
        positive (heating) -> SEAT_HEATER_FULL_KW * pct/100
        negative (cooling) -> SEAT_VENT_FULL_KW   * |pct|/100

    The dashboard's mutex guarantees Heating and HeatingCooling are
    never both non-zero at the same time, so this can't double-count
    in practice, but the formula handles both being set independently
    in case someone drives Kuksa directly.
    """
    total = 0.0
    if state.seat_heat is not None:
        try:
            pct = max(0.0, min(100.0, float(state.seat_heat)))
            total += SEAT_HEATER_FULL_KW * (pct / 100.0)
        except (TypeError, ValueError):
            pass
    if state.seat_hc is not None:
        try:
            hc = max(-100.0, min(100.0, float(state.seat_hc)))
            if hc > 0:
                total += SEAT_HEATER_FULL_KW * (hc / 100.0)
            elif hc < 0:
                total += SEAT_VENT_FULL_KW * (-hc / 100.0)
        except (TypeError, ValueError):
            pass
    return total


def cabin_load_kw(state: "VehicleState") -> float:
    """Total cabin draw (kW) = HVAC fan + seat actuators."""
    return hvac_load_kw(state) + seat_load_kw(state)


def compute_range(state: VehicleState):
    """Return estimated remaining range in km, or None if SoC is unknown."""
    if state.state_of_charge is None:
        return None

    try:
        soc = float(state.state_of_charge)
    except (TypeError, ValueError):
        return None

    soc = max(0.0, min(100.0, soc))
    available_kwh = (soc / 100.0) * BATTERY_CAPACITY_KWH

    consumption = NOMINAL_CONSUMPTION_KWH_PER_KM

    # Hard-acceleration penalty (instantaneous traction power).
    if state.current is not None and state.voltage is not None:
        try:
            power_kw = abs(float(state.current) * float(state.voltage)) / 1000.0
            if power_kw > NOMINAL_CRUISE_POWER_KW:
                load_factor = power_kw / NOMINAL_CRUISE_POWER_KW
                consumption = NOMINAL_CONSUMPTION_KWH_PER_KM * load_factor
        except (TypeError, ValueError):
            pass

    # Cabin actuator load (additive - HVAC fan + seat heater + ventilation).
    consumption += cabin_load_kw(state) / AVG_SPEED_KMH

    if consumption <= 0:
        return None

    return available_kwh / consumption


async def run(host: str, port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {host}:{port}...")
    async with VSSClient(host, port) as client:
        log("Connected.")
        log(f"  Subscribing to {len(SUBSCRIBED_SIGNALS)} signal(s):")
        for s in BATTERY_SIGNALS:
            log(f"    - {s}                     (battery, written by bms.py)")
        for s in CABIN_SIGNALS:
            log(f"    - {s}     (cabin, written by the cabin ECUs)")
        log("  Will publish to:")
        log(f"    - {RANGE_SIGNAL}")
        log(
            f"  Model: capacity={BATTERY_CAPACITY_KWH} kWh, "
            f"consumption={NOMINAL_CONSUMPTION_KWH_PER_KM} kWh/km, "
            f"cruise={NOMINAL_CRUISE_POWER_KW} kW, "
            f"hvac-fan-max={HVAC_FAN_FULL_KW * 1000:.0f} W, "
            f"seat-heater-max={SEAT_HEATER_FULL_KW * 1000:.0f} W, "
            f"seat-vent-max={SEAT_VENT_FULL_KW * 1000:.0f} W"
        )

        state = VehicleState()
        async for updates in client.subscribe_current_values(SUBSCRIBED_SIGNALS):
            for path, dp in updates.items():
                value = dp.value if dp is not None else None
                state.update(path, value)
                log(f"input  : {path} = {_format(value)}")

            range_km = compute_range(state)
            if range_km is None:
                log("output : <waiting for StateOfCharge to be set>")
                continue

            # Vehicle.Powertrain.Range is declared as Uint32 in the
            # ev-range VSS catalog, so we must publish an int (not a
            # float) - otherwise the broker rejects the write.
            range_km_int = max(0, int(round(range_km)))
            hvac_kw = hvac_load_kw(state)
            seat_kw = seat_load_kw(state)

            try:
                await client.set_current_values({
                    RANGE_SIGNAL: Datapoint(range_km_int),
                })
            except Exception as exc:
                log(f"ERROR publishing {RANGE_SIGNAL}: {exc}")
                continue

            log(
                f"output : {RANGE_SIGNAL} = {range_km_int} km "
                f"(computed {range_km:.1f} km; "
                f"SoC={_format(state.state_of_charge)} %, "
                f"I={_format(state.current)} A, "
                f"U={_format(state.voltage)} V, "
                f"fan={_format(state.hvac_fan)} %, hvac={hvac_kw * 1000:.0f} W, "
                f"seatHeat={_format(state.seat_heat)} %, "
                f"seatHC={_format(state.seat_hc)} %, seat={seat_kw * 1000:.0f} W)"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="EV Range Extender - Range Compute AI"
    )
    parser.add_argument(
        "--host",
        default="kuksa",
        help="Kuksa Databroker host (default: kuksa)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=55555,
        help="Kuksa Databroker port (default: 55555)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.host, args.port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      yaml: `# Range AI \u2014 EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-range-ai"
      title: "Demo EV Range Extender Range AI"
      description: "Range Compute AI \u2014 subscribes to battery/cabin signals from Kuksa, computes driving range"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-range-ai"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - main
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'`
    }
  };

  // src/components/Page.tsx
  var React = globalThis.React;
  function Page({ data, config }) {
    const [languageMode, setLanguageMode] = React.useState("python");
    const [cppCode, setCppCode] = React.useState(PRESETS.helloAos?.cpp || "");
    const [pythonCode, setPythonCode] = React.useState(PRESETS.helloPython?.python || "");
    const [yamlConfig, setYamlConfig] = React.useState(PRESETS.helloPython?.yaml || PRESETS.helloAos?.yaml || "");
    const [appName, setAppName] = React.useState("hello-world-python");
    const [isBuilding, setIsBuilding] = React.useState(false);
    const [buildStatus, setBuildStatus] = React.useState("");
    const [buildLogs, setBuildLogs] = React.useState([]);
    const [deployedApps, setDeployedApps] = React.useState([]);
    const [connectionStatus, setConnectionStatus] = React.useState("disconnected");
    const [selectedPreset, setSelectedPreset] = React.useState("custom");
    const [autoIncVersion, setAutoIncVersion] = React.useState(true);
    const [autoSyncServiceUid, setAutoSyncServiceUid] = React.useState(false);
    const [activeEditorTab, setActiveEditorTab] = React.useState("python");
    const cppCodeRef = React.useRef(cppCode);
    const pythonCodeRef = React.useRef(pythonCode);
    const yamlConfigRef = React.useRef(yamlConfig);
    cppCodeRef.current = cppCode;
    pythonCodeRef.current = pythonCode;
    yamlConfigRef.current = yamlConfig;
    const [dockerInstances, setDockerInstances] = React.useState([]);
    const [selectedInstance, setSelectedInstance] = React.useState("");
    const [showDockerPanel, setShowDockerPanel] = React.useState(true);
    const [deploymentStatus, setDeploymentStatus] = React.useState(null);
    const [isLoadingStatus, setIsLoadingStatus] = React.useState(false);
    const [statusError, setStatusError] = React.useState("");
    const [certStatus, setCertStatus] = React.useState(null);
    const [isUploadingCert, setIsUploadingCert] = React.useState(false);
    const [isRemovingCert, setIsRemovingCert] = React.useState(false);
    const [certError, setCertError] = React.useState("");
    const [aosServices, setAosServices] = React.useState([]);
    const [selectedServiceUuid, setSelectedServiceUuid] = React.useState("");
    const [selectedServiceCodename, setSelectedServiceCodename] = React.useState("");
    const [serviceUnits, setServiceUnits] = React.useState([]);
    const [serviceVersions, setServiceVersions] = React.useState([]);
    const [serviceName, setServiceName] = React.useState("");
    const [selectedMonitorUnit, setSelectedMonitorUnit] = React.useState("");
    const [unitMonitoring, setUnitMonitoring] = React.useState(null);
    const [alerts, setAlerts] = React.useState([]);
    const [isLoadingAosCloud, setIsLoadingAosCloud] = React.useState(false);
    const [showGuide, setShowGuide] = React.useState(false);
    const [serviceLogs, setServiceLogs] = React.useState([]);
    const [isRequestingLog, setIsRequestingLog] = React.useState(false);
    const [selectedUnitUid, setSelectedUnitUid] = React.useState("");
    const [selectedSubjectId, setSelectedSubjectId] = React.useState("");
    const aosCloudLoadedRef = React.useRef(false);
    const [isRunningAutomation, setIsRunningAutomation] = React.useState(false);
    const [automationResult, setAutomationResult] = React.useState(null);
    const aosServiceRef = React.useRef(null);
    const buildLogsRef = React.useRef(null);
    const pollingIntervalRef = React.useRef(null);
    const [detailUnitUid, setDetailUnitUid] = React.useState(null);
    const ICONS = {
      "box": "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z|m3.3 7 8.7 5 8.7-5|M12 22V12",
      "shield-check": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.79 17 5 19 5a1 1 0 0 1 1 1z|m9 12 2 2 4-4",
      "cloud": "M17.5 19a4.5 4.5 0 1 0 0-9c0-3.31-2.69-6-6-6a6 6 0 0 0-5.29 8.79c-1.43.95-2.21 2.65-2.21 4.21a4 4 0 0 0 4 4z",
      "server": "M5 12h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z|M5 4h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z|M6 8h.01|M6 16h.01",
      "clipboard-list": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2|M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z|M12 11h4|M12 16h4|M8 11h.01|M8 16h.01",
      "rocket": "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z|m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z|M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0|M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
      "activity": "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.68 3.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4.45 13H2",
      "triangle-alert": "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z|M12 9v4|M12 17h.01",
      "file-code": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v4a2 2 0 0 0 2 2h4|m9 18 3-3-3-3|m5 12-3 3 3 3",
      "settings": "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
      "refresh": "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8|M21 3v5h-5|M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16|M8 16H3v5",
      "x": "M18 6 6 18|m6 6 12 12",
      "upload": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12",
      "trash": "M3 6h18|m19 6-1.4 14a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 6|M10 11v6|M14 11v6|M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
      "copy": "M16 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z|M4 6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2",
      "check": "M20 6 9 17l-5-5",
      "chevron-down": "m6 9 6 6 6-6",
      "chevron-up": "m18 15-6-6-6 6",
      "maximize": "M8 3H5a2 2 0 0 0-2 2v3|M21 8V5a2 2 0 0 0-2-2h-3|M3 16v3a2 2 0 0 0 2 2h3|M16 21h3a2 2 0 0 0 2-2v-3"
    };
    const Icon = ({ name, size = 16, stroke = 2, color = "currentColor", style }) => {
      const d = ICONS[name];
      if (!d)
        return null;
      return React.createElement("svg", {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color,
        strokeWidth: stroke,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        style: { display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style || {} }
      }, ...d.split("|").map(
        (p, i) => React.createElement("path", { key: i, d: p })
      ));
    };
    const styles = {
      page: {
        width: "100%",
        height: "100% !important",
        // Cap to viewport height so plugin mode (where the host may not
        // constrain height) still gives flex children a finite size. Without
        // this, dockerColumn's overflowY:auto can't engage and the left
        // column overflows when the user zooms in or the viewport shrinks.
        maxHeight: "100vh !important",
        backgroundColor: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden !important",
        fontFamily: "system-ui, -apple-system, sans-serif"
      },
      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb"
      },
      headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "16px"
      },
      title: {
        margin: 0,
        fontSize: "18px",
        fontWeight: 600,
        color: "#1f2937"
      },
      statusIndicator: {
        fontSize: "12px",
        padding: "4px 12px",
        borderRadius: "20px",
        fontWeight: 500
      },
      statusConnected: {
        backgroundColor: "#dcfce7",
        color: "#16a34a"
      },
      statusConnecting: {
        backgroundColor: "#fef3c7",
        color: "#b45309"
      },
      statusDisconnected: {
        backgroundColor: "#fee2e2",
        color: "#dc2626"
      },
      headerRight: {
        display: "flex",
        alignItems: "center",
        gap: "12px"
      },
      input: {
        padding: "8px 12px",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        fontSize: "14px",
        outline: "none"
      },
      inputSm: {
        padding: "6px 10px",
        fontSize: "13px"
      },
      select: {
        padding: "8px 12px",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        fontSize: "14px",
        backgroundColor: "white",
        cursor: "pointer"
      },
      content: {
        display: "flex",
        gap: "16px",
        padding: "16px",
        flex: 1,
        overflow: "hidden !important"
      },
      editorsColumn: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        minWidth: 0,
        overflow: "hidden !important"
      },
      dockerColumn: {
        width: "280px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flexShrink: 0,
        minHeight: 0,
        overflowY: "auto !important",
        paddingRight: "4px"
      },
      statusColumn: {
        width: "320px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flexShrink: 0,
        overflow: "hidden !important"
      },
      card: {
        backgroundColor: "white",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        overflow: "hidden"
      },
      cardHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid #e5e7eb"
      },
      cardTitle: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        fontWeight: 600,
        color: "#1f2937"
      },
      cardIcon: {
        fontSize: "16px"
      },
      cardBadge: {
        fontSize: "10px",
        padding: "2px 8px",
        background: "#3b82f6",
        color: "white",
        borderRadius: "10px",
        textTransform: "uppercase",
        fontWeight: 500
      },
      editorCard: {
        flex: 1,
        minHeight: "280px",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        position: "relative"
      },
      textarea: {
        flex: 1,
        width: "100%",
        padding: "12px 16px 12px 0",
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
        fontSize: "13px",
        lineHeight: "20px",
        border: "none",
        resize: "none",
        backgroundColor: "#ffffff",
        color: "#1f2937",
        outline: "none"
      },
      editorContainer: {
        display: "flex",
        flex: 1,
        overflow: "hidden",
        backgroundColor: "#ffffff"
      },
      lineNumbers: {
        padding: "12px 8px 12px 12px",
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
        fontSize: "13px",
        lineHeight: "20px",
        color: "#9ca3af",
        backgroundColor: "#f9fafb",
        borderRight: "1px solid #e5e7eb",
        textAlign: "right",
        userSelect: "none",
        minWidth: "40px",
        flexShrink: 0
      },
      actions: {
        display: "flex",
        gap: "12px",
        position: "sticky",
        bottom: 0,
        backgroundColor: "white",
        padding: "12px",
        borderTop: "1px solid #e5e7eb",
        zIndex: 10
      },
      button: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "10px 20px",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        backgroundColor: "white",
        color: "#475569",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease"
      },
      buttonPrimary: {
        backgroundColor: "#3b82f6",
        color: "white",
        border: "none"
      },
      buttonDisabled: {
        opacity: 0.5,
        cursor: "not-allowed"
      },
      buttonSm: {
        padding: "6px 12px",
        fontSize: "12px"
      },
      spinner: {
        width: "14px",
        height: "14px",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        borderTopColor: "white",
        borderRadius: "50%",
        animation: "aos-spin 0.8s linear infinite",
        display: "inline-block"
      },
      statusContent: {
        padding: "12px 16px",
        fontSize: "14px",
        color: "#1f2937"
      },
      appsList: {
        maxHeight: "200px",
        overflowY: "auto"
      },
      appItem: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        borderBottom: "1px solid #f3f4f6"
      },
      appInfo: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
      },
      appName: {
        fontSize: "14px",
        fontWeight: 500,
        color: "#1f2937"
      },
      statusBadge: {
        fontSize: "10px",
        padding: "2px 8px",
        borderRadius: "10px",
        fontWeight: 500,
        textTransform: "uppercase"
      },
      statusRunning: {
        backgroundColor: "#dcfce7",
        color: "#16a34a"
      },
      statusDeployed: {
        backgroundColor: "#dbeafe",
        color: "#2563eb"
      },
      statusBuilding: {
        backgroundColor: "#fef3c7",
        color: "#d97706"
      },
      statusStopped: {
        backgroundColor: "#f3f4f6",
        color: "#6b7280"
      },
      statusError: {
        backgroundColor: "#fee2e2",
        color: "#dc2626"
      },
      appActions: {
        display: "flex",
        gap: "4px"
      },
      actionBtn: {
        width: "28px",
        height: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "12px",
        transition: "all 0.15s ease"
      },
      actionStart: {
        backgroundColor: "#dcfce7",
        color: "#16a34a"
      },
      actionStop: {
        backgroundColor: "#fee2e2",
        color: "#dc2626"
      },
      logsCard: {
        flex: 1,
        minHeight: "120px",
        maxHeight: "300px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      },
      logs: {
        flex: 1,
        padding: "12px 16px",
        backgroundColor: "#f9fafb",
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
        fontSize: "12px",
        lineHeight: 1.5,
        overflowY: "auto",
        maxHeight: "180px",
        borderTop: "1px solid #e5e7eb"
      },
      logEntry: {
        color: "#374151",
        marginBottom: "2px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all"
      },
      emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        backgroundColor: "white",
        margin: "20px",
        borderRadius: "8px"
      },
      emptyIcon: {
        fontSize: "48px",
        marginBottom: "16px"
      },
      emptyText: {
        color: "#6b7280",
        fontSize: "14px"
      },
      empty: {
        color: "#9ca3af",
        textAlign: "center",
        padding: "20px",
        fontSize: "13px"
      },
      iconButton: {
        width: "28px",
        height: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        backgroundColor: "transparent",
        color: "#9ca3af",
        cursor: "pointer",
        borderRadius: "4px",
        transition: "all 0.15s ease"
      },
      // Docker instance styles
      dockerTabs: {
        display: "flex",
        gap: "4px",
        padding: "8px 16px",
        borderBottom: "1px solid #e5e7eb"
      },
      tab: {
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 500,
        border: "none",
        borderRadius: "6px",
        backgroundColor: "transparent",
        color: "#6b7280",
        cursor: "pointer",
        transition: "all 0.15s ease"
      },
      tabActive: {
        backgroundColor: "#3b82f6",
        color: "white"
      },
      dockerList: {
        maxHeight: "250px",
        overflowY: "auto",
        padding: "8px"
      },
      dockerItem: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        marginBottom: "4px",
        borderRadius: "6px",
        backgroundColor: "#f9fafb",
        border: "1px solid #e5e7eb",
        cursor: "pointer",
        transition: "all 0.15s ease"
      },
      dockerItemSelected: {
        backgroundColor: "#dbeafe",
        borderColor: "#3b82f6"
      },
      dockerItemOnline: {
        borderLeft: "3px solid #16a34a"
      },
      dockerItemOffline: {
        borderLeft: "3px solid #dc2626"
      },
      dockerItemInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "2px"
      },
      dockerItemName: {
        fontSize: "13px",
        fontWeight: 500,
        color: "#1f2937"
      },
      dockerItemId: {
        fontSize: "11px",
        color: "#6b7280",
        fontFamily: "monospace"
      },
      onlineIndicator: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontWeight: 500
      },
      onlineDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: "#16a34a"
      },
      offlineDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: "#dc2626"
      },
      onlineText: {
        color: "#16a34a"
      },
      offlineText: {
        color: "#dc2626"
      },
      summaryCard: {
        padding: "12px 16px",
        backgroundColor: "#f9fafb",
        borderBottom: "1px solid #e5e7eb"
      },
      summaryText: {
        fontSize: "12px",
        color: "#6b7280"
      },
      summaryNumber: {
        fontSize: "18px",
        fontWeight: 600,
        color: "#1f2937"
      }
    };
    React.useEffect(() => {
      const serviceUrl = config?.aosServiceUrl || config?.runtimeUrl || "https://kit.digitalauto.tech";
      const service = new AosService(serviceUrl, selectedInstance || "AET-ORCHESTRATOR");
      aosServiceRef.current = service;
      const stageLabels = {
        init: "Init",
        config: "Config",
        proto: "Proto",
        compile: "Compile",
        bundle: "Bundle",
        sign: "Sign",
        upload: "Publish",
        error: "Error"
      };
      service.onBuildProgress((message) => {
        const label = stageLabels[message.stage] || message.stage || "Build";
        addLog(`[${label}] ${message.message || JSON.stringify(message)}`);
        if (message.progress !== void 0 && message.progress >= 0) {
          setBuildStatus(`${label}... ${message.progress}%`);
        }
      });
      service.onDeployStatus((message) => {
        if (message.type === "aos_build_deploy" && message.message && message.message.includes("\n")) {
          message.message.split("\n").filter((l) => l.trim()).forEach((line) => addLog(line));
        } else {
          addLog(`[Deploy] ${message.message || JSON.stringify(message)}`);
        }
        if (message.status === "success") {
          setBuildStatus("Build completed successfully!");
          setIsBuilding(false);
          localStorage.removeItem("aos_build_id");
          refreshApps();
        } else if (message.status === "error") {
          setBuildStatus("Build failed");
          setIsBuilding(false);
          localStorage.removeItem("aos_build_id");
        }
      });
      service.onConsoleOutput((message) => {
        addLog(`[${message.appId}] ${message.message}`);
      });
      service.onAppStatus((message) => {
        handleDockerStatusUpdate(message);
      });
      setConnectionStatus("connecting");
      service.connect().then(() => {
        setConnectionStatus("connected");
        refreshApps();
        startDockerPolling();
        const pendingBuildId = localStorage.getItem("aos_build_id");
        if (pendingBuildId && service) {
          addLog(`[Build] Recovering build ${pendingBuildId}...`);
          setIsBuilding(true);
          setBuildStatus("Recovering build status...");
          service.getBuildStatus(pendingBuildId).then((res) => {
            if (res.build && res.build.logs) {
              const stageLabels2 = {
                init: "Init",
                config: "Config",
                proto: "Proto",
                compile: "Compile",
                bundle: "Bundle",
                sign: "Sign",
                upload: "Publish",
                error: "Error"
              };
              res.build.logs.forEach((entry) => {
                const label = stageLabels2[entry.stage] || entry.stage || "Build";
                addLog(`[${label}] ${entry.message}`);
              });
              if (res.build.status === "success") {
                setBuildStatus("Build completed successfully!");
                setIsBuilding(false);
                localStorage.removeItem("aos_build_id");
              } else if (res.build.status === "error") {
                setBuildStatus("Build failed");
                setIsBuilding(false);
                localStorage.removeItem("aos_build_id");
              } else {
                setBuildStatus("Build still in progress...");
              }
            } else {
              addLog(`[Build] Build ${pendingBuildId} not found on server`);
              setIsBuilding(false);
              localStorage.removeItem("aos_build_id");
            }
          }).catch(() => {
            setIsBuilding(false);
            localStorage.removeItem("aos_build_id");
          });
        }
        setTimeout(async () => {
          await checkCertificate();
          await fetchAosCloudServices();
        }, 500);
      }).catch((err) => {
        console.error("[AOS] Connection failed:", err);
        setConnectionStatus("disconnected");
        addLog(`[Error] Failed to connect: ${err.message}`);
      });
      return () => {
        stopDockerPolling();
        service.disconnect();
      };
    }, [config?.aosServiceUrl, config?.runtimeUrl, selectedInstance]);
    React.useEffect(() => {
      if (buildLogsRef.current) {
        buildLogsRef.current.scrollTop = buildLogsRef.current.scrollHeight;
      }
    }, [buildLogs]);
    const startDockerPolling = () => {
      fetchDockerInstances();
      pollingIntervalRef.current = setInterval(() => {
        fetchDockerInstances();
      }, 1e4);
    };
    const stopDockerPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    const fetchDockerInstances = async () => {
      const orchestratorId = "AET-ORCHESTRATOR";
      const orchestratorInst = {
        instance_id: orchestratorId,
        name: "AOS Edge Toolchain",
        online: true,
        last_seen: (/* @__PURE__ */ new Date()).toISOString(),
        type: "aos-edge-toolchain",
        suffix: "AET"
      };
      setDockerInstances([orchestratorInst]);
      if (!selectedInstance) {
        setSelectedInstance(orchestratorId);
      }
    };
    const handleDockerStatusUpdate = (message) => {
      if (message.type === "docker_status" || message.instance_id) {
        setDockerInstances((prev) => {
          const updated = [...prev];
          const index = updated.findIndex((d) => d.instance_id === message.instance_id);
          if (index >= 0) {
            updated[index] = {
              ...updated[index],
              online: message.online !== void 0 ? message.online : updated[index].online,
              last_seen: message.last_seen || (/* @__PURE__ */ new Date()).toISOString()
            };
          } else {
            updated.push({
              instance_id: message.instance_id,
              name: message.name || "AOS Toolchain",
              online: message.online !== false,
              suffix: message.suffix || "AET"
            });
          }
          return updated;
        });
      }
    };
    const addLog = (message) => {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      setBuildLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    };
    const refreshApps = async () => {
      if (!aosServiceRef.current)
        return;
      try {
        const result = await aosServiceRef.current.getDeployedApps();
        setDeployedApps(result.applications);
      } catch (err) {
        console.error("[AOS] Failed to get apps:", err);
      }
    };
    const fetchDeploymentStatus = async () => {
      if (!aosServiceRef.current)
        return;
      setIsLoadingStatus(true);
      setStatusError("");
      try {
        const result = await aosServiceRef.current.getDeploymentStatus(selectedServiceUuid, selectedUnitUid, selectedSubjectId);
        setDeploymentStatus(result);
        addLog("[Status] Deployment status refreshed");
      } catch (err) {
        setStatusError(err.message || "Failed to fetch deployment status");
        console.error("[AOS] Failed to get deployment status:", err);
      } finally {
        setIsLoadingStatus(false);
      }
    };
    const checkCertificate = async () => {
      if (!aosServiceRef.current)
        return;
      try {
        const result = await aosServiceRef.current.checkCertificate();
        setCertStatus({
          loaded: result.certLoaded,
          source: result.source || "none",
          size: result.certSize,
          message: result.message,
          identity: result.identity ?? null
        });
        if (result.worker) {
          setWorkerInfo(result.worker);
        }
        setCertError("");
      } catch (err) {
        setCertError(err.message || "Failed to check certificate");
      }
    };
    const fetchAosCloudServices = async () => {
      if (!aosServiceRef.current)
        return;
      setIsLoadingAosCloud(true);
      try {
        const res = await aosServiceRef.current.listServices();
        if (res.status === "success") {
          const items = res.items || [];
          setAosServices(items);
          if (!selectedServiceUuid && res.defaults?.serviceUuid) {
            setSelectedServiceUuid(res.defaults.serviceUuid);
            const svc = items.find((s) => s.uuid === res.defaults.serviceUuid);
            if (svc?.codename)
              setSelectedServiceCodename(svc.codename);
            loadServiceDetails(res.defaults.serviceUuid);
          } else if (!selectedServiceUuid && items.length) {
            setSelectedServiceUuid(items[0].uuid);
            if (items[0].codename)
              setSelectedServiceCodename(items[0].codename);
            loadServiceDetails(items[0].uuid);
          }
          addLog(`[AosCloud] Loaded ${items.length} services`);
        }
        try {
          const alertRes = await aosServiceRef.current.getAlerts();
          if (alertRes.status === "success")
            setAlerts(alertRes.alerts || []);
        } catch (e) {
        }
      } catch (err) {
        if (!err.message?.includes("Not connected")) {
          addLog(`[AosCloud] Failed to load services: ${err.message}`);
        }
      } finally {
        setIsLoadingAosCloud(false);
      }
    };
    const loadServiceDetails = async (uuid) => {
      if (!aosServiceRef.current || !uuid)
        return;
      try {
        const [versRes, unitsRes] = await Promise.all([
          aosServiceRef.current.getServiceVersions(uuid),
          aosServiceRef.current.getServiceUnits(uuid).catch(() => ({ status: "error", units: [] }))
        ]);
        if (versRes.status === "success") {
          const sorted = (versRes.versions || []).sort((a, b) => {
            const pa = (a.version || "").split(".").map(Number);
            const pb = (b.version || "").split(".").map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
              const diff = (pb[i] || 0) - (pa[i] || 0);
              if (diff !== 0)
                return diff;
            }
            return 0;
          });
          setServiceVersions(sorted);
          setServiceName(versRes.serviceName || "");
          if (autoIncVersion && sorted.length > 0) {
            const latest = sorted[0].version;
            const parts2 = latest.split(".");
            parts2[parts2.length - 1] = String(Number(parts2[parts2.length - 1]) + 1);
            const next = parts2.join(".");
            if (languageMode === "python") {
              setPythonCode((prev) => prev.replace(/VERSION\s*=\s*"[^"]+"/, `VERSION = "${next}"`));
            } else {
              setCppCode((prev) => prev.replace(/#define\s+VERSION\s+"[^"]+"/, `#define VERSION "${next}"`));
            }
            setYamlConfig((prev) => prev.replace(/version:\s*"[^"]+"/, `version: "${next}"`));
            addLog(`[Version] Next: ${latest} \u2192 ${next}`);
          }
        }
        if (unitsRes.status === "success") {
          setServiceUnits(unitsRes.units || []);
          if (unitsRes.units?.length) {
            const firstUid = unitsRes.units[0].uid;
            setSelectedMonitorUnit(firstUid);
            setSelectedUnitUid(firstUid);
            loadUnitMonitoring(firstUid);
            loadUnitInfo(firstUid);
          }
        }
        if (!selectedSubjectId && aosServiceRef.current) {
          try {
            const subRes = await aosServiceRef.current.listSubjects();
            if (subRes.status === "success" && subRes.items?.length) {
              setSelectedSubjectId(subRes.items[0].id);
            }
          } catch (e) {
          }
        }
      } catch (err) {
        addLog(`[AosCloud] Failed to load service details: ${err.message}`);
      }
    };
    const handleServiceChange = (uuid) => {
      setSelectedServiceUuid(uuid);
      setServiceUnits([]);
      setServiceVersions([]);
      setUnitMonitoring(null);
      setShowAllUnits(false);
      const svc = aosServices.find((s) => s.uuid === uuid);
      const codename = svc?.codename || "";
      setSelectedServiceCodename(codename);
      if (uuid && autoSyncServiceUid) {
        setYamlConfig((prev) => {
          let next = prev;
          let synced = false;
          const isUuidLike = (s) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
          if (codename && !isUuidLike(codename)) {
            if (/(\s+)id:\s*["']?[a-f0-9-]+["']?/i.test(next)) {
              next = next.replace(/(\s+)id:\s*["']?[a-f0-9-]+["']?/i, `$1codename: "${codename}"`);
              synced = true;
            }
            if (/service_uid:\s*["']?[a-f0-9-]+["']?/i.test(next)) {
              next = next.replace(/service_uid:\s*["']?[a-f0-9-]+["']?/i, `codename: "${codename}"`);
              synced = true;
            }
            const currentCodenameMatch = next.match(/codename:\s*["']?([^"'\n]+)["']?/);
            if (currentCodenameMatch) {
              const currentCodename = currentCodenameMatch[1];
              if (!currentCodename || isUuidLike(currentCodename)) {
                next = next.replace(/codename:\s*["']?[^"'\n]+["']?/, `codename: "${codename}"`);
                synced = true;
              }
            }
          } else if (!codename) {
            if (/(\s+)id:\s*["']?[a-f0-9-]+["']?/i.test(next)) {
              next = next.replace(/(\s+)id:\s*["']?[a-f0-9-]+["']?/i, `$1id: ${uuid}`);
              synced = true;
            }
            if (/service_uid:\s*["']?[a-f0-9-]+["']?/i.test(next)) {
              next = next.replace(/service_uid:\s*["']?[a-f0-9-]+["']?/i, `service_uid: ${uuid}`);
              synced = true;
            }
          }
          if (synced) {
            addLog(`[Config] Auto-synced codename: ${codename || uuid}`);
          } else {
            addLog(`[Config] No id, service_uid, or codename field found in config.yaml \u2014 not synced`);
          }
          return next;
        });
      }
      if (uuid)
        loadServiceDetails(uuid);
    };
    const loadUnitMonitoring = async (uid) => {
      if (!aosServiceRef.current || !uid)
        return;
      setSelectedMonitorUnit(uid);
      try {
        const res = await aosServiceRef.current.getUnitMonitoring(uid);
        if (res.status === "success")
          setUnitMonitoring(res);
        else
          setUnitMonitoring({ status: "error", message: res.message || "Unavailable" });
      } catch (err) {
        setUnitMonitoring({ status: "error", message: err.message || "Unavailable" });
      }
    };
    const loadUnitInfo = async (uid) => {
      if (!aosServiceRef.current || !uid)
        return;
      try {
        const res = await aosServiceRef.current.getUnitInfo(uid);
        if (res.status === "success") {
          setUnitInfo({
            name: res.name,
            onlineStatus: res.onlineStatus,
            versions: res.versions,
            nodeCount: res.nodeCount
          });
          const verParts = res.versions && Object.keys(res.versions).length > 0 ? Object.entries(res.versions).map(([k, v]) => `${k}=${v}`).join(", ") : "no version fields";
          addLog(`[Unit] ${res.name || uid}: ${verParts}, ${res.nodeCount} node(s), ${res.onlineStatus}`);
          if (res._rawKeys) {
            addLog(`[Unit] API response keys: ${res._rawKeys.join(", ")}`);
          }
        }
      } catch (err) {
      }
    };
    const requestServiceLog = async () => {
      if (!aosServiceRef.current || !selectedServiceUuid || !selectedMonitorUnit)
        return;
      setIsRequestingLog(true);
      try {
        const unit = serviceUnits.find((u) => u.uid === selectedMonitorUnit);
        const unitDetail = await aosServiceRef.current.sendCommand("aos_list_subjects", {});
        const subjectId = unitDetail.items?.[0]?.id || "";
        if (!subjectId) {
          addLog("[Logs] No subject found");
          setIsRequestingLog(false);
          return;
        }
        const res = await aosServiceRef.current.requestServiceLog(selectedServiceUuid, selectedMonitorUnit, subjectId, 60);
        if (res.status === "success") {
          addLog(`[Logs] Log request created (${res.requests?.length || 0} entries)`);
          setTimeout(refreshServiceLogs, 5e3);
        } else {
          addLog(`[Logs] Request failed: ${res.message}`);
        }
      } catch (err) {
        addLog(`[Logs] Error: ${err.message}`);
      } finally {
        setIsRequestingLog(false);
      }
    };
    const refreshServiceLogs = async () => {
      if (!aosServiceRef.current)
        return;
      try {
        const res = await aosServiceRef.current.getServiceLogStatus();
        if (res.status === "success")
          setServiceLogs(res.logs || []);
      } catch (e) {
      }
    };
    const runAosSetupAutomation = async () => {
      if (!aosServiceRef.current)
        return;
      const units = showAllUnits ? allUnits : serviceUnits;
      const unit = units.find((u) => u.uid === selectedMonitorUnit);
      const systemUid = unit?.systemUid || "";
      if (!systemUid) {
        addLog("[Automation] Select a unit first");
        return;
      }
      setIsRunningAutomation(true);
      setAutomationResult(null);
      addLog(`[Automation] Starting AosEdge setup for unit ${systemUid}...`);
      try {
        const res = await aosServiceRef.current.runAosAutomation(systemUid);
        for (const step of res.steps || [])
          addLog(`[Automation] ${step}`);
        if (res.status === "success") {
          setAutomationResult({ status: "success", message: res.message, dashboardUrl: res.dashboardUrl });
          addLog("[Automation] Completed successfully");
        } else {
          setAutomationResult({ status: "error", message: res.message || "Automation failed" });
          addLog(`[Automation] Failed: ${res.message}`);
        }
      } catch (err) {
        setAutomationResult({ status: "error", message: err.message || "Automation failed" });
        addLog(`[Automation] Error: ${err.message}`);
      } finally {
        setIsRunningAutomation(false);
      }
    };
    const [workerInfo, setWorkerInfo] = React.useState(null);
    const [toolchainVersions, setToolchainVersions] = React.useState(null);
    const [showAllUnits, setShowAllUnits] = React.useState(false);
    const [allUnits, setAllUnits] = React.useState([]);
    const [unitInfo, setUnitInfo] = React.useState(null);
    const handleCertUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file || !aosServiceRef.current)
        return;
      setIsUploadingCert(true);
      setCertError("");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const result = await aosServiceRef.current.uploadCertificate(base64);
        if (result.status === "success") {
          addLog(`[Cert] Certificate uploaded: ${result.message}`);
          setCertStatus({
            loaded: true,
            source: "manual",
            size: file.size,
            message: result.message,
            identity: result.identity ?? null
          });
          if (result.identity?.cn) {
            addLog(`[Cert] Identity: CN=${result.identity.cn}, expires ${result.identity.notAfter || "?"}`);
          }
          if (result.worker) {
            setWorkerInfo(result.worker);
            addLog(`[Worker] Dedicated environment ready on port ${result.worker.port}`);
          }
          try {
            const tcInfo = await aosServiceRef.current.getToolchainInfo();
            if (tcInfo.status === "success" && tcInfo.packages) {
              setToolchainVersions(tcInfo.packages);
              addLog(`[Toolchain] aos-signer ${tcInfo.packages["aos-signer"] || "?"}, aos-keys ${tcInfo.packages["aos-keys"] || "?"}, aos-prov ${tcInfo.packages["aos-prov"] || "?"}`);
            }
          } catch (tcErr) {
            addLog(`[Toolchain] Version check skipped: ${tcErr.message}`);
          }
          addLog(`[AosCloud] Refreshing services...`);
          fetchAosCloudServices();
        } else {
          setCertError(result.message || "Upload failed");
        }
      } catch (err) {
        setCertError(err.message || "Upload failed");
        addLog(`[Cert] Upload failed: ${err.message}`);
      } finally {
        setIsUploadingCert(false);
        e.target.value = "";
      }
    };
    const handleCertRemove = async () => {
      if (!aosServiceRef.current)
        return;
      if (typeof window !== "undefined" && !window.confirm("Remove your certificate and shut down your build environment? Other users will not be affected.")) {
        return;
      }
      setIsRemovingCert(true);
      setCertError("");
      try {
        const result = await aosServiceRef.current.removeCertificate();
        if (result.status === "success") {
          addLog(`[Cert] ${result.message}`);
          setCertStatus({ loaded: false, source: "none", message: result.message, identity: null });
          setWorkerInfo(null);
          setToolchainVersions(null);
        } else {
          setCertError(result.message || "Remove failed");
        }
      } catch (err) {
        setCertError(err.message || "Remove failed");
        addLog(`[Cert] Remove failed: ${err.message}`);
      } finally {
        setIsRemovingCert(false);
      }
    };
    const handleBuildDeploy = async () => {
      if (!aosServiceRef.current || !aosServiceRef.current.isServiceConnected()) {
        addLog("[Error] Not connected to AOS service");
        return;
      }
      setBuildLogs([]);
      let finalCode = languageMode === "python" ? pythonCodeRef.current : cppCodeRef.current;
      let finalYaml = yamlConfigRef.current;
      setIsBuilding(true);
      setBuildStatus("Starting build...");
      addLog(`[Build] Target: ${selectedInstance}`);
      addLog(`[Build] Starting AOS ${languageMode === "python" ? "Python" : "C++"} application build...`);
      const stageLabels = {
        init: "Init",
        config: "Config",
        proto: "Proto",
        compile: "Compile",
        bundle: "Bundle",
        sign: "Sign",
        upload: "Publish",
        error: "Error"
      };
      let activeExecutionId;
      try {
        const response = await aosServiceRef.current.buildAndDeploy({
          language: languageMode,
          cppCode: languageMode === "cpp" ? finalCode : void 0,
          pythonCode: languageMode === "python" ? finalCode : void 0,
          yamlConfig: finalYaml
        });
        if (response.executionId) {
          activeExecutionId = response.executionId;
          localStorage.setItem("aos_build_id", response.executionId);
        }
        if (response.message && response.message.includes("\n")) {
          const lines = response.message.split("\n").filter((l) => l.trim());
          for (let i = 0; i < lines.length; i++) {
            addLog(lines[i]);
            setBuildStatus(`${lines[i].split("]")[1]?.trim().slice(0, 40) || "Building..."}`);
            if (i < lines.length - 1) {
              await new Promise((r) => setTimeout(r, 300));
            }
          }
        } else {
          addLog(`[Build] ${response.message || JSON.stringify(response)}`);
        }
        if (response.status === "success") {
          setBuildStatus("Build completed successfully!");
          setIsBuilding(false);
          localStorage.removeItem("aos_build_id");
          refreshApps();
          if (selectedServiceUuid) {
            setTimeout(() => {
              loadServiceDetails(selectedServiceUuid);
              addLog("[AosCloud] Refreshed service versions and units");
            }, 1e3);
          }
        } else if (response.status === "error") {
          const lastLog = (response.message || "").split("\n").filter((l) => l.trim()).pop() || "Unknown error";
          setBuildStatus(`Build failed: ${lastLog.replace(/^\[.*?\]\s*/, "").slice(0, 80)}`);
          setIsBuilding(false);
          localStorage.removeItem("aos_build_id");
        } else {
          setBuildStatus("Build completed");
          setIsBuilding(false);
          localStorage.removeItem("aos_build_id");
        }
      } catch (err) {
        const msg = err.message || "Unknown error";
        if (msg.includes("\n")) {
          msg.split("\n").filter((l) => l.trim()).forEach((line) => addLog(line));
        } else {
          addLog(`[Error] ${msg}`);
        }
        if (msg.includes("timeout") || msg.includes("Timeout")) {
          addLog("[Build] Request timed out \u2014 the build may still be running. Checking status...");
          setBuildStatus("Build timed out \u2014 checking if build is still running...");
          try {
            const statusRes = await aosServiceRef.current.getBuildStatus(activeExecutionId);
            const build = statusRes.build || (statusRes.builds && statusRes.builds.length > 0 ? statusRes.builds[statusRes.builds.length - 1] : null);
            if (build) {
              if (build.status === "success") {
                addLog("[Build] Build completed successfully on the server!");
                setBuildStatus("Build completed successfully!");
                setIsBuilding(false);
                localStorage.removeItem("aos_build_id");
                refreshApps();
                if (selectedServiceUuid) {
                  setTimeout(() => {
                    loadServiceDetails(selectedServiceUuid);
                    addLog("[AosCloud] Refreshed service versions and units");
                  }, 1e3);
                }
                return;
              } else if (build.status === "building" || build.status === "running") {
                addLog("[Build] Build is still in progress on the server. It will complete shortly.");
                setBuildStatus("Build still running on server \u2014 check back soon");
                localStorage.removeItem("aos_build_id");
                return;
              } else if (build.status === "error") {
                addLog(`[Build] Build failed on server: ${build.message || "Unknown error"}`);
                setBuildStatus("Build failed on server");
              } else {
                addLog(`[Build] Unexpected build status: ${build.status}`);
                setBuildStatus(`Build status: ${build.status}`);
              }
            } else {
              addLog("[Build] No build status available \u2014 the build may not have started.");
              setBuildStatus("Build timed out \u2014 no status available");
            }
          } catch (statusErr) {
            addLog(`[Build] Could not check build status: ${statusErr.message}`);
            setBuildStatus("Build timed out \u2014 could not check status");
          }
          setIsBuilding(false);
          localStorage.removeItem("aos_build_id");
          return;
        }
        const lastLine = msg.split("\n").filter((l) => l.trim()).pop() || msg;
        let statusText = `Build failed: ${lastLine.replace(/^\[.*?\]\s*/, "").slice(0, 80)}`;
        if (msg.includes("re-upload")) {
          statusText += " \u2192 Go to Setup panel and upload your .p12 again";
        } else if (msg.includes("No certificate uploaded")) {
          statusText += " \u2192 Go to Setup panel and upload your .p12 first";
        }
        setBuildStatus(statusText);
        setIsBuilding(false);
      }
    };
    const handleStartApp = async (appId) => {
      if (!aosServiceRef.current)
        return;
      addLog(`[Action] Starting app: ${appId}`);
      try {
        await aosServiceRef.current.startApp(appId);
        addLog(`[Action] App started: ${appId}`);
        refreshApps();
      } catch (err) {
        addLog(`[Error] Failed to start app: ${err.message}`);
      }
    };
    const handleStopApp = async (appId) => {
      if (!aosServiceRef.current)
        return;
      addLog(`[Action] Stopping app: ${appId}`);
      try {
        await aosServiceRef.current.stopApp(appId);
        addLog(`[Action] App stopped: ${appId}`);
        refreshApps();
      } catch (err) {
        addLog(`[Error] Failed to stop app: ${err.message}`);
      }
    };
    const switchLanguage = (lang) => {
      if (lang === languageMode)
        return;
      setLanguageMode(lang);
      if (lang === "cpp") {
        const preset = PRESETS.helloAos;
        if (preset) {
          setCppCode(preset.cpp || "");
          setYamlConfig(preset.yaml || "");
          setAppName(preset.appName || "hello-aos");
          setActiveEditorTab("cpp");
          setSelectedPreset("helloAos");
        }
      } else {
        const preset = PRESETS.helloPython;
        if (preset) {
          setPythonCode(preset.python || "");
          setYamlConfig(preset.yaml || "");
          setAppName(preset.appName || "hello-world-python");
          setActiveEditorTab("python");
          setSelectedPreset("helloPython");
        }
      }
    };
    const handlePresetChange = (presetName) => {
      setSelectedPreset(presetName);
      const preset = PRESETS[presetName];
      if (preset) {
        const isPython = preset.language === "python" || !!preset.python;
        let code = isPython ? preset.python : preset.cpp;
        let yaml = preset.yaml;
        if (isPython) {
          setLanguageMode("python");
          setActiveEditorTab("python");
        } else {
          setLanguageMode("cpp");
          setActiveEditorTab("cpp");
        }
        if (autoIncVersion && serviceVersions.length > 0) {
          const latest = serviceVersions[0].version;
          const parts2 = latest.split(".");
          parts2[parts2.length - 1] = String(Number(parts2[parts2.length - 1]) + 1);
          const next = parts2.join(".");
          if (isPython) {
            code = code.replace(/VERSION\s*=\s*"[^"]+"/, `VERSION = "${next}"`);
          } else {
            code = code.replace(/#define\s+VERSION\s+"[^"]+"/, `#define VERSION "${next}"`);
          }
          yaml = yaml.replace(/version:\s*"[^"]+"/, `version: "${next}"`);
          addLog(`[Preset] Loaded: ${preset.name || presetName} (version: ${next})`);
        } else {
          addLog(`[Preset] Loaded: ${preset.name || presetName}`);
        }
        if (isPython) {
          setPythonCode(code);
        } else {
          setCppCode(code);
        }
        setYamlConfig(yaml);
        setAppName(preset.appName || presetName);
      }
    };
    const getStatusBadgeStyle = (status) => {
      switch (status) {
        case "running":
          return styles.statusRunning;
        case "deployed":
          return styles.statusDeployed;
        case "building":
          return styles.statusBuilding;
        case "stopped":
          return styles.statusStopped;
        case "error":
          return styles.statusError;
        default:
          return styles.statusStopped;
      }
    };
    const getStatusClass = (status) => {
      switch (status) {
        case "running":
          return "status-running";
        case "deployed":
          return "status-deployed";
        case "building":
          return "status-building";
        case "stopped":
          return "status-stopped";
        case "error":
          return "status-error";
        default:
          return "status-stopped";
      }
    };
    if (!data?.prototype?.name) {
      return React.createElement(
        "div",
        { style: styles.page },
        React.createElement(
          "div",
          { style: styles.emptyState },
          React.createElement("div", { style: styles.emptyIcon }, "\u{1F4E6}"),
          React.createElement("h2", { style: { margin: "0 0 8px 0", fontSize: "18px", fontWeight: 600, color: "#1f2937" } }, "AOS Cloud Deployment"),
          React.createElement("p", { style: styles.emptyText }, 'This plugin is available inside a Prototype. Go to Prototype Library, open a prototype, and select the "aos-cloud" tab.')
        )
      );
    }
    return React.createElement(
      "div",
      { style: styles.page },
      // Global keyframes for build-progress animations. Injected once; the GPU
      // handles painting on the compositor thread, so there is no JS cost while
      // animations run.
      React.createElement(
        "style",
        null,
        "@keyframes aos-spin { to { transform: rotate(360deg); } }@keyframes aos-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }@keyframes aos-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }"
      ),
      // Quick Guide Overlay
      showGuide && React.createElement(
        "div",
        {
          style: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1e3,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          },
          onClick: () => setShowGuide(false)
        },
        React.createElement(
          "div",
          {
            style: {
              backgroundColor: "white",
              borderRadius: "12px",
              maxWidth: "640px",
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
            },
            onClick: (e) => e.stopPropagation()
          },
          React.createElement(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" } },
            React.createElement("h2", { style: { margin: 0, fontSize: "18px", fontWeight: 600 } }, "\u{1F4D6} Quick Setup Guide"),
            React.createElement("button", {
              onClick: () => setShowGuide(false),
              style: { border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }
            }, "\u2715")
          ),
          React.createElement(
            "div",
            { style: { fontSize: "13px", lineHeight: 1.8, color: "#374151" } },
            React.createElement("h3", { style: { fontSize: "14px", marginTop: 0, marginBottom: "8px" } }, "1. Upload your certificate"),
            React.createElement(
              "p",
              { style: { color: "#6b7280", marginBottom: "16px" } },
              "Click ",
              React.createElement("strong", null, "Choose File"),
              " in the Setup card and select your .p12 certificate. ",
              "The orchestrator extracts your identity (CN) and creates a dedicated, isolated build environment just for you. ",
              "Once loaded, the Certificate card shows your CN, toolchain versions (aos-signer, aos-keys, aos-prov), and unit info when a unit is selected. ",
              "If your worker becomes unresponsive, Remove and re-upload the certificate to get a fresh environment."
            ),
            React.createElement("h3", { style: { fontSize: "14px", marginBottom: "8px" } }, "2. Choose an AosCloud Service"),
            React.createElement(
              "p",
              { style: { color: "#6b7280", marginBottom: "16px" } },
              "Pick a service from the AosCloud Service dropdown. The service\u2019s codename is synced into ",
              React.createElement("code", null, "config.yaml"),
              ". ",
              "Version pills show deployed versions; enable ",
              React.createElement("strong", null, "Auto-increment version"),
              " to bump the patch number after each build."
            ),
            React.createElement("h3", { style: { fontSize: "14px", marginBottom: "8px" } }, "3. Edit your code"),
            React.createElement(
              "p",
              { style: { color: "#6b7280", marginBottom: "4px" } },
              "Use the preset dropdown in the header to load a starting point, then edit:"
            ),
            React.createElement(
              "ul",
              { style: { color: "#6b7280", marginBottom: "16px", paddingLeft: "20px" } },
              React.createElement("li", null, React.createElement("strong", null, "main.py"), " \u2014 your Python application"),
              React.createElement("li", null, React.createElement("strong", null, "config.yaml"), " \u2014 service metadata: codename, version, quotas, entry point")
            ),
            React.createElement("h3", { style: { fontSize: "14px", marginBottom: "8px" } }, "4. Build & Deploy"),
            React.createElement(
              "p",
              { style: { color: "#6b7280", marginBottom: "16px" } },
              "Click ",
              React.createElement("strong", null, "Build & Deploy"),
              ". Your code is packaged, signed with your certificate, and uploaded to AosCloud. ",
              "The target unit picks up the new version via OTA. Watch the Build Log for live progress."
            ),
            React.createElement("h3", { style: { fontSize: "14px", marginBottom: "8px" } }, "5. Inspect units"),
            React.createElement(
              "p",
              { style: { color: "#6b7280", marginBottom: "16px" } },
              "The Units card shows units assigned to the selected service. Toggle ",
              React.createElement("strong", null, "All units"),
              " to see every unit. ",
              "Click any unit row to open a detail overlay with hardware specs, live CPU/RAM/disk, and alerts. ",
              React.createElement("em", null, "Note: "),
              'monitoring requires the unit\u2019s OEM account; units from other accounts show "Hardware monitoring not available".'
            ),
            React.createElement("h3", { style: { fontSize: "14px", marginBottom: "8px" } }, "Available Presets"),
            React.createElement(
              "ul",
              { style: { color: "#6b7280", paddingLeft: "20px", marginBottom: 0 } },
              React.createElement("li", null, React.createElement("strong", null, "Hello Python"), " \u2014 simple Python hello world"),
              React.createElement("li", null, React.createElement("strong", null, "Seat ECU"), " \u2014 seat heating/cooling control via Zenoh + Kuksa"),
              React.createElement("li", null, React.createElement("strong", null, "HVAC ECU"), " \u2014 HVAC fan-speed control via Zenoh + Kuksa"),
              React.createElement("li", null, React.createElement("strong", null, "BMS"), " \u2014 battery monitoring (voltage, current, SoC) via Zenoh + Kuksa"),
              React.createElement("li", null, React.createElement("strong", null, "Range AI"), " \u2014 range computation from battery + cabin signals")
            )
          )
        )
      ),
      // Unit Detail Overlay — opens when user clicks a unit row in the Units
      // card. Shows that unit's monitoring + alerts in a focused, scrollable
      // modal. Closes on backdrop click or ✕ Close button. The Clear button
      // empties the alert list (does NOT close the alerts area).
      detailUnitUid && React.createElement(
        "div",
        {
          onClick: () => setDetailUnitUid(null),
          style: {
            position: "fixed",
            inset: 0,
            zIndex: 1e3,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }
        },
        React.createElement(
          "div",
          {
            onClick: (e) => e.stopPropagation(),
            style: {
              backgroundColor: "white",
              borderRadius: "12px",
              width: "640px",
              maxWidth: "95vw",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              overflow: "hidden"
            }
          },
          // Modal header
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
                padding: "14px 18px",
                borderBottom: "1px solid #e5e7eb",
                flexShrink: 0
              }
            },
            (() => {
              const u = serviceUnits.find((x) => x.uid === detailUnitUid);
              const displayUid = u?.systemUid || detailUnitUid || "";
              const shortUid = displayUid.length > 12 ? displayUid.substring(0, 8) + "\u2026" : displayUid;
              const chip = (bg, fg, text, title) => React.createElement("span", {
                title,
                style: {
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  backgroundColor: bg,
                  color: fg,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }
              }, text);
              return React.createElement(
                "div",
                { style: { display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 } },
                React.createElement(Icon, { name: "server", size: 22, color: "#6366f1", style: { marginTop: "2px" } }),
                React.createElement(
                  "div",
                  { style: { minWidth: 0, flex: 1 } },
                  React.createElement("div", { style: { fontSize: "14px", fontWeight: 600, color: "#1f2937", wordBreak: "break-word" } }, u?.name || "Unit"),
                  React.createElement(
                    "div",
                    {
                      style: { display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }
                    },
                    // Short UID + copy
                    React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: "11px",
                          fontFamily: "monospace",
                          backgroundColor: "#f3f4f6",
                          color: "#374151",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        },
                        title: displayUid
                      },
                      shortUid,
                      React.createElement("button", {
                        onClick: () => {
                          if (displayUid) {
                            navigator.clipboard.writeText(displayUid);
                            addLog(`[Copied] Unit UID: ${displayUid}`);
                          }
                        },
                        style: { border: "none", background: "transparent", cursor: "pointer", fontSize: "11px", padding: 0 },
                        title: "Copy full UID"
                      }, "\u{1F4CB}")
                    ),
                    u?.version && chip("#dbeafe", "#1d4ed8", `v${u.version}`),
                    u && chip(u.online ? "#dcfce7" : "#fee2e2", u.online ? "#16a34a" : "#dc2626", u.online ? "\u25CFOnline" : "\u25CFOffline")
                  )
                )
              );
            })(),
            React.createElement(
              "button",
              {
                onClick: () => setDetailUnitUid(null),
                style: { border: "none", background: "none", fontSize: "14px", cursor: "pointer", color: "#6b7280", padding: "4px 8px", flexShrink: 0, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "4px" },
                title: "Close"
              },
              React.createElement(Icon, { name: "x", size: 14 }),
              "Close"
            )
          ),
          // Modal body — scrollable
          React.createElement(
            "div",
            {
              style: {
                padding: "14px 18px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "14px"
              }
            },
            // Monitoring section
            React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" } },
                React.createElement(
                  "div",
                  { style: { fontSize: "12px", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: "6px" } },
                  React.createElement(Icon, { name: "activity", size: 14, color: "#3b82f6" }),
                  "Resource Monitoring"
                ),
                React.createElement("button", {
                  onClick: () => {
                    loadUnitMonitoring(detailUnitUid);
                    loadUnitInfo(detailUnitUid);
                  },
                  style: { ...styles.iconButton, width: "22px", height: "22px", fontSize: "12px" },
                  title: "Refresh"
                }, "\u21BB")
              ),
              !unitMonitoring ? React.createElement("div", { style: { fontSize: "12px", color: "#6b7280", fontStyle: "italic" } }, "Loading\u2026") : unitMonitoring.status === "error" ? React.createElement(
                "div",
                { style: { fontSize: "12px", color: "#6b7280", fontStyle: "italic" } },
                unitMonitoring.message?.includes("forbidden") ? React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    { style: { fontWeight: 500, color: "#92400e", marginBottom: "4px" } },
                    "Hardware monitoring not available on this unit."
                  ),
                  React.createElement(
                    "div",
                    { style: { color: "#6b7280" } },
                    "AosCloud restricts CPU/RAM/disk metrics to the unit\u2019s OEM account. ",
                    "Your services are running fine here (see version above), but device-level monitoring belongs to whoever provisioned the unit."
                  )
                ) : unitMonitoring.message || "Unavailable"
              ) : (() => {
                const fmtBytes = (n) => {
                  if (!n)
                    return "0";
                  if (n < 1024)
                    return `${n} B`;
                  if (n < 1048576)
                    return `${(n / 1024).toFixed(0)} KB`;
                  if (n < 1073741824)
                    return `${(n / 1048576).toFixed(1)} MB`;
                  return `${(n / 1073741824).toFixed(2)} GB`;
                };
                const hw = unitMonitoring.hw || null;
                const ramUsed = unitMonitoring.ram?.used || 0;
                const ramTotal = unitMonitoring.ram?.total || 0;
                const cpuVal = unitMonitoring.cpu || 0;
                const numCpus = hw?.numCpus || 1;
                const coresBusy = cpuVal / 1e3;
                const cpuPctTotal = cpuVal / (numCpus * 1e3) * 100;
                const partitions = unitMonitoring.diskPartitions || [];
                return React.createElement(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: "10px" } },
                  // Hardware summary header
                  hw && React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: "11px",
                        color: "#6b7280",
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        padding: "6px 10px"
                      }
                    },
                    React.createElement(
                      "div",
                      { style: { display: "flex", gap: "6px", alignItems: "baseline", flexWrap: "wrap" } },
                      hw.cpuModel && React.createElement("span", { style: { color: "#374151", fontWeight: 500, wordBreak: "break-word" } }, hw.cpuModel),
                      hw.cpuModel && React.createElement("span", null, "\xB7"),
                      React.createElement("span", null, `${hw.numCores} core${hw.numCores === 1 ? "" : "s"}`),
                      hw.numThreads && hw.numThreads !== hw.numCores && React.createElement("span", null, ` / ${hw.numThreads} threads`),
                      hw.ramTotal > 0 && React.createElement("span", null, "\xB7"),
                      hw.ramTotal > 0 && React.createElement("span", null, `${fmtBytes(hw.ramTotal)} RAM`),
                      hw.nodeCount > 1 && React.createElement("span", null, "\xB7"),
                      hw.nodeCount > 1 && React.createElement("span", null, `${hw.nodeCount} nodes (showing node 0)`)
                    )
                  ),
                  // CPU
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      { style: { display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" } },
                      React.createElement("span", {
                        style: { color: "#6b7280" },
                        title: hw ? `${cpuVal} milli-CPU on a ${numCpus}-core node = ${coresBusy.toFixed(2)} cores busy` : "CPU value reported in milli-CPU; total core count unknown"
                      }, "CPU"),
                      React.createElement(
                        "span",
                        { style: { fontWeight: 500 } },
                        hw ? `${cpuPctTotal.toFixed(1)}% \xB7 ${coresBusy.toFixed(2)} / ${numCpus} cores` : `${coresBusy.toFixed(2)} cores busy (total unknown)`
                      )
                    ),
                    React.createElement(
                      "div",
                      { style: { height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px", overflow: "hidden" } },
                      React.createElement("div", { style: {
                        height: "100%",
                        width: `${Math.min(hw ? cpuPctTotal : coresBusy * 100 / 4, 100)}%`,
                        backgroundColor: cpuPctTotal > 80 ? "#dc2626" : cpuPctTotal > 50 ? "#d97706" : "#3b82f6",
                        borderRadius: "3px",
                        transition: "width 0.3s"
                      } })
                    )
                  ),
                  // RAM
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      { style: { display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" } },
                      React.createElement("span", { style: { color: "#6b7280" } }, "RAM"),
                      React.createElement(
                        "span",
                        { style: { fontWeight: 500 } },
                        ramTotal ? `${(ramUsed / ramTotal * 100).toFixed(1)}% \xB7 ${fmtBytes(ramUsed)} / ${fmtBytes(ramTotal)}` : ramUsed ? `${fmtBytes(ramUsed)} (total unknown)` : "\u2014"
                      )
                    ),
                    ramTotal > 0 && React.createElement(
                      "div",
                      { style: { height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px", overflow: "hidden" } },
                      React.createElement("div", { style: {
                        height: "100%",
                        width: `${Math.min(ramUsed / ramTotal * 100, 100)}%`,
                        backgroundColor: ramUsed / ramTotal > 0.85 ? "#dc2626" : ramUsed / ramTotal > 0.65 ? "#d97706" : "#8b5cf6",
                        borderRadius: "3px",
                        transition: "width 0.3s"
                      } })
                    )
                  ),
                  // Disk — per-partition rows
                  partitions.length > 0 && React.createElement(
                    "div",
                    null,
                    React.createElement("div", { style: { fontSize: "12px", color: "#6b7280", marginBottom: "4px" } }, "Disk"),
                    React.createElement(
                      "div",
                      { style: { display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "8px" } },
                      ...partitions.map((p) => {
                        const pct = p.total ? p.used / p.total * 100 : 0;
                        return React.createElement(
                          "div",
                          { key: p.name },
                          React.createElement(
                            "div",
                            { style: { display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px", color: "#6b7280" } },
                            React.createElement("span", { style: { fontFamily: "monospace" } }, p.name),
                            React.createElement(
                              "span",
                              { style: { fontWeight: 500, color: "#374151" } },
                              p.total ? `${pct.toFixed(1)}% \xB7 ${fmtBytes(p.used)} / ${fmtBytes(p.total)}` : p.used ? `${fmtBytes(p.used)} (total unknown)` : "\u2014"
                            )
                          ),
                          p.total > 0 && React.createElement(
                            "div",
                            { style: { height: "4px", backgroundColor: "#e5e7eb", borderRadius: "2px", overflow: "hidden" } },
                            React.createElement("div", { style: {
                              height: "100%",
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: pct > 85 ? "#dc2626" : pct > 65 ? "#d97706" : "#f59e0b",
                              borderRadius: "2px",
                              transition: "width 0.3s"
                            } })
                          )
                        );
                      })
                    )
                  )
                );
              })()
            ),
            // Alerts section
            React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" } },
                React.createElement(
                  "div",
                  { style: { fontSize: "12px", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: "6px" } },
                  React.createElement(Icon, { name: "triangle-alert", size: 14, color: "#d97706" }),
                  `Alerts (${alerts.length})`
                ),
                alerts.length > 0 && React.createElement(
                  "button",
                  {
                    onClick: () => {
                      setAlerts([]);
                      addLog("[Alerts] Cleared");
                    },
                    style: {
                      fontSize: "11px",
                      padding: "3px 10px",
                      cursor: "pointer",
                      border: "1px solid #fca5a5",
                      borderRadius: "4px",
                      background: "white",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    },
                    title: "Clear all alerts from the list"
                  },
                  React.createElement(Icon, { name: "trash", size: 12 }),
                  "Clear"
                )
              ),
              alerts.length === 0 ? React.createElement("div", { style: { fontSize: "12px", color: "#6b7280", fontStyle: "italic" } }, "No alerts") : React.createElement(
                "div",
                { style: { maxHeight: "220px", overflowY: "auto", border: "1px solid #f3f4f6", borderRadius: "6px" } },
                ...alerts.map(
                  (a, i) => React.createElement(
                    "div",
                    {
                      key: a.id || i,
                      style: { padding: "8px 10px", borderBottom: "1px solid #f3f4f6", fontSize: "11px" }
                    },
                    React.createElement("div", { style: { color: "#dc2626", fontWeight: 500 } }, a.tag || "Alert"),
                    React.createElement(
                      "div",
                      { style: { color: "#6b7280", marginTop: "2px" } },
                      typeof a.message === "string" ? a.message : JSON.stringify(a.message)
                    ),
                    a.timestamp && React.createElement("div", { style: { color: "#9ca3af", marginTop: "2px", fontSize: "10px" } }, a.timestamp)
                  )
                )
              )
            )
          )
        )
      ),
      // Header
      React.createElement(
        "header",
        { style: styles.header },
        React.createElement(
          "div",
          { style: styles.headerLeft },
          React.createElement("h1", { style: styles.title }, "AOS Cloud Deployment")
        ),
        React.createElement(
          "div",
          { style: styles.headerRight },
          // Language toggle — segmented pill
          React.createElement(
            "div",
            {
              style: {
                display: "inline-flex",
                borderRadius: "6px",
                overflow: "hidden",
                border: "1px solid #d1d5db",
                flexShrink: 0
              }
            },
            React.createElement("button", {
              onClick: () => switchLanguage("cpp"),
              style: {
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: languageMode === "cpp" ? "#3b82f6" : "white",
                color: languageMode === "cpp" ? "white" : "#6b7280",
                transition: "all 0.15s ease"
              }
            }, "C++"),
            React.createElement("button", {
              onClick: () => switchLanguage("python"),
              style: {
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: languageMode === "python" ? "#3b82f6" : "white",
                color: languageMode === "python" ? "white" : "#6b7280",
                transition: "all 0.15s ease"
              }
            }, "Python")
          ),
          React.createElement("button", {
            onClick: () => setShowGuide(!showGuide),
            style: {
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              border: "1px solid #e5e7eb",
              backgroundColor: showGuide ? "#3b82f6" : "white",
              color: showGuide ? "white" : "#6b7280",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            title: "Quick Setup Guide"
          }, "?"),
          React.createElement(
            "select",
            {
              value: selectedPreset,
              onChange: (e) => handlePresetChange(e.target.value),
              style: styles.select
            },
            React.createElement("option", { value: "custom" }, "Write your own code"),
            languageMode === "cpp" ? React.createElement(
              "optgroup",
              { label: "C++ Presets" },
              React.createElement("option", { value: "helloAos" }, "Hello AOS \u2014 simple C++ starter"),
              React.createElement("option", { value: "kuksaWriter" }, "Signal Writer \u2014 write vehicle signals"),
              React.createElement("option", { value: "kuksaReader" }, "KUKSA Reader \u2014 read vehicle signals"),
              React.createElement("option", { value: "evRangeExtender" }, "EV Range Extender \u2014 battery management"),
              React.createElement("option", { value: "batteryEnergySaver" }, "Battery Energy Saver \u2014 HVAC/seat cutoff"),
              React.createElement("option", { value: "batteryEnergySaverSdvRuntime" }, "Battery Energy Saver \u2014 sdv-runtime / VSS 4.0"),
              React.createElement("option", { value: "signalReporter" }, "Signal Reporter \u2014 relay to dashboard")
            ) : null,
            languageMode === "python" ? React.createElement(
              "optgroup",
              { label: "Python Presets" },
              React.createElement("option", { value: "helloPython" }, "Hello Python \u2014 simple Python starter"),
              React.createElement("option", { value: "seatEcu" }, "Seat ECU \u2014 seat heating/cooling control"),
              React.createElement("option", { value: "hvacEcu" }, "HVAC ECU \u2014 fan speed / climate control"),
              React.createElement("option", { value: "bms" }, "BMS \u2014 battery monitoring system"),
              React.createElement("option", { value: "rangeAi" }, "Range AI \u2014 driving range computation")
            ) : null
          ),
          React.createElement("span", {
            style: { fontSize: "12px", color: "#6b7280", fontWeight: 500 },
            title: 'The compiled binary name. Must match the "cmd" field in config.yaml (e.g. cmd: /my-app). Auto-filled when selecting a preset.'
          }, "App name:"),
          React.createElement("input", {
            type: "text",
            value: appName,
            onChange: (e) => setAppName(e.target.value),
            placeholder: "e.g. my-service",
            title: "Binary name for the compiled service. Must match cmd in config.yaml.",
            style: { ...styles.input, ...styles.inputSm }
          })
        )
      ),
      // Main Content
      React.createElement(
        "div",
        { style: styles.content },
        // Left Column — Orchestrator + Flow
        showDockerPanel && React.createElement(
          "div",
          { style: styles.dockerColumn },
          // ── Orchestrator Status Card ──────────────────────────────────────
          React.createElement(
            "div",
            { style: styles.card },
            React.createElement(
              "div",
              { style: { ...styles.cardHeader, padding: "8px 12px" } },
              React.createElement(
                "div",
                { style: { ...styles.cardTitle, fontSize: "13px", gap: "6px" } },
                React.createElement(Icon, { name: "server", size: 15, color: "#2563eb" }),
                "Orchestrator",
                React.createElement("span", {
                  style: {
                    fontSize: "11px",
                    fontWeight: 400,
                    color: connectionStatus === "connected" ? "#16a34a" : "#dc2626"
                  }
                }, connectionStatus === "connected" ? "\xB7 Online" : "\xB7 Offline")
              )
            ),
            React.createElement(
              "div",
              { style: { padding: "6px 12px 10px", display: "flex", flexDirection: "column", gap: "4px" } },
              workerInfo && React.createElement(
                "div",
                { style: { fontSize: "11px", color: "#6b7280", display: "flex", justifyContent: "space-between" } },
                React.createElement("span", null, "Your port"),
                React.createElement("span", { style: { fontWeight: 600, color: "#374151", fontFamily: "monospace" } }, String(workerInfo.port))
              )
            )
          ),
          // ── No-cert banner ──────────────────────────────────────────────────
          !certStatus?.loaded && React.createElement(
            "div",
            {
              style: {
                ...styles.card,
                backgroundColor: "#fffbeb",
                border: "1px solid #fcd34d",
                padding: "10px 14px",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }
            },
            React.createElement("span", { style: { fontSize: "18px", flexShrink: 0 } }, "\u{1F510}"),
            React.createElement(
              "div",
              { style: { flex: 1 } },
              React.createElement(
                "div",
                { style: { fontSize: "13px", fontWeight: 600, color: "#92400e" } },
                "Upload your .p12 certificate to provision a build environment"
              ),
              React.createElement(
                "div",
                { style: { fontSize: "11px", color: "#a16207", marginTop: "2px" } },
                "A dedicated, isolated workspace is created per certificate identity. Deployment is unavailable without a valid certificate."
              )
            )
          ),
          // ── Flow Steps Card ────────────────────────────────────────────────
          React.createElement(
            "div",
            { style: styles.card },
            React.createElement(
              "div",
              { style: { ...styles.cardHeader, padding: "8px 12px" } },
              React.createElement(
                "div",
                { style: { ...styles.cardTitle, fontSize: "13px", gap: "6px" } },
                React.createElement(Icon, { name: "activity", size: 15, color: "#7c3aed" }),
                "Setup"
              )
            ),
            // Step ① — Certificate
            (() => {
              const step1Done = certStatus?.loaded;
              const step1Active = isUploadingCert;
              const stepNum = step1Done ? "\u2713" : "\u2460";
              const stepColor = step1Done ? "#16a34a" : step1Active ? "#d97706" : "#9ca3af";
              const stepBg = step1Done ? "#dcfce7" : step1Active ? "#fef3c7" : "#f3f4f6";
              return React.createElement(
                "div",
                {
                  style: { padding: "6px 12px", display: "flex", alignItems: "flex-start", gap: "8px", borderBottom: "1px solid #f3f4f6" }
                },
                React.createElement("span", {
                  style: {
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    backgroundColor: stepBg,
                    color: stepColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    marginTop: "1px"
                  }
                }, stepNum),
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement("div", { style: { fontSize: "12px", fontWeight: 600, color: "#374151" } }, "Certificate"),
                  step1Done ? React.createElement(
                    "div",
                    { style: { fontSize: "11px", color: "#16a34a", marginTop: "2px" } },
                    certStatus?.identity?.cn ? `Loaded \u2014 ${certStatus.identity.cn}` : "Loaded"
                  ) : step1Active ? React.createElement("div", { style: { fontSize: "11px", color: "#d97706", marginTop: "2px" } }, "Uploading...") : React.createElement(
                    "div",
                    { style: { marginTop: "4px" } },
                    React.createElement(
                      "label",
                      {
                        style: {
                          fontSize: "11px",
                          color: "#2563eb",
                          cursor: "pointer",
                          padding: "3px 10px",
                          borderRadius: "4px",
                          border: "1px solid #bfdbfe",
                          backgroundColor: "#eff6ff",
                          display: "inline-block"
                        }
                      },
                      React.createElement("input", {
                        type: "file",
                        accept: ".p12,.pfx",
                        onChange: handleCertUpload,
                        disabled: connectionStatus !== "connected" || isUploadingCert,
                        style: { display: "none" }
                      }),
                      "Upload .p12"
                    )
                  )
                )
              );
            })(),
            // Step ② — Environment (worker)
            (() => {
              const step2Done = workerInfo !== null;
              const step2Active = certStatus?.loaded && !workerInfo;
              const step2Waiting = !certStatus?.loaded;
              const stepNum = step2Done ? "\u2713" : "\u2461";
              const stepColor = step2Done ? "#16a34a" : step2Active ? "#d97706" : "#d1d5db";
              const stepBg = step2Done ? "#dcfce7" : step2Active ? "#fef3c7" : "#f9fafb";
              return React.createElement(
                "div",
                {
                  style: { padding: "6px 12px", display: "flex", alignItems: "flex-start", gap: "8px", borderBottom: "1px solid #f3f4f6" }
                },
                React.createElement("span", {
                  style: {
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    backgroundColor: stepBg,
                    color: stepColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    marginTop: "1px"
                  }
                }, stepNum),
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement("div", { style: { fontSize: "12px", fontWeight: 600, color: "#374151" } }, "Environment"),
                  step2Done ? React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      { style: { fontSize: "11px", color: "#16a34a", marginTop: "2px" } },
                      `Ready \u2014 port ${workerInfo.port}`
                    ),
                    React.createElement(
                      "div",
                      { style: { fontSize: "10px", color: "#9ca3af", marginTop: "3px", lineHeight: "1.4" } },
                      "If the worker becomes unresponsive, Remove your certificate below and re-upload it to get a fresh environment."
                    )
                  ) : step2Active ? React.createElement("div", { style: { fontSize: "11px", color: "#d97706", marginTop: "2px" } }, "Creating...") : React.createElement(
                    "div",
                    { style: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" } },
                    step2Waiting ? "Upload certificate first" : "Waiting..."
                  )
                )
              );
            })(),
            // Step ③ — Build & Deploy
            (() => {
              const step3Ready = workerInfo !== null && connectionStatus === "connected";
              const stepNum = step3Ready ? "\u2713" : "\u2462";
              const stepColor = step3Ready ? "#16a34a" : "#d1d5db";
              const stepBg = step3Ready ? "#dcfce7" : "#f9fafb";
              return React.createElement(
                "div",
                {
                  style: { padding: "6px 12px", display: "flex", alignItems: "flex-start", gap: "8px" }
                },
                React.createElement("span", {
                  style: {
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    backgroundColor: stepBg,
                    color: stepColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    marginTop: "1px"
                  }
                }, stepNum),
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement("div", { style: { fontSize: "12px", fontWeight: 600, color: "#374151" } }, "Build & Deploy"),
                  React.createElement(
                    "div",
                    { style: { fontSize: "11px", color: step3Ready ? "#16a34a" : "#9ca3af", marginTop: "2px" } },
                    step3Ready ? "Ready to build" : "Complete steps above"
                  )
                )
              );
            })()
          ),
          // ── Certificate Management (compact, below flow) ──────────────────
          (certStatus?.loaded || certError) && React.createElement(
            "div",
            { style: { ...styles.card, padding: "8px 12px" } },
            certStatus?.loaded && certStatus.identity?.cn && React.createElement(
              "div",
              {
                style: {
                  fontSize: "11px",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  marginBottom: "8px",
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                  display: "flex",
                  gap: "6px",
                  alignItems: "baseline"
                }
              },
              React.createElement("span", { style: { color: "#6b7280", flexShrink: 0 } }, "CN:"),
              React.createElement("span", { style: { color: "#111827", overflowWrap: "anywhere", wordBreak: "break-word" } }, certStatus.identity.cn)
            ),
            toolchainVersions && React.createElement(
              "div",
              {
                style: {
                  fontSize: "11px",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  marginBottom: "8px",
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                  display: "flex",
                  gap: "8px",
                  alignItems: "baseline",
                  flexWrap: "wrap"
                }
              },
              React.createElement("span", { style: { color: "#6b7280", flexShrink: 0 } }, "Toolchain:"),
              React.createElement("span", { style: { color: "#065f46" } }, `aos-signer ${toolchainVersions["aos-signer"] || "?"}`),
              React.createElement("span", { style: { color: "#065f46" } }, `aos-keys ${toolchainVersions["aos-keys"] || "?"}`),
              React.createElement("span", { style: { color: "#065f46" } }, `aos-prov ${toolchainVersions["aos-prov"] || "?"}`)
            ),
            unitInfo && (Object.keys(unitInfo.versions || {}).length > 0 ? React.createElement(
              "div",
              {
                style: {
                  fontSize: "11px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  marginBottom: "8px",
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                  display: "flex",
                  gap: "8px",
                  alignItems: "baseline",
                  flexWrap: "wrap"
                }
              },
              React.createElement("span", { style: { color: "#6b7280", flexShrink: 0 } }, "Unit:"),
              ...Object.entries(unitInfo.versions).map(
                ([k, v]) => React.createElement("span", { key: k, style: { color: "#1e40af" } }, `${k}=${v}`)
              ),
              React.createElement("span", { style: { color: "#6b7280" } }, `(${unitInfo.nodeCount} node(s))`)
            ) : unitInfo.name && React.createElement(
              "div",
              {
                style: {
                  fontSize: "11px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  marginBottom: "8px",
                  fontFamily: "ui-monospace, Menlo, Consolas, monospace"
                }
              },
              React.createElement("span", { style: { color: "#6b7280" } }, "Unit: "),
              React.createElement("span", { style: { color: "#1e40af" } }, unitInfo.name),
              React.createElement("span", { style: { color: "#9ca3af" } }, " \u2014 no version fields in API response")
            )),
            certError && React.createElement("div", { style: { fontSize: "12px", color: "#dc2626", marginBottom: "8px" } }, certError),
            React.createElement(
              "div",
              { style: { display: "flex", gap: "6px" } },
              React.createElement(
                "label",
                {
                  style: {
                    ...styles.button,
                    ...styles.buttonSm,
                    ...connectionStatus !== "connected" || isUploadingCert || isRemovingCert ? styles.buttonDisabled : {},
                    flex: 1,
                    textAlign: "center",
                    fontSize: "11px",
                    cursor: connectionStatus === "connected" && !isUploadingCert && !isRemovingCert ? "pointer" : "not-allowed"
                  }
                },
                React.createElement("input", {
                  type: "file",
                  accept: ".p12,.pfx",
                  onChange: handleCertUpload,
                  disabled: connectionStatus !== "connected" || isUploadingCert || isRemovingCert,
                  style: { display: "none" }
                }),
                isUploadingCert ? "Uploading..." : "Replace .p12"
              ),
              certStatus?.loaded && React.createElement(
                "button",
                {
                  onClick: handleCertRemove,
                  disabled: connectionStatus !== "connected" || isUploadingCert || isRemovingCert,
                  style: {
                    ...styles.button,
                    ...styles.buttonSm,
                    fontSize: "11px",
                    ...connectionStatus !== "connected" || isUploadingCert || isRemovingCert ? styles.buttonDisabled : {},
                    backgroundColor: "transparent",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    justifyContent: "center"
                  },
                  title: "Remove certificate and shut down your build environment"
                },
                isRemovingCert ? "Removing..." : "Remove"
              )
            )
          ),
          // AosCloud Service Card
          React.createElement(
            "div",
            { style: styles.card },
            React.createElement(
              "div",
              { style: styles.cardHeader },
              React.createElement(
                "div",
                { style: styles.cardTitle },
                React.createElement(Icon, { name: "cloud", size: 16, color: "#3b82f6" }),
                "AosCloud Service"
              ),
              React.createElement("button", {
                onClick: async () => {
                  await fetchAosCloudServices();
                  if (selectedServiceUuid)
                    await loadServiceDetails(selectedServiceUuid);
                },
                disabled: isLoadingAosCloud || connectionStatus !== "connected",
                style: { ...styles.iconButton, ...isLoadingAosCloud ? { opacity: 0.5 } : {} },
                title: "Refresh services, versions, and units from AosCloud"
              }, isLoadingAosCloud ? "\u27F3" : "\u21BB")
            ),
            React.createElement(
              "div",
              { style: { padding: "10px 12px" } },
              React.createElement(
                "select",
                {
                  value: selectedServiceUuid,
                  onChange: (e) => handleServiceChange(e.target.value),
                  style: { ...styles.select, width: "100%", fontSize: "12px", padding: "6px 8px" }
                },
                React.createElement("option", { value: "" }, isLoadingAosCloud ? "Loading services..." : aosServices.length ? "\u2014 Select service \u2014" : "No services found"),
                ...aosServices.map(
                  (s) => React.createElement("option", { key: s.uuid, value: s.uuid }, s.title || s.uuid)
                )
              ),
              // Service UUID + codename display (right under the dropdown)
              serviceName && React.createElement(
                "div",
                {
                  style: { display: "flex", flexDirection: "column", gap: "3px", marginTop: "6px", minWidth: 0 }
                },
                // UUID row
                React.createElement(
                  "div",
                  {
                    style: { display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }
                  },
                  React.createElement("span", {
                    title: selectedServiceUuid,
                    style: {
                      fontSize: "11px",
                      color: "#6c757d",
                      fontFamily: "monospace",
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }
                  }, selectedServiceUuid),
                  React.createElement("button", {
                    onClick: () => {
                      navigator.clipboard.writeText(selectedServiceUuid);
                      addLog(`[Copied] Service UUID: ${selectedServiceUuid}`);
                    },
                    style: { ...styles.iconButton, width: "20px", height: "20px", fontSize: "11px", flexShrink: 0 },
                    title: selectedServiceUuid
                  }, "\u{1F4CB}")
                ),
                // Codename row
                selectedServiceCodename && React.createElement(
                  "div",
                  {
                    style: { display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }
                  },
                  React.createElement("span", {
                    style: {
                      fontSize: "10px",
                      color: "#9ca3af",
                      fontFamily: "monospace",
                      backgroundColor: "#f3f4f6",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      flexShrink: 0
                    }
                  }, "codename:"),
                  React.createElement("span", {
                    title: selectedServiceCodename,
                    style: {
                      fontSize: "11px",
                      color: "#374151",
                      fontFamily: "monospace",
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }
                  }, selectedServiceCodename),
                  React.createElement("button", {
                    onClick: () => {
                      navigator.clipboard.writeText(selectedServiceCodename);
                      addLog(`[Copied] Codename: ${selectedServiceCodename}`);
                    },
                    style: { ...styles.iconButton, width: "20px", height: "20px", fontSize: "11px", flexShrink: 0 },
                    title: selectedServiceCodename
                  }, "\u{1F4CB}")
                )
              ),
              // Auto-sync service_uid checkbox (sits under the UUID — it's a
              // setting that controls what happens to that UUID when copied
              // into config.yaml)
              React.createElement(
                "label",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "#6b7280",
                    cursor: "pointer",
                    userSelect: "none"
                  }
                },
                React.createElement("input", {
                  type: "checkbox",
                  checked: autoSyncServiceUid,
                  onChange: (e) => setAutoSyncServiceUid(e.target.checked),
                  style: { cursor: "pointer" }
                }),
                "Auto-sync codename to config.yaml",
                React.createElement("span", {
                  style: { fontSize: "10px", color: "#dc2626", marginLeft: "4px", fontStyle: "italic" }
                }, "(overwrites YAML identity \u2014 may cause wrong service deployment)")
              ),
              serviceVersions.length > 0 && React.createElement(
                "div",
                {
                  style: { display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }
                },
                ...serviceVersions.slice(0, 5).map(
                  (v) => React.createElement("span", {
                    key: v.version,
                    style: {
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "8px",
                      backgroundColor: v === serviceVersions[0] ? "#dbeafe" : "#f3f4f6",
                      color: v === serviceVersions[0] ? "#2563eb" : "#6b7280"
                    }
                  }, `v${v.version}`)
                )
              ),
              // Auto-increment version checkbox — placed right under the version
              // pills so it's clear what it operates on (the "next" version after
              // the latest pill).
              serviceVersions.length > 0 && React.createElement(
                "label",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "#6b7280",
                    cursor: "pointer",
                    userSelect: "none"
                  },
                  title: 'When enabled, after a successful build the version in code (C++ #define VERSION / Python VERSION = "...") and YAML version: are bumped to the next patch (e.g. 1.0.5 \u2192 1.0.6)'
                },
                React.createElement("input", {
                  type: "checkbox",
                  checked: autoIncVersion,
                  onChange: (e) => setAutoIncVersion(e.target.checked),
                  style: { cursor: "pointer", margin: 0 }
                }),
                "Auto-increment version after build"
              )
            )
          ),
          // Units card — always visible, toggle between service units and all units
          React.createElement(
            "div",
            { style: styles.card },
            React.createElement(
              "div",
              { style: styles.cardHeader },
              React.createElement(
                "div",
                { style: styles.cardTitle },
                React.createElement(Icon, { name: "server", size: 16, color: "#6366f1" }),
                "Units"
              ),
              // Toggle pills: This service | All units
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    overflow: "hidden",
                    marginRight: "6px"
                  }
                },
                React.createElement("button", {
                  onClick: () => setShowAllUnits(false),
                  style: {
                    border: "none",
                    padding: "2px 8px",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    backgroundColor: !showAllUnits ? "#6366f1" : "transparent",
                    color: !showAllUnits ? "#fff" : "#6b7280"
                  }
                }, "This service"),
                React.createElement("button", {
                  onClick: async () => {
                    setShowAllUnits(true);
                    if (!aosServiceRef.current)
                      return;
                    try {
                      const res = await aosServiceRef.current.listUnits();
                      if (res.status === "success" && res.items?.length) {
                        setAllUnits(res.items.map((u) => ({
                          uid: u.uid || u.systemUid,
                          systemUid: u.system_uid || u.systemUid || u.uid || "",
                          name: u.name || u.system_uid || u.systemUid || "Unknown",
                          online: u.online,
                          status: u.status || "Unknown",
                          runState: "",
                          version: "",
                          error: "",
                          ip: ""
                        })));
                      }
                    } catch (err) {
                    }
                  },
                  style: {
                    border: "none",
                    padding: "2px 8px",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    backgroundColor: showAllUnits ? "#6366f1" : "transparent",
                    color: showAllUnits ? "#fff" : "#6b7280"
                  }
                }, "All units")
              ),
              React.createElement("button", {
                onClick: () => {
                  if (showAllUnits) {
                    setShowAllUnits(true);
                    if (aosServiceRef.current) {
                      aosServiceRef.current.listUnits().then((res) => {
                        if (res.status === "success" && res.items?.length) {
                          setAllUnits(res.items.map((u) => ({
                            uid: u.uid || u.systemUid,
                            systemUid: u.system_uid || u.systemUid || u.uid || "",
                            name: u.name || u.system_uid || u.systemUid || "Unknown",
                            online: u.online,
                            status: u.status || "Unknown",
                            runState: "",
                            version: "",
                            error: "",
                            ip: ""
                          })));
                        }
                      }).catch(() => {
                      });
                    }
                  } else if (selectedServiceUuid) {
                    loadServiceDetails(selectedServiceUuid);
                  }
                },
                style: styles.iconButton,
                title: "Refresh"
              }, "\u21BB")
            ),
            (() => {
              const units = showAllUnits ? allUnits : serviceUnits;
              if (units.length === 0) {
                return React.createElement(
                  "div",
                  {
                    style: { padding: "14px", textAlign: "center", fontSize: "11px", color: "#9ca3af" }
                  },
                  showAllUnits ? "No units available" : !certStatus?.loaded ? "Upload a certificate and select a service to see units" : !selectedServiceUuid ? "Select a service to see its assigned units" : "No units assigned to this service"
                );
              }
              return React.createElement(
                "div",
                { style: { maxHeight: "150px", overflowY: "auto" } },
                ...units.map(
                  (u) => React.createElement(
                    "div",
                    {
                      key: u.uid,
                      onClick: () => {
                        loadUnitMonitoring(u.uid);
                        loadUnitInfo(u.uid);
                        setDetailUnitUid(u.uid);
                      },
                      onMouseEnter: (e) => {
                        if (selectedMonitorUnit !== u.uid)
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                      },
                      onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = selectedMonitorUnit === u.uid ? "#f0f7ff" : "transparent";
                      },
                      title: "Click to view monitoring + alerts",
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f3f4f6",
                        backgroundColor: selectedMonitorUnit === u.uid ? "#f0f7ff" : "transparent",
                        transition: "background-color 0.15s"
                      }
                    },
                    React.createElement(
                      "div",
                      { style: { display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 } },
                      React.createElement("span", {
                        style: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, backgroundColor: u.online ? "#16a34a" : "#dc2626" }
                      }),
                      React.createElement("span", { style: { fontSize: "12px", fontWeight: 500 } }, u.name),
                      React.createElement("button", {
                        onClick: (e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(u.systemUid || u.uid);
                          addLog(`[Copied] Unit UID: ${u.systemUid || u.uid}`);
                        },
                        style: { ...styles.iconButton, width: "18px", height: "18px", fontSize: "10px", flexShrink: 0 },
                        title: u.systemUid || u.uid
                      }, "\u{1F4CB}")
                    ),
                    React.createElement(
                      "div",
                      { style: { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 } },
                      u.version && React.createElement("span", {
                        style: { fontSize: "10px", padding: "1px 5px", borderRadius: "6px", backgroundColor: "#e7f3ff", color: "#2563eb" }
                      }, `v${u.version}`),
                      u.error && React.createElement("span", {
                        style: { fontSize: "10px", color: "#dc2626" },
                        title: u.error
                      }, "\u26A0"),
                      React.createElement("span", {
                        style: { fontSize: "12px", color: "#9ca3af", flexShrink: 0, marginLeft: "2px" },
                        title: "Click to open details"
                      }, "\u203A")
                    )
                  )
                )
              );
            })()
          ),
          // AosEdge setup automation — native equivalent of aos-automation.py, run
          // against the unit currently selected above (no Python process involved).
          React.createElement(
            "div",
            { style: styles.card },
            React.createElement(
              "div",
              { style: styles.cardHeader },
              React.createElement(
                "div",
                { style: styles.cardTitle },
                React.createElement(Icon, { name: "settings", size: 16, color: "#6366f1" }),
                "AosEdge Setup"
              )
            ),
            React.createElement(
              "div",
              { style: { padding: "12px", display: "flex", flexDirection: "column", gap: "8px" } },
              React.createElement(
                "div",
                { style: { fontSize: "11px", color: "#6b7280" } },
                (() => {
                  const units = showAllUnits ? allUnits : serviceUnits;
                  const unit = units.find((u) => u.uid === selectedMonitorUnit);
                  return unit ? `Target unit: ${unit.name} (${unit.systemUid || unit.uid})` : "Select a unit above to run setup";
                })()
              ),
              React.createElement("button", {
                onClick: runAosSetupAutomation,
                disabled: isRunningAutomation || !selectedMonitorUnit,
                style: {
                  ...styles.button,
                  ...styles.buttonPrimary,
                  ...isRunningAutomation || !selectedMonitorUnit ? styles.buttonDisabled : {}
                },
                title: "Runs unit config update, unit set, subject, and service assignment \u2014 same steps as aos-automation.py"
              }, isRunningAutomation ? "Running setup\u2026" : "Run AosEdge Setup"),
              automationResult && React.createElement(
                "div",
                {
                  style: {
                    fontSize: "11px",
                    padding: "8px",
                    borderRadius: "4px",
                    backgroundColor: automationResult.status === "success" ? "#f0fdf4" : "#fef2f2",
                    color: automationResult.status === "success" ? "#16a34a" : "#dc2626",
                    whiteSpace: "pre-wrap"
                  }
                },
                automationResult.message,
                automationResult.dashboardUrl && React.createElement(
                  "div",
                  { style: { marginTop: "4px" } },
                  React.createElement("a", {
                    href: automationResult.dashboardUrl,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    style: { color: "#2563eb" }
                  }, "Open Playground dashboard")
                )
              )
            )
          )
          // Monitoring + Alerts moved to the Unit Detail overlay (opens on
          // unit-row click) to avoid duplication with the inline cards.
        ),
        // End of dockerColumn
        // Middle Column - Tabbed Code Editor
        React.createElement(
          "div",
          { style: styles.editorsColumn },
          // Editor with tabs
          React.createElement(
            "div",
            { style: { ...styles.card, ...styles.editorCard, flex: 1, display: "flex", flexDirection: "column" } },
            // Tab bar — shows only the active language's code tab + shared YAML tab
            React.createElement(
              "div",
              { style: { display: "flex", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" } },
              languageMode === "cpp" ? React.createElement(
                "button",
                {
                  onClick: () => setActiveEditorTab("cpp"),
                  style: {
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: activeEditorTab === "cpp" ? "#fff" : "transparent",
                    color: activeEditorTab === "cpp" ? "#2563eb" : "#6b7280",
                    borderBottom: activeEditorTab === "cpp" ? "2px solid #2563eb" : "2px solid transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }
                },
                React.createElement(Icon, { name: "file-code", size: 14 }),
                "main.cpp"
              ) : null,
              languageMode === "python" ? React.createElement(
                "button",
                {
                  onClick: () => setActiveEditorTab("python"),
                  style: {
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: activeEditorTab === "python" ? "#fff" : "transparent",
                    color: activeEditorTab === "python" ? "#2563eb" : "#6b7280",
                    borderBottom: activeEditorTab === "python" ? "2px solid #2563eb" : "2px solid transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }
                },
                React.createElement(Icon, { name: "file-code", size: 14 }),
                "main.py"
              ) : null,
              React.createElement(
                "button",
                {
                  onClick: () => setActiveEditorTab("yaml"),
                  style: {
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: activeEditorTab === "yaml" ? "#fff" : "transparent",
                    color: activeEditorTab === "yaml" ? "#2563eb" : "#6b7280",
                    borderBottom: activeEditorTab === "yaml" ? "2px solid #2563eb" : "2px solid transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }
                },
                React.createElement(Icon, { name: "settings", size: 14 }),
                "config.yaml"
              )
            ),
            // Active editor with line numbers
            React.createElement(
              "div",
              { style: styles.editorContainer },
              React.createElement(
                "pre",
                { style: styles.lineNumbers },
                (activeEditorTab === "cpp" ? cppCode : activeEditorTab === "python" ? pythonCode : yamlConfig).split("\n").map((_, i) => `${i + 1}`).join("\n")
              ),
              React.createElement("textarea", {
                style: { ...styles.textarea, flex: 1 },
                value: activeEditorTab === "cpp" ? cppCode : activeEditorTab === "python" ? pythonCode : yamlConfig,
                onChange: (e) => activeEditorTab === "cpp" ? setCppCode(e.target.value) : activeEditorTab === "python" ? setPythonCode(e.target.value) : setYamlConfig(e.target.value),
                placeholder: activeEditorTab === "cpp" ? "// Enter your C++ code here..." : activeEditorTab === "python" ? "# Enter your Python code here..." : "# Enter your YAML configuration here...",
                spellCheck: false
              })
            )
          ),
          // Action Buttons
          React.createElement(
            "div",
            { style: styles.actions },
            React.createElement(
              "button",
              {
                onClick: handleBuildDeploy,
                disabled: isBuilding || connectionStatus !== "connected" || !selectedInstance,
                style: { ...styles.button, ...styles.buttonPrimary, ...isBuilding || connectionStatus !== "connected" || !selectedInstance ? styles.buttonDisabled : {} },
                title: !selectedInstance ? "Connecting to build service..." : ""
              },
              isBuilding ? React.createElement(
                React.Fragment,
                null,
                React.createElement("span", { style: styles.spinner }),
                " Building..."
              ) : React.createElement(
                React.Fragment,
                null,
                React.createElement("span", null, "\u26A1"),
                " Build & Deploy"
              )
            ),
            // Warning hint when no instance selected
            !selectedInstance && React.createElement(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  marginTop: "8px",
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#856404",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }
              },
              React.createElement(Icon, { name: "triangle-alert", size: 14, color: "#d97706" }),
              React.createElement("span", null, "Waiting for build service connection...")
            )
          )
        ),
        // Right Column - Status & Logs
        React.createElement(
          "div",
          { style: styles.statusColumn },
          // Build Status Banner
          buildStatus && React.createElement(
            "div",
            {
              style: {
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: buildStatus.includes("successfully") ? "#f0fdf4" : buildStatus.includes("failed") || buildStatus.includes("Error") ? "#fef2f2" : "#eff6ff",
                color: buildStatus.includes("successfully") ? "#166534" : buildStatus.includes("failed") || buildStatus.includes("Error") ? "#991b1b" : "#1e40af",
                border: `1px solid ${buildStatus.includes("successfully") ? "#bbf7d0" : buildStatus.includes("failed") || buildStatus.includes("Error") ? "#fecaca" : "#bfdbfe"}`,
                ...isBuilding ? { animation: "aos-pulse 1.6s ease-in-out infinite" } : {}
              }
            },
            React.createElement(
              "span",
              {
                style: { display: "inline-flex", alignItems: "center", ...isBuilding ? { animation: "aos-spin 1s linear infinite" } : {} }
              },
              buildStatus.includes("successfully") ? React.createElement(Icon, { name: "check", size: 14 }) : buildStatus.includes("failed") || buildStatus.includes("Error") ? React.createElement(Icon, { name: "x", size: 14 }) : isBuilding ? React.createElement(Icon, { name: "refresh", size: 14 }) : "\u25CF"
            ),
            buildStatus
          ),
          // Deployed Apps Card (hide when empty)
          deployedApps.length > 0 && React.createElement(
            "div",
            { style: styles.card },
            React.createElement(
              "div",
              { style: styles.cardHeader },
              React.createElement(
                "div",
                { style: styles.cardTitle },
                React.createElement(Icon, { name: "rocket", size: 16, color: "#dc2626" }),
                "Deployed Apps"
              ),
              React.createElement("button", {
                onClick: refreshApps,
                style: styles.iconButton,
                title: "Refresh"
              }, "\u21BB")
            ),
            React.createElement(
              "div",
              { style: styles.appsList },
              deployedApps.length === 0 ? React.createElement("div", { style: styles.empty }, "No applications deployed") : deployedApps.map(
                (app) => React.createElement(
                  "div",
                  {
                    key: app.app_id,
                    style: styles.appItem
                  },
                  React.createElement(
                    "div",
                    { style: styles.appInfo },
                    React.createElement("span", { style: styles.appName }, app.name),
                    React.createElement("span", { style: { ...styles.statusBadge, ...getStatusBadgeStyle(app.status) } }, getStatusClass(app.status))
                  ),
                  React.createElement(
                    "div",
                    { style: styles.appActions },
                    (app.status === "stopped" || app.status === "deployed") && React.createElement("button", {
                      onClick: () => handleStartApp(app.app_id),
                      style: { ...styles.actionBtn, ...styles.actionStart },
                      title: "Start"
                    }, "\u25B6"),
                    app.status === "running" && React.createElement("button", {
                      onClick: () => handleStopApp(app.app_id),
                      style: { ...styles.actionBtn, ...styles.actionStop },
                      title: "Stop"
                    }, "\u25A0")
                  )
                )
              )
            )
          ),
          // Build Logs Card
          React.createElement(
            "div",
            { style: { ...styles.card, ...styles.logsCard, position: "relative" } },
            // Indeterminate progress bar — fills the gap during long silent steps
            // (uploading, signing, AosCloud round-trip). Pure CSS, GPU-painted.
            isBuilding && React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  overflow: "hidden",
                  backgroundColor: "#dbeafe",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  pointerEvents: "none"
                }
              },
              React.createElement("div", {
                style: {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: "25%",
                  backgroundColor: "#3b82f6",
                  animation: "aos-bar 1.4s ease-in-out infinite"
                }
              })
            ),
            React.createElement(
              "div",
              { style: styles.cardHeader },
              React.createElement(
                "div",
                { style: styles.cardTitle },
                React.createElement(Icon, { name: "clipboard-list", size: 16, color: "#374151" }),
                "Build Logs"
              ),
              buildLogs.length > 0 && React.createElement("button", {
                onClick: () => {
                  const text = buildLogs.join("\n");
                  const blob = new Blob([text], { type: "text/plain" });
                  const url2 = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url2;
                  a.download = `build-log-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
                  a.click();
                  URL.revokeObjectURL(url2);
                },
                style: styles.iconButton,
                title: "Download build log"
              }, "\u{1F4BE}"),
              React.createElement("button", {
                onClick: () => setBuildLogs([]),
                style: styles.iconButton,
                title: "Clear logs"
              }, "\u2715")
            ),
            React.createElement(
              "div",
              { ref: buildLogsRef, style: styles.logs },
              buildLogs.length === 0 ? React.createElement("div", { style: styles.empty }, "No logs yet") : buildLogs.map(
                (log, i) => React.createElement("div", {
                  key: i,
                  style: styles.logEntry
                }, log)
              )
            )
          ),
          // Service Stdout Panel
          React.createElement(
            "div",
            { style: { ...styles.card, ...styles.logsCard } },
            React.createElement(
              "div",
              { style: styles.cardHeader },
              React.createElement(
                "div",
                { style: styles.cardTitle },
                React.createElement(Icon, { name: "activity", size: 16, color: "#374151" }),
                "Service Output"
              ),
              React.createElement(
                "div",
                { style: { display: "flex", gap: "4px" } },
                React.createElement("button", {
                  onClick: async () => {
                    if (!aosServiceRef.current || !selectedMonitorUnit)
                      return;
                    setIsRequestingLog(true);
                    try {
                      const unit = serviceUnits.find((u) => u.uid === selectedMonitorUnit);
                      const sshPort = unit?.sshPort || 8942;
                      const res = await aosServiceRef.current.getServiceStdout(sshPort, 80, void 0, selectedServiceUuid, selectedMonitorUnit, selectedSubjectId);
                      if (res.status === "success" && res.logs) {
                        setServiceLogs(res.logs.split("\n").filter((l) => l.trim()).map((l, i) => ({ id: i, text: l })));
                      } else {
                        setServiceLogs([{ id: 0, text: res.message || "No output available" }]);
                      }
                    } catch (err) {
                      setServiceLogs([{ id: 0, text: `Error: ${err.message}` }]);
                    } finally {
                      setIsRequestingLog(false);
                    }
                  },
                  disabled: isRequestingLog || !selectedMonitorUnit,
                  style: {
                    ...styles.button,
                    ...styles.buttonSm,
                    ...isRequestingLog || !selectedMonitorUnit ? styles.buttonDisabled : {}
                  },
                  title: "Fetch service stdout from VM"
                }, isRequestingLog ? "\u27F3 Loading..." : "\u21BB Refresh"),
                serviceLogs.length > 0 && React.createElement("button", {
                  onClick: () => {
                    const text = serviceLogs.map((l) => l.text).join("\n");
                    const blob = new Blob([text], { type: "text/plain" });
                    const url2 = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url2;
                    a.download = `service-log-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
                    a.click();
                    URL.revokeObjectURL(url2);
                  },
                  style: styles.iconButton,
                  title: "Download log as text file"
                }, "\u{1F4BE}"),
                React.createElement("button", {
                  onClick: () => setServiceLogs([]),
                  style: styles.iconButton,
                  title: "Clear"
                }, "\u2715")
              )
            ),
            React.createElement(
              "div",
              { style: styles.logs },
              serviceLogs.length === 0 ? React.createElement(
                "div",
                { style: styles.empty },
                selectedMonitorUnit ? "Click Refresh to view service output from the VM" : "Select a unit first"
              ) : serviceLogs.map(
                (log) => React.createElement("div", {
                  key: log.id,
                  style: { ...styles.logEntry, fontSize: "11px", lineHeight: 1.4 }
                }, log.text)
              )
            )
          )
        )
      )
    );
  }

  // src/index.ts
  var components = { Page };
  function constrainHostElement(el) {
    const prev = {
      height: el.style.height,
      maxHeight: el.style.maxHeight,
      minHeight: el.style.minHeight,
      position: el.style.position,
      overflow: el.style.overflow,
      display: el.style.display
    };
    el.__aw_prev_style = prev;
    if (!el.style.height)
      el.style.height = "100%";
    if (!el.style.maxHeight)
      el.style.maxHeight = "100vh";
    el.style.minHeight = "0";
    if (!el.style.position)
      el.style.position = "relative";
    el.style.overflow = "hidden";
    if (!el.style.display)
      el.style.display = "flex";
  }
  function restoreHostElement(el) {
    const prev = el.__aw_prev_style;
    if (!prev)
      return;
    el.style.height = prev.height;
    el.style.maxHeight = prev.maxHeight;
    el.style.minHeight = prev.minHeight;
    el.style.position = prev.position;
    el.style.overflow = prev.overflow;
    el.style.display = prev.display;
    delete el.__aw_prev_style;
  }
  function mount(el, props) {
    constrainHostElement(el);
    const root = ReactDOM.createRoot(el);
    root.render(React2.createElement(Page, { ...props || {}, config: { ...props?.config || {}, language: "python" } }));
    el.__aw_root = root;
  }
  function unmount(el) {
    const r = el.__aw_root;
    if (r && r.unmount)
      r.unmount();
    delete el.__aw_root;
    restoreHostElement(el);
  }
  if (typeof window !== "undefined") {
    ;
    window.DAPlugins = window.DAPlugins || {};
    window.DAPlugins["page-plugin"] = { components, mount, unmount };
    console.log("AOS Cloud Deployment plugin registered as page-plugin");
  }
})();
//# sourceMappingURL=index.js.map
