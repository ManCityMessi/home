/* ============================================================================
   site-nav.js — 站点通用顶部导航条
   ----------------------------------------------------------------------------
   自包含：样式全部注入在本片内，类名统一 sn- 前缀，只影响导航条本身，
   不改动宿主页面的任何既有样式与变量（用于 portfolio.html 这类独立快照页）。
   用法：在 </body> 前加 <script src="./assets/site-nav.js"></script>
   ========================================================================== */
(function () {
  if (window.__SN_MOUNTED) return;
  window.__SN_MOUNTED = true;

  var H = 58;
  var PAGES = [
    { file: "home3.html", label: "首页" },
    { file: "daily-consultation.html", label: "每日资讯" },
    { file: "portfolio.html", label: "投资" },
    { file: "halfmarathon.html", label: "半马" },
    { file: "deepseek.html", label: "DeepSeek" },
    { file: "asu.html", label: "空分 3D" },
    { file: "wujiang.html", label: "婺江路" },
    { file: "travel-map.html", label: "旅行地图" }
  ];

  var css = [
    '.sn-bar{position:fixed;top:0;left:0;right:0;z-index:9000;height:' + H + 'px;box-sizing:border-box;',
    'display:flex;align-items:center;gap:18px;padding:0 clamp(12px,3.5vw,30px);',
    'background:rgba(8,13,24,.84);border-bottom:1px solid rgba(122,168,255,.16);',
    'backdrop-filter:saturate(180%) blur(16px);-webkit-backdrop-filter:saturate(180%) blur(16px);',
    'font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;',
    'line-height:1.4;text-align:left}',
    '.sn-bar:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;',
    'background:linear-gradient(90deg,transparent,rgba(79,140,255,.6),rgba(34,211,238,.45),transparent)}',
    '.sn-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#e8eefb;flex:none}',
    '.sn-mark{width:32px;height:32px;border-radius:11px;display:grid;place-items:center;',
    'font:800 15px/1 ui-monospace,"SFMono-Regular",Consolas,monospace;color:#fff;',
    'background:linear-gradient(140deg,#4f8cff,#a06bff);',
    'box-shadow:0 9px 22px -10px rgba(79,140,255,.75),inset 0 0 0 1px rgba(255,255,255,.28)}',
    '.sn-txt b{display:block;font-size:13.5px;font-weight:700;letter-spacing:.01em;color:#e8eefb}',
    '.sn-txt i{display:block;font-style:normal;font-size:10.5px;color:#6b7a97;letter-spacing:.06em}',
    '.sn-nav{display:flex;align-items:center;gap:4px;overflow-x:auto;overflow-y:hidden;',
    'scrollbar-width:none;-ms-overflow-style:none;flex:1 1 auto;min-width:0}',
    '.sn-nav::-webkit-scrollbar{display:none}',
    '.sn-nav a{flex:none;color:#9aabc7;text-decoration:none;font-size:12.5px;font-weight:600;',
    'padding:7px 11px;border-radius:999px;white-space:nowrap;transition:background .18s,color .18s}',
    '.sn-nav a:hover{color:#e8eefb;background:rgba(122,168,255,.13)}',
    '.sn-nav a.on{color:#0a1220;background:linear-gradient(135deg,#7fb0ff,#4f8cff);',
    'box-shadow:0 6px 16px -10px rgba(79,140,255,.95)}',
    '.sn-meta{flex:none;display:flex;align-items:center;gap:8px}',
    '.sn-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;',
    'background:rgba(18,28,48,.75);border:1px solid rgba(122,168,255,.16);color:#9aabc7;',
    'font-size:11.5px;font-variant-numeric:tabular-nums}',
    '.sn-dot{width:6px;height:6px;border-radius:50%;background:#2ebd85;box-shadow:0 0 8px #2ebd85}',
    '.sn-dot.idle{background:#6b7a97;box-shadow:0 0 8px rgba(107,122,151,.7)}',
    '.sn-btn{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;',
    'background:rgba(18,28,48,.75);border:1px solid rgba(122,168,255,.16);color:#9aabc7;',
    'font:600 11.5px/1 inherit;cursor:pointer;transition:background .18s,color .18s,border-color .18s}',
    '.sn-btn:hover{color:#e8eefb;background:rgba(122,168,255,.16);border-color:rgba(122,168,255,.3)}',
    '.sn-btn svg{width:13px;height:13px;display:block}',
    '.sn-bar.sn-light{background:rgba(246,248,253,.9);border-bottom:1px solid rgba(23,46,99,.12)}',
    '.sn-bar.sn-light:after{background:linear-gradient(90deg,transparent,rgba(47,107,255,.45),rgba(18,194,233,.35),transparent)}',
    '.sn-bar.sn-light .sn-brand,.sn-bar.sn-light .sn-txt b{color:#101a33}',
    '.sn-bar.sn-light .sn-txt i{color:#6b7793}',
    '.sn-bar.sn-light .sn-nav a{color:#4a5670}',
    '.sn-bar.sn-light .sn-nav a:hover{color:#101a33;background:rgba(47,107,255,.09)}',
    '.sn-bar.sn-light .sn-nav a.on{color:#fff;background:linear-gradient(135deg,#6a9bff,#3f6ff5)}',
    '.sn-bar.sn-light .sn-chip,.sn-bar.sn-light .sn-btn{background:rgba(255,255,255,.85);',
    'border-color:rgba(23,46,99,.12);color:#4a5670}',
    '.sn-bar.sn-light .sn-btn:hover{color:#101a33;background:#fff;border-color:rgba(47,107,255,.35)}',
    '@media(max-width:900px){.sn-txt{display:none}}',
    '@media(max-width:680px){.sn-clock{display:none}.sn-bar{gap:10px}}'
  ].join('');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function clockText() {
    var d = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 60000);
    var p = function (x) { return String(x).padStart(2, '0'); };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function mount() {
    if (document.querySelector('.sn-bar')) return;

    var style = document.createElement('style');
    style.id = 'sn-style';
    style.textContent = css;
    document.head.appendChild(style);

    var bar = el('div', 'sn-bar');

    var brand = el('a', 'sn-brand');
    brand.href = './home3.html';
    brand.title = '返回首页';
    brand.appendChild(el('span', 'sn-mark', '10'));
    var txt = el('span', 'sn-txt');
    txt.appendChild(el('b', null, '曼城十号梅西'));
    txt.appendChild(el('i', null, 'personal space · v10'));
    brand.appendChild(txt);
    bar.appendChild(brand);

    var nav = el('nav', 'sn-nav');
    nav.setAttribute('aria-label', '站点导航');
    var cur = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    PAGES.forEach(function (p) {
      var a = el('a', null, p.label);
      a.href = './' + p.file;
      if (p.file.toLowerCase() === cur) {
        a.className = 'on';
        a.setAttribute('aria-current', 'page');
      }
      nav.appendChild(a);
    });
    bar.appendChild(nav);

    var meta = el('div', 'sn-meta');

    // 主题切换：写入 localStorage.tech-theme，与 tech-ui 其他页共用；本条的配色同步切换
    var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6"/></svg>';
    var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 13.6A8.4 8.4 0 1 1 10.4 4a6.7 6.7 0 0 0 9.6 9.6Z"/></svg>';

    function readTheme() {
      try { return localStorage.getItem('tech-theme') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; }
    }
    function paintTheme(t) {
      bar.classList.toggle('sn-light', t === 'light');
      themeBtn.innerHTML = (t === 'light' ? MOON : SUN) + '<span>' + (t === 'light' ? '深色' : '浅色') + '</span>';
    }
    var themeBtn = el('button', 'sn-btn');
    themeBtn.type = 'button';
    themeBtn.title = '切换全站主题（其他页面共用该设置）';
    themeBtn.setAttribute('aria-label', '切换全站主题');
    themeBtn.addEventListener('click', function () {
      var next = bar.classList.contains('sn-light') ? 'dark' : 'light';
      try { localStorage.setItem('tech-theme', next); } catch (e) {}
      paintTheme(next);
    });
    paintTheme(readTheme());
    meta.appendChild(themeBtn);

    // 数据状态：接了 WorkBuddy 云 SDK 才可能"已同步"，本页为静态快照
    var status = el('span', 'sn-chip');
    status.appendChild(el('i', 'sn-dot idle'));
    status.appendChild(el('span', 'sn-status-txt', '静态快照'));
    status.title = '本页为仓库内静态数据快照，随站点发布更新';
    function paintStatus() {
      var ok = !!(window.WB && window.WB.ready && !window.WB.error);
      status.firstChild.className = 'sn-dot' + (ok ? '' : ' idle');
      status.lastChild.textContent = ok ? '云端已同步' : '静态快照';
      status.title = ok ? 'WorkBuddy 云端数据已加载' : '本页为仓库内静态数据快照，随站点发布更新';
    }
    paintStatus();
    if (window.WB && typeof window.WB.onReady === 'function') window.WB.onReady(paintStatus);
    meta.appendChild(status);

    var clockChip = el('span', 'sn-chip');
    clockChip.appendChild(el('i', 'sn-dot'));
    var ck = el('span', 'sn-clock', clockText());
    clockChip.appendChild(ck);
    meta.appendChild(clockChip);
    bar.appendChild(meta);

    document.body.appendChild(bar);
    document.body.style.setProperty('padding-top', H + 'px', 'important');

    setInterval(function () { ck.textContent = clockText(); }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
