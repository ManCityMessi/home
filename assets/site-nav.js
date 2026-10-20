/* ============================================================================
   site-nav.js — 站点顶部控件（两种形态）
   ----------------------------------------------------------------------------
   1) inline 形态：页面已有自己的顶栏行（如 portfolio.html 的 canvas tabs 行）时，
      只把「首页 + 主题 + 数据状态 + 时钟」插到那一行右侧，不额外生成整条导航；
   2) fixed 形态：页面没有顶栏时，生成一条独立的顶部导航条（原行为）。
   样式全部注入在本片内，类名统一 sn- 前缀，不改宿主页面的既有样式与变量。
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

  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 13.6A8.4 8.4 0 1 1 10.4 4a6.7 6.7 0 0 0 9.6 9.6Z"/></svg>';

  var css = [
    /* ---- fixed 形态 ---- */
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
    /* ---- 通用控件 ---- */
    '.sn-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;',
    'background:rgba(18,28,48,.75);border:1px solid rgba(122,168,255,.16);color:#9aabc7;',
    'font-size:11.5px;font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.sn-dot{width:6px;height:6px;border-radius:50%;background:#2ebd85;box-shadow:0 0 8px #2ebd85;flex:none}',
    '.sn-dot.idle{background:#6b7a97;box-shadow:0 0 8px rgba(107,122,151,.7)}',
    '.sn-btn{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;',
    'background:rgba(18,28,48,.75);border:1px solid rgba(122,168,255,.16);color:#9aabc7;',
    'font:600 11.5px/1 inherit;cursor:pointer;white-space:nowrap;transition:background .18s,color .18s,border-color .18s}',
    '.sn-btn:hover{color:#e8eefb;background:rgba(122,168,255,.16);border-color:rgba(122,168,255,.3)}',
    '.sn-btn svg{width:13px;height:13px;display:block}',
    /* ---- inline 形态 ---- */
    '.sn-inline{display:flex;align-items:center;gap:8px;margin-left:auto;padding-left:14px;flex:none;',
    'font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1}',
    '.sn-link{flex:none;display:inline-flex;align-items:center;gap:5px;text-decoration:none;',
    'padding:6px 11px;border-radius:999px;background:rgba(18,28,48,.7);',
    'border:1px solid rgba(122,168,255,.16);color:#9aabc7;font:600 11.5px/1 inherit;',
    'white-space:nowrap;transition:background .18s,color .18s,border-color .18s}',
    '.sn-link:hover{color:#e8eefb;background:rgba(122,168,255,.16);border-color:rgba(122,168,255,.3)}',
    '.sn-link svg{width:12px;height:12px;display:block}',
    /* ---- fixed 形态浅色肤 ---- */
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
    '@media(max-width:820px){.sn-inline .sn-clock,.sn-clock{display:none}}',
    '@media(max-width:680px){.sn-bar{gap:10px}}'
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

  function readTheme() {
    try { return localStorage.getItem('tech-theme') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; }
  }

  /* 主题切换：写入 localStorage.tech-theme（其他页共用）。
     repaint(next) 由调用方决定本页要不要跟着换肤。 */
  function themeControl(repaint) {
    var btn = el('button', 'sn-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换全站主题');
    btn.title = '切换全站主题（其他页面共用该设置）';
    function paint(t) {
      btn.innerHTML = (t === 'light' ? MOON : SUN) + '<span>' + (t === 'light' ? '深色' : '浅色') + '</span>';
      repaint(t);
    }
    btn.addEventListener('click', function () {
      var next = readTheme() === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('tech-theme', next); } catch (e) {}
      paint(next);
    });
    paint(readTheme());
    return btn;
  }

  function statusControl() {
    var box = el('span', 'sn-chip');
    var dot = el('i', 'sn-dot idle');
    var txt = el('span', null, '静态快照');
    box.appendChild(dot);
    box.appendChild(txt);
    function paint() {
      var ok = !!(window.WB && window.WB.ready && !window.WB.error);
      dot.className = 'sn-dot' + (ok ? '' : ' idle');
      txt.textContent = ok ? '云端已同步' : '静态快照';
      box.title = ok ? 'WorkBuddy 云端数据已加载' : '本页为仓库内静态数据快照，随站点发布更新';
    }
    paint();
    if (window.WB && typeof window.WB.onReady === 'function') window.WB.onReady(paint);
    return box;
  }

  function clockControl() {
    var box = el('span', 'sn-chip');
    box.appendChild(el('i', 'sn-dot'));
    var ck = el('span', 'sn-clock', clockText());
    box.appendChild(ck);
    setInterval(function () { ck.textContent = clockText(); }, 1000);
    return box;
  }

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>';

  function injectStyle() {
    if (document.getElementById('sn-style')) return;
    var style = document.createElement('style');
    style.id = 'sn-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* inline：只往宿主顶栏行右侧塞控件，不生成整条导航，不动 body padding */
  function mountInline(host) {
    if (host.querySelector('.sn-inline')) return;
    injectStyle();
    var box = el('div', 'sn-inline');
    var home = el('a', 'sn-link');
    home.href = './home3.html';
    home.title = '返回首页';
    home.innerHTML = ARROW + '<span>首页</span>';
    box.appendChild(home);
    box.appendChild(themeControl(function () {}));
    box.appendChild(statusControl());
    box.appendChild(clockControl());
    host.appendChild(box);
  }

  /* fixed：页面没有顶栏时才生成整条导航 */
  function mountFixed() {
    if (document.querySelector('.sn-bar')) return;
    injectStyle();
    var bar = el('div', 'sn-bar');
    bar.appendChild(buildBrand());
    bar.appendChild(buildNav());
    var meta = el('div', 'sn-meta');
    meta.appendChild(themeControl(function (t) { bar.classList.toggle('sn-light', t === 'light'); }));
    meta.appendChild(statusControl());
    meta.appendChild(clockControl());
    bar.appendChild(meta);
    document.body.appendChild(bar);
    document.body.style.setProperty('padding-top', H + 'px', 'important');
  }

  function buildBrand() {
    var brand = el('a', 'sn-brand');
    brand.href = './home3.html';
    brand.title = '返回首页';
    brand.appendChild(el('span', 'sn-mark', '10'));
    var txt = el('span', 'sn-txt');
    txt.appendChild(el('b', null, '曼城十号梅西'));
    txt.appendChild(el('i', null, 'personal space · v10'));
    brand.appendChild(txt);
    return brand;
  }

  function buildNav() {
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
    return nav;
  }

  function mount() {
    // 宿主已有自己的顶栏行时，走 inline，避免两条 bar 叠一起
    var inlineHost = document.querySelector('header.dashboard-topbar .dashboard-tabs-row')
      || document.querySelector('[data-sn-inline-host]');
    if (inlineHost) return mountInline(inlineHost);
    mountFixed();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
