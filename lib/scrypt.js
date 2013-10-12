// Generated by IcedCoffeeScript 1.6.3-f
(function() {
  var HMAC_SHA256, Salsa20InnerCore, Scrypt, WordArray, blkcpy, blkxor, buffer_to_ui8a, iced, le32dec, le32enc, pbkdf2, progress_hook, __iced_k, __iced_k_noop;

  iced = require('iced-coffee-script/lib/coffee-script/iced').runtime;
  __iced_k = __iced_k_noop = function() {};

  HMAC_SHA256 = require('./hmac').HMAC_SHA256;

  pbkdf2 = require('./pbkdf2').pbkdf2;

  Salsa20InnerCore = require('./salsa20').Salsa20InnerCore;

  WordArray = require('./wordarray').WordArray;

  blkcpy = function(D, S, d_offset, s_offset, len) {
    return D.set(S.subarray(0x40 * s_offset, 0x40 * (s_offset + len)), 0x40 * d_offset);
  };

  blkxor = function(D, S, s_offset, len) {
    var i, _i;
    s_offset <<= 6;
    len <<= 6;
    for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
      D[i] ^= S[i + s_offset];
    }
    return true;
  };

  le32dec = function(B) {
    return B[0] | (B[1] << 8) | (B[2] << 16) | (B[3] << 24);
  };

  le32enc = function(B, w) {
    B[0] = w & 0xff;
    B[1] = (w >> 8) & 0xff;
    B[2] = (w >> 16) & 0xff;
    return B[3] = (w >> 24) & 0xff;
  };

  buffer_to_ui8a = function(b) {
    var i, ret, _i, _ref;
    ret = new Uint8Array(b.length);
    for (i = _i = 0, _ref = b.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      ret[i] = b.readUInt8(i);
    }
    return ret;
  };

  Scrypt = (function() {
    function Scrypt(_arg) {
      this.N = _arg.N, this.r = _arg.r, this.p = _arg.p, this.prng = _arg.prng, this.klass = _arg.klass;
      this.N || (this.N = Math.pow(2, 8));
      this.r || (this.r = 16);
      this.p || (this.p = 2);
      this.klass || (this.klass = HMAC_SHA256);
      this.X64_tmp = new Uint8Array(64);
      this.s20ic = new Salsa20InnerCore(8);
    }

    Scrypt.prototype.salsa20_8 = function(B) {
      var B32, X, b, i, x, _i, _j, _len, _len1, _results;
      B32 = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i < 16; i = ++_i) {
          _results.push(le32dec(B.subarray(i * 4)));
        }
        return _results;
      })();
      X = this.s20ic._core(B32);
      for (i = _i = 0, _len = X.length; _i < _len; i = ++_i) {
        x = X[i];
        B32[i] += x;
      }
      _results = [];
      for (i = _j = 0, _len1 = B32.length; _j < _len1; i = ++_j) {
        b = B32[i];
        _results.push(le32enc(B.subarray(i * 4), b));
      }
      return _results;
    };

    Scrypt.prototype.pbkdf2 = function(_arg, cb) {
      var buf, c, dkLen, key, progress_hook, salt, ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      key = _arg.key, salt = _arg.salt, c = _arg.c, dkLen = _arg.dkLen, progress_hook = _arg.progress_hook;
      key = WordArray.from_buffer(key);
      salt = WordArray.from_buffer(salt);
      (function(__iced_k) {
        __iced_deferrals = new iced.Deferrals(__iced_k, {
          parent: ___iced_passed_deferral,
          filename: "src/scrypt.iced",
          funcname: "Scrypt.pbkdf2"
        });
        pbkdf2({
          key: key,
          salt: salt,
          c: c,
          dkLen: dkLen,
          klass: _this.klass,
          progress_hook: progress_hook
        }, __iced_deferrals.defer({
          assign_fn: (function() {
            return function() {
              return buf = arguments[0];
            };
          })(),
          lineno: 63
        }));
        __iced_deferrals._fulfill();
      })(function() {
        return cb(buf.to_buffer());
      });
    };

    Scrypt.prototype.blockmix_salsa8 = function(B, Y) {
      var X, i, _i, _j, _k, _ref, _ref1, _ref2, _results;
      X = this.X64_tmp;
      blkcpy(X, B, 0, 2 * this.r - 1, 1);
      for (i = _i = 0, _ref = 2 * this.r; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        blkxor(X, B, i, 1);
        this.salsa20_8(X);
        blkcpy(Y, X, i, 0, 1);
      }
      for (i = _j = 0, _ref1 = this.r; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        blkcpy(B, Y, i, i * 2, 1);
      }
      _results = [];
      for (i = _k = 0, _ref2 = this.r; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
        _results.push(blkcpy(B, Y, i + this.r, i * 2 + 1, 1));
      }
      return _results;
    };

    Scrypt.prototype.integerify = function(B) {
      return le32dec(B) & (this.N - 1);
    };

    Scrypt.prototype.smix = function(_arg) {
      var B, V, X, XY, Y, i, j, lim, _i, _j, _ref, _ref1;
      B = _arg.B, V = _arg.V, XY = _arg.XY;
      X = XY;
      lim = 2 * this.r;
      Y = XY.subarray(0x40 * lim);
      blkcpy(X, B, 0, 0, lim);
      for (i = _i = 0, _ref = this.N; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        blkcpy(V, X, 2 * this.r * i, 0, 2 * this.r);
        this.blockmix_salsa8(X, Y);
      }
      for (i = _j = 0, _ref1 = this.N; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        j = this.integerify(X.subarray(0x40 * (lim - 1)));
        blkxor(X, V, j * lim, lim);
        this.blockmix_salsa8(X, V);
      }
      return blkcpy(B, X, 0, 0, lim);
    };

    Scrypt.prototype.run = function(_arg, cb) {
      var B, MAX, V, XY, c, dkLen, err, i, key, lim, out, progress_hook, ret, salt, ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      key = _arg.key, salt = _arg.salt, dkLen = _arg.dkLen, progress_hook = _arg.progress_hook;
      MAX = 0xffffffff;
      err = ret = null;
      err = dkLen > MAX ? err = new Error("asked for too much data") : this.r * this.p >= (1 << 30) ? new Error("r & p are too big") : (this.r > MAX / 128 / this.p) || (this.r > MAX / 256) || (this.N > MAX / 128 / this.r) ? new Error("N is too big") : null;
      XY = new Uint8Array(256 * this.r);
      V = new Uint8Array(128 * this.r * this.N);
      lim = 128 * this.r;
      c = 1;
      (function(__iced_k) {
        __iced_deferrals = new iced.Deferrals(__iced_k, {
          parent: ___iced_passed_deferral,
          filename: "src/scrypt.iced",
          funcname: "Scrypt.run"
        });
        _this.pbkdf2({
          progress_hook: progress_hook,
          key: key,
          salt: salt,
          c: c,
          dkLen: lim * _this.p
        }, __iced_deferrals.defer({
          assign_fn: (function() {
            return function() {
              return B = arguments[0];
            };
          })(),
          lineno: 150
        }));
        __iced_deferrals._fulfill();
      })(function() {
        var _i, _ref;
        B = buffer_to_ui8a(B);
        for (i = _i = 0, _ref = _this.p; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          if (typeof progress_hook === "function") {
            progress_hook({
              what: "scrypt",
              total: _this.p,
              i: i
            });
          }
          _this.smix({
            B: B.subarray(lim * i),
            V: V,
            XY: XY
          });
        }
        (function(__iced_k) {
          __iced_deferrals = new iced.Deferrals(__iced_k, {
            parent: ___iced_passed_deferral,
            filename: "src/scrypt.iced",
            funcname: "Scrypt.run"
          });
          _this.pbkdf2({
            progress_hook: progress_hook,
            key: key,
            salt: new Buffer(B),
            c: c,
            dkLen: dkLen
          }, __iced_deferrals.defer({
            assign_fn: (function() {
              return function() {
                return out = arguments[0];
              };
            })(),
            lineno: 157
          }));
          __iced_deferrals._fulfill();
        })(function() {
          return cb(out);
        });
      });
    };

    return Scrypt;

  })();

  exports.Scrypt = Scrypt;

  progress_hook = function(obj) {
    return console.log(obj);
  };

}).call(this);