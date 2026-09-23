/* 云端数据同步（WorkBuddy Cloud Service）
   收益记录与持仓修改保存在云端，任何设备打开都看到同一份数据。
   键规则：gain:<日期> 每日收益覆盖值；signals:<股票id> 持仓修改。 */
(function () {
  "use strict";

  var CFG = {
    endpoint: "https://personal-homepage-12568.app.workbuddy.host",
    publishableKey: "wbpk_QJczmdjZF1FclKiSlDwaC9_nOLurRdLh7vbqU5i5BEgbgVYzCDn0SnD"
  };

  var LS_GAIN = "gain-2026-v1";
  var LS_SIG = "portfolio-signals-overrides-v1";

  function readLS(k) {
    try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; }
  }

  var WB = {
    ready: false,
    error: null,
    data: {},
    migrated: 0,
    _subs: [],
    _db: null,
    onReady: function (fn) {
      if (WB.ready) { try { fn(); } catch (e) {} } else { WB._subs.push(fn); }
    },
    _emit: function () {
      var fns = WB._subs; WB._subs = [];
      fns.forEach(function (f) { try { f(); } catch (e) {} });
    },
    put: function (k, val) {
      WB.data[k] = val;
      if (!WB._db) return Promise.reject(new Error("cloud-offline"));
      return WB._db.from("app_state").upsert({ k: k, v: { v: val } }, { onConflict: "k" })
        .then(function (r) { if (r && r.error) throw r.error; return true; });
    },
    del: function (k) {
      delete WB.data[k];
      if (!WB._db) return Promise.reject(new Error("cloud-offline"));
      return WB._db.from("app_state").delete().eq("k", k)
        .then(function (r) { if (r && r.error) throw r.error; return true; });
    }
  };
  WB.notify = function (msg) {
    if (typeof WB.onNotify === "function") { try { WB.onNotify(msg); } catch (e) {} }
  };
  WB.putSafe = function (k, val) {
    return WB.put(k, val).catch(function () { WB.notify("云端同步失败，已保存到本机，稍后会自动重试"); });
  };
  WB.delSafe = function (k) {
    return WB.del(k).catch(function () { WB.notify("云端同步失败，请稍后重试"); });
  };
  window.WB = WB;

  function mark(state) {
    try { document.documentElement.setAttribute("data-cloud", state); } catch (e) {}
  }

  try {
    if (window.WorkBuddyCloud && window.WorkBuddyCloud.createWorkBuddyCloud) {
      WB._db = window.WorkBuddyCloud.createWorkBuddyCloud(CFG).database;
    }
  } catch (e) { WB._db = null; }

  if (!WB._db) {
    WB.ready = true; WB.error = "sdk-unavailable";
    mark("error");
    WB._emit();
    return;
  }

  WB._db.from("app_state").select("k,v").then(function (res) {
    if (res && res.error) throw res.error;
    var jobs = [];
    ((res && res.data) || []).forEach(function (row) {
      var val = (row && row.v && typeof row.v === "object" &&
        Object.prototype.hasOwnProperty.call(row.v, "v")) ? row.v.v : null;
      WB.data[row.k] = val;
    });
    var g = readLS(LS_GAIN), s = readLS(LS_SIG), key;
    for (key in g) {
      if (!Object.prototype.hasOwnProperty.call(g, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(WB.data, "gain:" + key)) {
        WB.data["gain:" + key] = g[key];
        jobs.push({ k: "gain:" + key, v: { v: g[key] } });
      }
    }
    for (key in s) {
      if (!Object.prototype.hasOwnProperty.call(s, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(WB.data, "signals:" + key)) {
        WB.data["signals:" + key] = s[key];
        jobs.push({ k: "signals:" + key, v: { v: s[key] } });
      }
    }
    if (jobs.length) {
      WB.migrated = jobs.length;
      return WB._db.from("app_state").upsert(jobs, { onConflict: "k" }).then(function (r) {
        if (r && r.error) throw r.error;
      });
    }
  }).then(function () {
    WB.ready = true;
    mark("ready");
    WB._emit();
  }).catch(function (e) {
    WB.ready = true;
    WB.error = (e && (e.message || e.hint || e.code)) || "sync-failed";
    mark("error");
    WB._emit();
  });
})();

/* 地址栏保持干净：抹掉站内自动追加的 ?t=<时间戳>（仅匹配纯数字时间戳，不影响其它参数） */
(function () {
  try {
    var href = location.href;
    if (!/[?&]t=\d{10,}/.test(href)) return;
    var u = new URL(href);
    u.searchParams.delete("t");
    var qs = u.searchParams.toString();
    history.replaceState(null, "", u.pathname + (qs ? "?" + qs : "") + u.hash);
  } catch (e) {}
})();
