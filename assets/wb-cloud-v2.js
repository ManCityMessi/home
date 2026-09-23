/* 自有后端同步层（替换 WorkBuddy 云服务；保持 window.WB 接口不变）
 *
 * 后端 API：
 *   GET    {BASE}/state        → { "key": value, ... }
 *   POST   {BASE}/state {k,v}  → 写入/更新（需写入密钥）
 *   DELETE {BASE}/state?k=key  → 删除（需写入密钥）
 *
 * 写入密钥绑定：在任一设备打开一次 <页面>?key=<写入密钥> 即绑定到该浏览器，
 * 之后该设备的改动才会写进云端；没绑定的设备是只读的（改动只存本机）。
 *
 * 后端不可用时，回落到同源快照 ./data/state.json（只读）。
 */
(function () {
  "use strict";

  var CFG = {
    base: "https://home-api.mancitymessi.workers.dev",
    writeHeader: "x-wb-write-key",
    writeKeyLS: "wb-write-key",
    keyParam: "key",
    snapshot: "./data/state.json"
  };

  var LS_GAIN = "gain-2026-v1";
  var LS_SIG = "portfolio-signals-overrides-v1";

  function readLS(k) {
    try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; }
  }

  /* 一次性绑定写入密钥，并把 ?key= 从地址栏抹掉 */
  (function bindKey() {
    try {
      var u = new URL(location.href);
      var k = u.searchParams.get(CFG.keyParam);
      if (!k) return;
      localStorage.setItem(CFG.writeKeyLS, k);
      u.searchParams.delete(CFG.keyParam);
      var qs = u.searchParams.toString();
      history.replaceState(null, "", u.pathname + (qs ? "?" + qs : "") + u.hash);
    } catch (e) {}
  })();

  function writeKey() {
    try { return localStorage.getItem(CFG.writeKeyLS) || ""; } catch (e) { return ""; }
  }

  function api(method, p, body, key) {
    var h = { "content-type": "application/json" };
    if (key) h[CFG.writeHeader] = key;
    return fetch(CFG.base + p, {
      method: method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      return r.text().then(function (t) {
        if (!r.ok) {
          var e = new Error(r.status === 401 ? "unauthorized" : "http " + r.status);
          e.status = r.status;
          throw e;
        }
        try { return t ? JSON.parse(t) : null; } catch (e2) { return null; }
      });
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
      var wk = writeKey();
      if (!wk) return Promise.reject(new Error("no-write-key"));
      return api("POST", "/state", { k: k, v: val }, wk).then(function (r) {
        if (r && r.error) throw new Error(r.error);
        return true;
      });
    },
    del: function (k) {
      delete WB.data[k];
      var wk = writeKey();
      if (!wk) return Promise.reject(new Error("no-write-key"));
      return api("DELETE", "/state?k=" + encodeURIComponent(k), null, wk).then(function (r) {
        if (r && r.error) throw new Error(r.error);
        return true;
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
      else if (m === "unauthorized") WB.notify("写入密钥不对，改动只存在本机");
      else WB.notify("写入云端失败，已保存到本机，稍后会自动重试");
    });
  };
  WB.delSafe = function (k) {
    return WB.del(k).catch(function (e) {
      var m = e && e.message;
      if (m === "no-write-key") WB.notify("本机未绑定写入密钥，删除只对本机生效");
      else WB.notify("云端删除失败，请稍后重试");
    });
  };

  window.WB = WB;

  function mark(state) {
    try { document.documentElement.setAttribute("data-cloud", state); } catch (e) {}
  }

  /* 把本机已有的每日收益 / 持仓改动补进后端（只补后端还没有的键） */
  function migrateLocal() {
    var wk = writeKey();
    if (!wk) return Promise.resolve();
    var jobs = [], key, g = readLS(LS_GAIN), s = readLS(LS_SIG);
    for (key in g) {
      if (!Object.prototype.hasOwnProperty.call(g, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(WB.data, "gain:" + key)) jobs.push({ k: "gain:" + key, v: g[key] });
    }
    for (key in s) {
      if (!Object.prototype.hasOwnProperty.call(s, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(WB.data, "signals:" + key)) jobs.push({ k: "signals:" + key, v: s[key] });
    }
    WB.migrated = jobs.length;
    return Promise.all(jobs.map(function (j) {
      WB.data[j.k] = j.v;
      return api("POST", "/state", j, wk).catch(function () {});
    }));
  }

  api("GET", "/state")
    .then(function (data) {
      WB.data = (data && typeof data === "object") ? data : {};
      WB.error = null;
      return migrateLocal();
    })
    .catch(function () {
      return fetch(CFG.snapshot, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.state && typeof j.state === "object") WB.data = j.state;
          else if (j && typeof j === "object") WB.data = j;
          WB.error = "backend-unreachable";
        })
        .catch(function () { WB.error = "backend-unreachable"; });
    })
    .then(function () {
      WB.ready = true;
      mark(WB.error ? "error" : "ready");
      WB._emit();
    });
})();
