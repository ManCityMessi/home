/* 数据同步层（保持 window.WB 接口不变）
 *
 * 数据存在 GitHub 仓库的 data/state.json（唯一数据源）。
 * 两条通道：
 *   1) 写入代理（Cloudflare Worker，地址见 CFG.base）—— 读取最新、写入即时；
 *      国内移动网络访问不到该域名，属正常现象。
 *   2) 同源快照 ./data/state.json —— 由 GitHub Pages 提供，任何网络都能读，
 *      但滞后于最近一次提交（约 1 分钟，等于 Pages 重建时间）。
 *
 * 读取：先试写入代理；失败（或被记忆为不可达）则回落同源快照。
 * 写入：需要写入密钥（<页面>?key=密钥 绑定一次，存本机）；没绑定的设备只读。
 */
(function () {
  "use strict";

  var CFG = {
    base: "https://home-api.mancitymessi.workers.dev",
    writeHeader: "x-wb-write-key",
    writeKeyLS: "wb-write-key",
    downLS: "wb-api-down",
    downForMs: 6 * 3600 * 1000,
    keyParam: "key",
    snapshot: "./data/state.json",
    timeoutMs: 6000
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
  function recentlyDown() {
    try {
      var t = parseInt(localStorage.getItem(CFG.downLS) || "0", 10) || 0;
      return t > 0 && (Date.now() - t) < CFG.downForMs;
    } catch (e) { return false; }
  }
  function markDown() { try { localStorage.setItem(CFG.downLS, String(Date.now())); } catch (e) {} }
  function clearDown() { try { localStorage.removeItem(CFG.downLS); } catch (e) {} }

  function api(method, p, body) {
    var h = { "content-type": "application/json" };
    var k = writeKey();
    if (k) h[CFG.writeHeader] = k;
    var ctl = (typeof AbortController === "function") ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, CFG.timeoutMs) : null;
    return fetch(CFG.base + p, {
      method: method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.text().then(function (t) {
        if (!r.ok) {
          var e = new Error(r.status === 401 ? "unauthorized" : "http " + r.status);
          e.status = r.status;
          throw e;
        }
        try { return t ? JSON.parse(t) : null; } catch (e2) { return null; }
      });
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function readSnapshot() {
    return fetch(CFG.snapshot + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.state && typeof j.state === "object") return j.state;
        return (j && typeof j === "object") ? j : {};
      });
  }

  var WB = {
    ready: false,
    error: null,
    mode: "",
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
      if (!writeKey()) return Promise.reject(new Error("no-write-key"));
      return api("POST", "/state", { k: k, v: val }).then(function (r) {
        if (r && r.error) throw new Error(r.error);
        clearDown();
        return true;
      }, function (e) {
        markDown();
        throw e;
      });
    },
    del: function (k) {
      delete WB.data[k];
      if (!writeKey()) return Promise.reject(new Error("no-write-key"));
      return api("DELETE", "/state?k=" + encodeURIComponent(k)).then(function (r) {
        if (r && r.error) throw new Error(r.error);
        clearDown();
        return true;
      }, function (e) {
        markDown();
        throw e;
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
      else WB.notify("网络不通（当前设备连不上写入服务），改动只存在本机");
    });
  };
  WB.delSafe = function (k) {
    return WB.del(k).catch(function (e) {
      if (e && e.message === "no-write-key") WB.notify("本机未绑定写入密钥，删除只对本机生效");
      else WB.notify("删除同步失败，请稍后重试");
    });
  };

  window.WB = WB;

  function mark(state) {
    try { document.documentElement.setAttribute("data-cloud", state); } catch (e) {}
  }

  /* 把本机已有的每日收益 / 持仓改动补进远端（只补远端还没有的键） */
  function migrateLocal() {
    if (!writeKey()) return Promise.resolve();
    var key, g = readLS(LS_GAIN), s = readLS(LS_SIG), jobs = [];
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
      return api("POST", "/state", j).catch(function () {});
    }));
  }

  function boot() {
    function useSnapshot(errState) {
      return readSnapshot()
        .then(function (s) { WB.data = s || {}; WB.mode = "snapshot"; WB.error = errState; })
        .catch(function () { WB.mode = "offline"; WB.error = errState || "offline"; });
    }
    var first;
    if (recentlyDown()) {
      first = useSnapshot("api-unreachable");
    } else {
      first = api("GET", "/state")
        .then(function (data) {
          WB.data = (data && typeof data === "object") ? data : {};
          WB.mode = "live";
          WB.error = null;
          clearDown();
          return migrateLocal();
        })
        .catch(function () {
          markDown();
          return useSnapshot("api-unreachable");
        });
    }
    first.then(function () {
      WB.ready = true;
      mark(WB.error ? "error" : "ready");
      WB._emit();
    });
  }

  boot();
})();
