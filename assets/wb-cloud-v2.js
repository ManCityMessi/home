/* 数据同步层：以 GitHub 仓库为唯一数据源（保持 window.WB 接口不变）
 *
 * 为什么不用服务器：Cloudflare workers.dev 在国内移动网络打不开（实测），
 * 所以数据放在仓库里的 data/state.json，读取走 github.io 同源，写入走 GitHub API。
 *
 * 读取：
 *   - 已绑定密钥的设备：走 api.github.com 读仓库文件（提交后几秒即最新）
 *   - 未绑定的设备：读同源快照 ./data/state.json（跟随 Pages 重建，约 1 分钟）
 * 写入：
 *   - 需要细粒度 GitHub token（Contents: Read and write），
 *     在任一设备打开一次 <页面>?key=<token> 绑定到该浏览器；
 *     没绑定的设备是只读的，改动只存本机。
 *   - 连续修改会合并成一次提交（默认 1.2 秒内合并）。
 */
(function () {
  "use strict";

  var CFG = {
    repo: "ManCityMessi/home",
    branch: "main",
    statePath: "data/state.json",
    snapshot: "./data/state.json",
    tokenLS: "wb-gh-token",
    keyParam: "key",
    timeoutMs: 12000,
    debounceMs: 1200
  };

  var LS_GAIN = "gain-2026-v1";
  var LS_SIG = "portfolio-signals-overrides-v1";

  function readLS(k) {
    try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; }
  }

  /* 一次性绑定密钥，并把 ?key= 从地址栏抹掉 */
  (function bindKey() {
    try {
      var u = new URL(location.href);
      var k = u.searchParams.get(CFG.keyParam);
      if (!k) return;
      localStorage.setItem(CFG.tokenLS, k);
      u.searchParams.delete(CFG.keyParam);
      var qs = u.searchParams.toString();
      history.replaceState(null, "", u.pathname + (qs ? "?" + qs : "") + u.hash);
    } catch (e) {}
  })();

  function token() {
    try { return localStorage.getItem(CFG.tokenLS) || ""; } catch (e) { return ""; }
  }

  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function gh(method, p, body) {
    var tok = token();
    var headers = { accept: "application/vnd.github+json" };
    if (tok) headers.authorization = "Bearer " + tok;
    if (body) headers["content-type"] = "application/json";
    var ctl = (typeof AbortController === "function") ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, CFG.timeoutMs) : null;
    return fetch("https://api.github.com" + p, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.text().then(function (t) {
        if (!r.ok) {
          var e = new Error(r.status === 401 ? "unauthorized" : r.status === 409 ? "conflict" : "http " + r.status);
          e.status = r.status;
          e.body = t.slice(0, 200);
          throw e;
        }
        try { return t ? JSON.parse(t) : null; } catch (e2) { return null; }
      });
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  var filePath = "/repos/" + CFG.repo + "/contents/" + CFG.statePath;

  /* 读仓库文件：返回 { state, sha } */
  function readRemote() {
    return gh("GET", filePath + "?ref=" + CFG.branch).then(function (j) {
      var data = JSON.parse(b64decode(j.content || ""));
      return { state: (data && data.state) || {}, sha: j.sha };
    });
  }

  function writeRemote(state, sha, message) {
    var payload = JSON.stringify({ updated: new Date().toISOString(), state: state }, null, 2) + "\n";
    var body = { message: message, content: b64encode(payload), branch: CFG.branch };
    if (sha) body.sha = sha;
    return gh("PUT", filePath, body);
  }

  function readSnapshot() {
    return fetch(CFG.snapshot + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.state && typeof j.state === "object") return j.state;
        return (j && typeof j === "object") ? j : {};
      });
  }

  /* ---- 写入队列：合并短时间内的多次改动，一次提交 ---- */
  var pending = {};      // k -> {v} 或 {del:true}
  var waiters = [];      // {res, rej}
  var flushTimer = null;

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(function () { flush(); }, CFG.debounceMs);
  }

  function settle(ok, err) {
    var ws = waiters; waiters = [];
    ws.forEach(function (w) { ok ? w.res(true) : w.rej(err); });
  }

  function flush(retry) {
    flushTimer = null;
    var batch = pending; pending = {};
    var keys = Object.keys(batch);
    if (!keys.length) return;
    if (!token()) { settle(false, new Error("no-write-key")); return; }

    readRemote()
      .then(function (f) {
        var state = f.state || {};
        keys.forEach(function (k) {
          if (batch[k].del) delete state[k];
          else state[k] = batch[k].v;
        });
        var label = keys.length === 1 ? keys[0] : (keys.length + " 项");
        return writeRemote(state, f.sha, "同步 " + label);
      })
      .then(function () { settle(true); })
      .catch(function (e) {
        var msg = (e && e.message) || "";
        if (!retry && (msg === "conflict" || msg === "http 409")) {
          keys.forEach(function (k) { if (!(k in pending)) pending[k] = batch[k]; });
          waiters.length = 0;
          return flush(true);
        }
        settle(false, e);
      });
  }

  var WB = {
    ready: false,
    error: null,
    data: {},
    migrated: 0,
    _subs: [],
    onReady: function (fn) {
      if (WB.ready) { try { fn(); } catch (e) {} } else { WB._subs.push(fn); }
    },
    _emit: function () {
      var fns = WB._subs; WB._subs = [];
      fns.forEach(function (f) { try { f(); } catch (e) {} });
    },
    put: function (k, val) {
      WB.data[k] = val;
      if (!token()) return Promise.reject(new Error("no-write-key"));
      return new Promise(function (res, rej) {
        pending[k] = { v: val };
        waiters.push({ res: res, rej: rej });
        scheduleFlush();
      });
    },
    del: function (k) {
      delete WB.data[k];
      if (!token()) return Promise.reject(new Error("no-write-key"));
      return new Promise(function (res, rej) {
        pending[k] = { del: true };
        waiters.push({ res: res, rej: rej });
        scheduleFlush();
      });
    }
  };

  WB.notify = function (msg) {
    if (typeof WB.onNotify === "function") { try { WB.onNotify(msg); } catch (e) {} }
  };
  WB.putSafe = function (k, val) {
    return WB.put(k, val).catch(function (e) {
      var m = e && e.message;
      if (m === "no-write-key") WB.notify("本机未绑定写入密钥，改动只存在本机（打开 网址?key=密钥 一次即可同步）");
      else if (m === "unauthorized") WB.notify("写入密钥失效，改动只存在本机");
      else WB.notify("同步失败，已保存到本机，稍后会自动重试");
    });
  };
  WB.delSafe = function (k) {
    return WB.del(k).catch(function (e) {
      if (e && e.message === "no-write-key") WB.notify("本机未绑定写入密钥，删除只对本机生效");
      else WB.notify("同步失败，请稍后重试");
    });
  };

  window.WB = WB;

  function mark(state) {
    try { document.documentElement.setAttribute("data-cloud", state); } catch (e) {}
  }

  /* 把本机已有的每日收益 / 持仓改动补进仓库（只补仓库里还没有的键） */
  function migrateLocal() {
    if (!token()) return Promise.resolve();
    var key, jobs = [], g = readLS(LS_GAIN), s = readLS(LS_SIG);
    for (key in g) {
      if (!Object.prototype.hasOwnProperty.call(g, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(WB.data, "gain:" + key)) jobs.push({ k: "gain:" + key, v: g[key] });
    }
    for (key in s) {
      if (!Object.prototype.hasOwnProperty.call(s, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(WB.data, "signals:" + key)) jobs.push({ k: "signals:" + key, v: s[key] });
    }
    WB.migrated = jobs.length;
    if (!jobs.length) return Promise.resolve();
    jobs.forEach(function (j) { WB.data[j.k] = j.v; pending[j.k] = { v: j.v }; });
    return new Promise(function (res) {
      waiters.push({ res: function () { res(true); }, rej: function () { res(true); } });
      scheduleFlush();
    });
  }

  /* 启动：绑定密钥的走 API，没绑定的走同源快照 */
  (function boot() {
    if (token()) {
      readRemote()
        .then(function (f) {
          WB.data = f.state || {};
          WB.error = null;
          return migrateLocal();
        })
        .catch(function () {
          WB.error = "api-unreachable";
          return readSnapshot().then(function (s) { WB.data = s || {}; }).catch(function () {});
        })
        .then(function () {
          WB.ready = true;
          mark(WB.error ? "error" : "ready");
          WB._emit();
        });
    } else {
      readSnapshot()
        .then(function (s) { WB.data = s || {}; WB.error = "read-only"; })
        .catch(function () { WB.error = "read-only"; })
        .then(function () {
          WB.ready = true;
          mark("error");
          WB._emit();
        });
    }
  })();
})();
