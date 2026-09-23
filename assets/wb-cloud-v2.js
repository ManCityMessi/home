/* 数据同步层（保持 window.WB 接口不变）
 *
 * 唯一数据源：GitHub 仓库 ManCityMessi/home 的 data/state.json
 *
 * 两台通道，按密钥类型自动选择：
 *   1) 写入密钥（32 位随机串）→ Cloudflare 写入代理。快，但 workers.dev 在国内移动网络不通。
 *   2) GitHub 细粒度令牌（github_pat_ 开头）→ 直接调 GitHub API。国内手机可用，稍慢。
 *
 * 读取：按同样规则选通道；都不通时回落同源快照 ./data/state.json（约 1 分钟滞后）。
 * 绑定：在设备上打开一次 <页面>?key=<密钥>，密钥存进该浏览器，之后这台设备就能读写。
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
    timeoutMs: 8000,
    repo: "ManCityMessi/home",
    branch: "main",
    statePath: "data/state.json"
  };

  var LS_GAIN = "gain-2026-v1";
  var LS_SIG = "portfolio-signals-overrides-v1";

  function readLS(k) {
    try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; }
  }
  function isGhToken(k) { return /^(github_pat_|ghp_|gho_|ghs_)/.test(k || ""); }

  /* 绑定：把 ?key= 存进本机并抹掉地址栏参数；?pushlocal=1 表示本机数据覆盖远端 */
  var PUSH_LOCAL = false;
  (function bindKey() {
    try {
      var u = new URL(location.href);
      if (u.searchParams.get("pushlocal")) PUSH_LOCAL = true;
      var k = u.searchParams.get(CFG.keyParam);
      if (!k) return;
      localStorage.setItem(CFG.writeKeyLS, k);
      u.searchParams.delete(CFG.keyParam);
      u.searchParams.delete("pushlocal");
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

  function withTimeout(fn) {
    var ctl = (typeof AbortController === "function") ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, CFG.timeoutMs) : null;
    return fn(ctl ? ctl.signal : undefined).then(function (r) {
      if (timer) clearTimeout(timer);
      return r;
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  /* ---- 通道一：Cloudflare 写入代理 ---- */
  function api(method, p, body) {
    var h = { "content-type": "application/json" };
    var k = writeKey();
    if (k && !isGhToken(k)) h[CFG.writeHeader] = k;
    return withTimeout(function (signal) {
      return fetch(CFG.base + p, {
        method: method,
        headers: h,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: signal
      });
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

  /* ---- 通道二：GitHub API（国内手机可用） ---- */
  var GH_FILE = "/repos/" + CFG.repo + "/contents/" + CFG.statePath;

  function gh(method, p, body, key) {
    var h = { accept: "application/vnd.github+json", authorization: "Bearer " + (key || writeKey()) };
    if (body) h["content-type"] = "application/json";
    return withTimeout(function (signal) {
      return fetch("https://api.github.com" + p, {
        method: method,
        headers: h,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: signal
      });
    }).then(function (r) {
      return r.text().then(function (t) {
        if (!r.ok) {
          var e = new Error(r.status === 401 ? "unauthorized" : r.status === 409 ? "conflict" : "gh " + r.status);
          e.status = r.status;
          throw e;
        }
        try { return t ? JSON.parse(t) : null; } catch (e2) { return null; }
      });
    });
  }

  function ghReadState(key) {
    return gh("GET", GH_FILE + "?ref=" + CFG.branch + "&t=" + Date.now(), null, key).then(function (j) {
      var data = {};
      try { data = JSON.parse(b64decode(j.content || "")); } catch (e) {}
      return { state: (data && data.state) || {}, sha: j.sha };
    });
  }

  function ghWriteState(state, sha, message, key, attempt) {
    var payload = JSON.stringify({ updated: new Date().toISOString(), state: state }, null, 2) + "\n";
    return gh("PUT", GH_FILE, {
      message: message,
      content: b64encode(payload),
      branch: CFG.branch,
      sha: sha
    }, key).catch(function (e) {
      if (attempt !== 2 && (e.status === 409 || e.status === 422)) {
        return ghReadState(key).then(function (f) {
          var merged = f.state || {};
          Object.keys(state).forEach(function (k) { merged[k] = state[k]; });
          return ghWriteState(merged, f.sha, message, key, 2);
        });
      }
      throw e;
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
      var key = writeKey();
      if (!key) return Promise.reject(new Error("no-write-key"));
      var job = isGhToken(key)
        ? ghReadState(key).then(function (f) {
            var state = f.state || {};
            state[k] = val;
            return ghWriteState(state, f.sha, "同步 " + k, key, 1);
          })
        : api("POST", "/state", { k: k, v: val });
      return job.then(function (r) {
        if (r && r.error) throw new Error(r.error);
        clearDown();
        return true;
      }, function (e) { markDown(); throw e; });
    },
    del: function (k) {
      delete WB.data[k];
      var key = writeKey();
      if (!key) return Promise.reject(new Error("no-write-key"));
      var job = isGhToken(key)
        ? ghReadState(key).then(function (f) {
            var state = f.state || {};
            delete state[k];
            return ghWriteState(state, f.sha, "删除 " + k, key, 1);
          })
        : api("DELETE", "/state?k=" + encodeURIComponent(k));
      return job.then(function (r) {
        if (r && r.error) throw new Error(r.error);
        clearDown();
        return true;
      }, function (e) { markDown(); throw e; });
    }
  };

  WB.notify = function (msg) {
    if (typeof WB.onNotify === "function") { try { WB.onNotify(msg); } catch (e) {} }
  };
  WB.putSafe = function (k, val) {
    return WB.put(k, val).catch(function (e) {
      var m = e && e.message;
      if (m === "no-write-key") WB.notify("本机未绑定写入密钥，改动只存在本机（用绑定页绑一次即可同步）");
      else if (m === "unauthorized") WB.notify("写入密钥无效，改动只存在本机");
      else WB.notify("同步失败（网络或权限问题），改动只存在本机");
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

  /* 把本机已有的每日收益 / 持仓改动同步到远端（默认只补缺失；?pushlocal=1 时以本机为准） */
  function migrateLocal() {
    var key = writeKey();
    if (!key) return Promise.resolve();
    var k, g = readLS(LS_GAIN), s = readLS(LS_SIG), jobs = [];
    function needs(v, full) {
      if (!Object.prototype.hasOwnProperty.call(WB.data, full)) return true;
      if (!PUSH_LOCAL) return false;
      try { return JSON.stringify(WB.data[full]) !== JSON.stringify(v); } catch (e) { return false; }
    }
    for (k in g) {
      if (!Object.prototype.hasOwnProperty.call(g, k)) continue;
      if (needs(g[k], "gain:" + k)) jobs.push({ k: "gain:" + k, v: g[k] });
    }
    for (k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
      if (needs(s[k], "signals:" + k)) jobs.push({ k: "signals:" + k, v: s[k] });
    }
    WB.migrated = jobs.length;
    if (!jobs.length) return Promise.resolve();
    jobs.forEach(function (j) { WB.data[j.k] = j.v; });
    if (isGhToken(key)) {
      return ghReadState(key).then(function (f) {
        var state = f.state || {};
        jobs.forEach(function (j) { state[j.k] = j.v; });
        return ghWriteState(state, f.sha, "同步本机数据 " + jobs.length + " 项", key, 1).catch(function () {});
      });
    }
    return api("POST", "/state", jobs.map(function (j) { return { k: j.k, v: j.v }; })).catch(function () {});
  }

  function finish() {
    WB.ready = true;
    mark(WB.error ? "error" : "ready");
    WB._emit();
  }

  function boot() {
    var key = writeKey();
    function snapshot(errState) {
      return readSnapshot()
        .then(function (s) { WB.data = s || {}; WB.mode = "snapshot"; WB.error = errState; })
        .catch(function () { WB.error = errState || "offline"; });
    }

    if (key && isGhToken(key)) {
      ghReadState(key)
        .then(function (f) { WB.data = f.state || {}; WB.mode = "github"; WB.error = null; clearDown(); return migrateLocal(); })
        .catch(function () { markDown(); return snapshot("github-unreachable"); })
        .then(finish);
      return;
    }
    if (recentlyDown()) { snapshot("api-unreachable").then(finish); return; }
    api("GET", "/state")
      .then(function (data) { WB.data = (data && typeof data === "object") ? data : {}; WB.mode = "worker"; WB.error = null; clearDown(); return migrateLocal(); })
      .catch(function () { markDown(); return snapshot("api-unreachable"); })
      .then(finish);
  }

  boot();
})();
