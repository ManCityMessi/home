/* ============================================================================
   tech-ui.js — HUD 顶栏 / 实时时钟 / 云端状态 / 首页数据流条
   ----------------------------------------------------------------------------
   只做展示层，不碰任何业务数据；读不到元素就安静跳过。
   ========================================================================== */
(function () {
  "use strict";
  if (window.__techUI) return;
  window.__techUI = true;

  var PAGES = [
    { file: "home3.html", label: "首页" },
    { file: "portfolio.html", label: "投资" },
    { file: "halfmarathon.html", label: "半马" },
    { file: "deepseek.html", label: "DeepSeek" },
    { file: "asu.html", label: "空分 3D" },
    { file: "wujiang.html", label: "婺江路" }
  ];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function $(id) {
    return document.getElementById(id);
  }
  function text(id) {
    var n = $(id);
    return n ? (n.textContent || "").trim() : "";
  }
  function beijing(opt) {
    try {
      return new Intl.DateTimeFormat("zh-CN", Object.assign({ timeZone: "Asia/Shanghai" }, opt)).format(new Date());
    } catch (e) {
      return "";
    }
  }
  function hhmmss() {
    return beijing({ hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }
  function dateLine() {
    var d = new Date();
    var wd = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
    return d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日 · " + wd;
  }

  /* ------------------------------------------------------------- 顶栏 HUD */
  var current = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  function buildBar() {
    var bar = el("div", "t-bar");

    var brand = el("a", "t-brand");
    brand.href = "./home3.html";
    brand.appendChild(el("span", "t-mark", "10"));
    var bt = el("span", "t-brand-txt", "<b>曼城十号梅西</b><i>personal space · v10</i>");
    brand.appendChild(bt);
    bar.appendChild(brand);

    var nav = el("nav", "t-nav");
    PAGES.forEach(function (p) {
      var a = el("a", null, p.label);
      a.href = "./" + p.file;
      if (p.file.toLowerCase() === current) a.className = "on";
      nav.appendChild(a);
    });
    bar.appendChild(nav);

    var meta = el("div", "t-meta");
    meta.appendChild(themeButton());

    var sync = el("span", "t-chip");
    sync.id = "tSync";
    sync.setAttribute("data-state", "wait");
    sync.innerHTML = '<i class="t-dot"></i><span>连接中</span>';
    meta.appendChild(sync);

    var clockChip = el("span", "t-chip t-clock-chip");
    clockChip.innerHTML = '<i class="t-dot"></i><span class="t-clock" id="tClock">--:--:--</span>';
    meta.appendChild(clockChip);
    bar.appendChild(meta);

    var prog = el("div", "t-prog");
    prog.id = "tProg";
    bar.appendChild(prog);

    document.body.insertBefore(bar, document.body.firstChild);

    function tick() {
      var s = hhmmss();
      var c = $("tClock");
      if (c) c.textContent = s;
      var h1 = $("tHeroClock"), h2 = $("tHeroClock2");
      if (h1) h1.textContent = s;
      if (h2) h2.textContent = s;
    }
    tick();
    setInterval(tick, 1000);

    var d = $("tHeroDate");
    if (d) d.textContent = dateLine();

    function onScroll() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* 浅色 / 深色一键切换：选择记在本机，刷新和换页都跟着走 */
  function themeButton() {
    var btn = el("button", "t-theme");
    btn.id = "tTheme";
    btn.type = "button";
    btn.innerHTML =
      '<svg class="t-ic t-ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.7A8.6 8.6 0 0 1 9.3 3.6a8.6 8.6 0 1 0 11.1 11.1z"/></svg>' +
      '<svg class="t-ic t-ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.1"/>' +
      '<path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"/></svg>' +
      '<span class="t-theme-txt"></span>';

    var txt = btn.querySelector(".t-theme-txt");
    function sync() {
      var dark = document.documentElement.classList.contains("t-dark");
      txt.textContent = dark ? "浅色" : "深色";
      var tip = dark ? "切换到浅色主题" : "切换到深色主题";
      btn.setAttribute("title", tip);
      btn.setAttribute("aria-label", tip);
    }
    btn.addEventListener("click", function () {
      var dark = document.documentElement.classList.contains("t-dark");
      var next = dark ? "light" : "dark";
      document.documentElement.classList.remove("t-light", "t-dark");
      document.documentElement.classList.add("t-" + next);
      try { localStorage.setItem("tech-theme", next); } catch (e) {}
      sync();
    });
    sync();
    return btn;
  }

  /* 云端状态：等 WB 就绪后显示「云端已同步 / 本地快照 / 未绑定写入密钥」 */
  function watchSync() {
    var chip = $("tSync");
    var heroSync = $("tHeroSync");
    var heroStatus = $("tHeroStatus");
    var tries = 0;

    function paint() {
      var wb = window.WB;
      var keys = wb && wb.data ? Object.keys(wb.data).length : 0;
      var bound = false;
      try { bound = !!localStorage.getItem("wb-write-key"); } catch (e) {}
      var state = "wait", label = "连接中", hero = "正在检查云端…";
      var hasCloudScript = !!document.querySelector('script[src*="wb-cloud"]');
      if (wb && wb.ready) {
        if (keys > 0) {
          state = "ok";
          label = bound ? "云端已同步" : "云端 · 只读";
          hero = bound
            ? "已连接云端 · 共 " + keys + " 条记录 · 本机可写入"
            : "已连接云端 · 共 " + keys + " 条记录 · 本机未绑定写入密钥";
        } else {
          state = "warn";
          label = "本地快照";
          hero = "云端暂不可达 · 当前使用本地快照数据";
        }
      } else if (!hasCloudScript) {
        /* 这一页本来就不接云端（例如婺江路 / 绑定页），直接标注本地数据 */
        state = "local";
        label = "本地数据";
        hero = "这一页不读写云端 · 内容随站点一起发布";
      } else if (tries > 12) {
        state = "warn";
        label = "离线可用";
        hero = "未连上云端 · 页面按本地数据渲染";
      }
      if (chip) {
        chip.setAttribute("data-state", state);
        var t = chip.querySelector("span");
        if (t) t.textContent = label;
      }
      if (heroSync) {
        heroSync.setAttribute("data-state", state);
        var t2 = heroSync.querySelector("span");
        if (t2) t2.textContent = state === "ok" ? "云端已同步" : (state === "warn" ? "本地快照" : "连接中");
      }
      if (heroStatus) heroStatus.textContent = hero;
    }

    var ticks = 0;
    paint();
    if (window.WB && window.WB.onReady) window.WB.onReady(paint);
    var iv = setInterval(function () {
      tries++;
      ticks++;
      paint();
      if (window.WB && window.WB.ready) clearInterval(iv);
      if (tries > 14) clearInterval(iv);
    }, 900);
  }

  /* --------------------------------------------------- 首页数据流（LIVE）*/
  var TICKS = [
    { label: "DeepSeek 余额", from: "dsBal", tone: "acc" },
    { label: "近 24h 消耗", from: "dsUsed", tone: "warm" },
    { label: "今日收益", from: "mToday", tone: "sign" },
    { label: "年内收益", from: "mYear", tone: "sign" },
    { label: "本周训练", from: "hmDone2", tone: "acc" },
    { label: "今天要练", from: "hmWhat", tone: "" }
  ];

  function buildTicker() {
    var box = $("tTickerTrack");
    if (!box) return;
    var live = TICKS.filter(function (t) { return document.getElementById(t.from); });
    if (!live.length) return;
    var wrap = $("tTicker");
    if (wrap) wrap.hidden = false;

    live.forEach(function (t) {
      var item = el("span", "t-tick");
      item.innerHTML = "<i>" + t.label + "</i><b data-tone=\"" + t.tone + "\">—</b>";
      item.setAttribute("data-from", t.from);
      box.appendChild(item);
    });

    function sign(v) {
      if (/^[+\uFF0B]/.test(v)) return "up";
      if (/^[-\u2212]/.test(v)) return "down";
      return "";
    }
    function paint() {
      var ticks = box.querySelectorAll(".t-tick");
      Array.prototype.forEach.call(ticks, function (node) {
        var src = text(node.getAttribute("data-from"));
        var b = node.querySelector("b");
        if (!b) return;
        if (src && src !== "—") {
          if (b.textContent !== src) b.textContent = src;
          var tone = b.getAttribute("data-tone");
          var cls = tone === "sign" ? sign(src) : (tone || "");
          if (b.className !== cls) b.className = cls;
        }
      });
    }
    paint();
    setInterval(paint, 1200);

    /* 源元素被脚本改写时立刻同步 */
    if (window.MutationObserver) {
      var mo = new MutationObserver(paint);
      live.forEach(function (t) {
        var n = document.getElementById(t.from);
        if (n) mo.observe(n, { childList: true, characterData: true, subtree: true });
      });
    }
    if (window.WB && window.WB.onReady) window.WB.onReady(paint);
  }

  /* 卡片依次浮入（错开 60ms，最多 8 张） */
  function stagger() {
    var nodes = document.querySelectorAll(".card, .kpi, .panel");
    Array.prototype.slice.call(nodes, 0, 8).forEach(function (n, i) {
      if (n.className.indexOf("t-hero") >= 0) return;
      n.style.animationDelay = 60 + i * 60 + "ms";
    });
  }

  /* ------------------------------------- 首页卡片里的微型数据图（仅首页） */
  function sparkline() {
    var src = $("dsBal");
    if (!src) return;
    var col = src.closest ? src.closest(".mcol") : null;
    if (!col) return;
    var box = $("tSpark");
    if (!box) {
      box = el("div", "t-spark");
      box.id = "tSpark";
      box.innerHTML =
        '<div class="t-spark-k"><i></i><span>近 7 天余额走势</span><b id="tSparkDelta">—</b></div>' +
        '<svg viewBox="0 0 240 52" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs><linearGradient id="tSparkFill" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="currentColor" stop-opacity=".34"/>' +
        '<stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' +
        '<path id="tSparkArea" d="" fill="url(#tSparkFill)" stroke="none"/>' +
        '<path id="tSparkLine" d="" fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle id="tSparkDot" r="2.6" fill="currentColor" cx="0" cy="0"/>' +
        "</svg>";
      col.appendChild(box);
    }

    function records() {
      var d = (window.WB && window.WB.data) || {};
      var out = [];
      for (var k in d) {
        if (k.indexOf("deepseek:") === 0 && d[k] && typeof d[k].bal === "number") {
          out.push({ k: k, bal: d[k].bal });
        }
      }
      out.sort(function (a, b) { return a.k < b.k ? -1 : 1; });
      return out;
    }

    function paint() {
      var recs = records();
      if (recs.length < 2) {
        box.classList.remove("on");
        return;
      }
      box.classList.add("on");
      var win = recs.slice(-7);
      var vals = win.map(function (r) { return r.bal; });
      var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      if (max === min) { max = min + 1; }
      var W = 240, H = 52, pad = 4;
      var pts = vals.map(function (v, i) {
        var x = (i / (vals.length - 1)) * W;
        var y = H - pad - ((v - min) / (max - min)) * (H - pad * 2);
        return [x, y];
      });
      var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
      var area = line + " L" + W + " " + H + " L0 " + H + " Z";
      var ln = $("tSparkLine"), ar = $("tSparkArea"), dt = $("tSparkDot");
      if (ln) ln.setAttribute("d", line);
      if (ar) ar.setAttribute("d", area);
      if (dt) { dt.setAttribute("cx", pts[pts.length - 1][0].toFixed(1)); dt.setAttribute("cy", pts[pts.length - 1][1].toFixed(1)); }
      var d = $("tSparkDelta");
      if (d) {
        var diff = vals[vals.length - 1] - vals[0];
        if (Math.abs(diff) < 0.005) { d.textContent = "持平"; d.className = ""; }
        else {
          d.textContent = (diff > 0 ? "+" : "−") + "¥" + Math.abs(diff).toFixed(2);
          d.className = diff > 0 ? "up" : "down";
        }
      }
    }
    paint();
    if (window.WB && window.WB.onReady) window.WB.onReady(paint);
    setInterval(paint, 4000);
  }

  function weekRing() {
    var src = $("hmDone2");
    if (!src) return;
    var col = src.closest ? src.closest(".mcol") : null;
    if (!col) return;
    var box = $("tRing");
    if (!box) {
      box = el("div", "t-ring");
      box.id = "tRing";
      box.innerHTML =
        '<div class="ring" id="tRingDial"><b id="tRingNum">—</b></div>' +
        '<div class="t-ring-txt"><i>本周训练完成度</i><span id="tRingSub">—</span></div>';
      var stats = col.querySelector(".stats");
      if (stats && stats.parentNode === col) col.insertBefore(box, stats.nextSibling);
      else col.appendChild(box);
    }

    function paint() {
      var m = text("hmDone2").match(/(\d+)\s*\/\s*(\d+)/);
      var dial = $("tRingDial"), num = $("tRingNum"), sub = $("tRingSub");
      if (!m) {
        box.classList.remove("on");
        return;
      }
      var done = +m[1], all = +m[2];
      var pct = all > 0 ? Math.round((done / all) * 100) : 0;
      box.classList.add("on");
      if (dial) dial.style.setProperty("--p", pct);
      if (num) num.textContent = done + "/" + all;
      if (sub) sub.textContent = pct >= 100 ? "本周计划全部完成 🎉" : ("已完成 " + pct + "% · 还差 " + (all - done) + " 次");
    }
    paint();
    if (window.WB && window.WB.onReady) window.WB.onReady(paint);
    if (window.MutationObserver) {
      new MutationObserver(paint).observe(src, { childList: true, characterData: true, subtree: true });
    }
  }

  function boot() {
    buildBar();
    watchSync();
    buildTicker();
    stagger();
    sparkline();
    weekRing();
    document.documentElement.classList.add("t-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
