(function () {
  "use strict";

  var LOCAL_KEY = "travel-map.records.v1";
  var CLOUD_PREFIX = "travel:";
  var DOMESTIC = [
    ["cn-bj", "北京", 39.9042, 116.4074], ["cn-tj", "天津", 39.3434, 117.3616],
    ["cn-sh", "上海", 31.2304, 121.4737], ["cn-cq", "重庆", 29.4316, 106.9123],
    ["cn-hebei", "河北", 38.0428, 114.5149], ["cn-shanxi", "山西", 37.8706, 112.5489],
    ["cn-liaoning", "辽宁", 41.8057, 123.4315], ["cn-jilin", "吉林", 43.8171, 125.3235],
    ["cn-heilongjiang", "黑龙江", 45.8038, 126.535], ["cn-jiangsu", "江苏", 32.0603, 118.7969],
    ["cn-zhejiang", "浙江", 30.2741, 120.1551], ["cn-anhui", "安徽", 31.8206, 117.2272],
    ["cn-fujian", "福建", 26.0745, 119.2965], ["cn-jiangxi", "江西", 28.682, 115.8579],
    ["cn-shandong", "山东", 36.6512, 117.1201], ["cn-henan", "河南", 34.7466, 113.6253],
    ["cn-hubei", "湖北", 30.5928, 114.3055], ["cn-hunan", "湖南", 28.2282, 112.9388],
    ["cn-guangdong", "广东", 23.1291, 113.2644], ["cn-hainan", "海南", 20.044, 110.199],
    ["cn-sichuan", "四川", 30.5728, 104.0668], ["cn-guizhou", "贵州", 26.6477, 106.6302],
    ["cn-yunnan", "云南", 25.0389, 102.7183], ["cn-shaanxi", "陕西", 34.3416, 108.9398],
    ["cn-gansu", "甘肃", 36.0611, 103.8343], ["cn-qinghai", "青海", 36.6171, 101.7782],
    ["cn-neimenggu", "内蒙古", 40.8426, 111.7492], ["cn-guangxi", "广西", 22.817, 108.3665],
    ["cn-xizang", "西藏", 29.6525, 91.1721], ["cn-ningxia", "宁夏", 38.4872, 106.2309],
    ["cn-xinjiang", "新疆", 43.8256, 87.6168], ["cn-hongkong", "香港", 22.3193, 114.1694],
    ["cn-macau", "澳门", 22.1987, 113.5439], ["cn-taiwan", "台湾", 25.033, 121.5654]
  ].map(function (row) { return { id: row[0], name: row[1], lat: row[2], lon: row[3] }; });

  var INTERNATIONAL = [
    ["jp", "日本", 36.2048, 138.2529], ["kr", "韩国", 35.9078, 127.7669], ["sg", "新加坡", 1.3521, 103.8198],
    ["th", "泰国", 15.87, 100.9925], ["my", "马来西亚", 4.2105, 101.9758], ["id", "印度尼西亚", -2.5, 118],
    ["vn", "越南", 14.0583, 108.2772], ["ph", "菲律宾", 12.8797, 121.774], ["kh", "柬埔寨", 12.5657, 104.991],
    ["la", "老挝", 19.8563, 102.4955], ["mm", "缅甸", 21.9162, 95.956], ["in", "印度", 20.5937, 78.9629],
    ["np", "尼泊尔", 28.3949, 84.124], ["lk", "斯里兰卡", 7.8731, 80.7718], ["mv", "马尔代夫", 3.2028, 73.2207],
    ["mn", "蒙古", 46.8625, 103.8467], ["kz", "哈萨克斯坦", 48.0196, 66.9237], ["uz", "乌兹别克斯坦", 41.3775, 64.5853],
    ["ae", "阿联酋", 23.4241, 53.8478], ["qa", "卡塔尔", 25.3548, 51.1839], ["sa", "沙特阿拉伯", 23.8859, 45.0792],
    ["tr", "土耳其", 38.9637, 35.2433], ["il", "以色列", 31.0461, 34.8516], ["eg", "埃及", 26.8206, 30.8025],
    ["ma", "摩洛哥", 31.7917, -7.0926], ["za", "南非", -30.5595, 22.9375], ["ke", "肯尼亚", -0.0236, 37.9062],
    ["fr", "法国", 46.2276, 2.2137], ["it", "意大利", 41.8719, 12.5674], ["es", "西班牙", 40.4637, -3.7492],
    ["pt", "葡萄牙", 39.3999, -8.2245], ["gb", "英国", 55.3781, -3.436], ["ie", "爱尔兰", 53.1424, -7.6921],
    ["de", "德国", 51.1657, 10.4515], ["nl", "荷兰", 52.1326, 5.2913], ["be", "比利时", 50.5039, 4.4699],
    ["ch", "瑞士", 46.8182, 8.2275], ["at", "奥地利", 47.5162, 14.5501], ["gr", "希腊", 39.0742, 21.8243],
    ["no", "挪威", 60.472, 8.4689], ["se", "瑞典", 60.1282, 18.6435], ["fi", "芬兰", 61.9241, 25.7482],
    ["dk", "丹麦", 56.2639, 9.5018], ["is", "冰岛", 64.9631, -19.0208], ["pl", "波兰", 51.9194, 19.1451],
    ["cz", "捷克", 49.8175, 15.473], ["hu", "匈牙利", 47.1625, 19.5033], ["ro", "罗马尼亚", 45.9432, 24.9668],
    ["hr", "克罗地亚", 45.1, 15.2], ["ru", "俄罗斯", 61.524, 105.3188], ["ua", "乌克兰", 48.3794, 31.1656],
    ["us", "美国", 37.0902, -95.7129], ["ca", "加拿大", 56.1304, -106.3468], ["mx", "墨西哥", 23.6345, -102.5528],
    ["br", "巴西", -14.235, -51.9253], ["ar", "阿根廷", -38.4161, -63.6167], ["cl", "智利", -35.6751, -71.543],
    ["pe", "秘鲁", -9.19, -75.0152], ["au", "澳大利亚", -25.2744, 133.7751], ["nz", "新西兰", -40.9006, 174.886],
    ["fj", "斐济", -17.7134, 178.065], ["mu", "毛里求斯", -20.3484, 57.5522]
  ].map(function (row) { return { id: row[0], name: row[1], lat: row[2], lon: row[3] }; });

  var state = { yy: [], evelyn: [] };
  var tombstones = { yy: [], evelyn: [] };
  var dirty = { yy: false, evelyn: false };
  var scope = "domestic";
  var personView = "both";
  var markers = [];
  var map = null;
  var cloudReady = false;
  var cloudWritable = false;
  var syncQueue = Promise.resolve();
  var $ = function (id) { return document.getElementById(id); };

  function validRecord(row) {
    return row && typeof row === "object" && typeof row.id === "string" &&
      typeof row.name === "string" && (row.scope === "domestic" || row.scope === "international") &&
      Number.isFinite(Number(row.lat)) && Number(row.lat) >= -90 && Number(row.lat) <= 90 &&
      Number.isFinite(Number(row.lon)) && Number(row.lon) >= -180 && Number(row.lon) <= 180;
  }

  function readState() {
    try {
      var saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
      if (!saved || typeof saved !== "object") return;
      ["yy", "evelyn"].forEach(function (owner) {
        state[owner] = Array.isArray(saved[owner]) ? saved[owner].filter(validRecord) : [];
        var deleted = saved.tombstones && saved.tombstones[owner];
        tombstones[owner] = Array.isArray(deleted) ? deleted.filter(function (id) { return typeof id === "string"; }) : [];
      });
    } catch (e) {
      state = { yy: [], evelyn: [] };
      tombstones = { yy: [], evelyn: [] };
    }
  }

  function writeLocal() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ yy: state.yy, evelyn: state.evelyn, tombstones: tombstones }));
      return true;
    } catch (e) { return false; }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
    });
  }

  function tidy(value) { return String(value || "").trim().replace(/\s+/g, "").toLocaleLowerCase(); }
  function placeKey(row) { return row.scope + "|" + (row.placeId || tidy(row.name)); }
  function ownerName(owner) { return owner === "yy" ? "YY" : "Evelyn"; }
  function cloudKey(owner) { return CLOUD_PREFIX + owner + ":v1"; }
  function hasWriteKey() { try { return !!localStorage.getItem("wb-write-key"); } catch (e) { return false; } }

  function setCloudStatus(text, mode) {
    var box = $("cloudStatus");
    if (!box) return;
    box.dataset.state = mode || "wait";
    box.title = text;
    box.querySelector("span").textContent = text;
  }

  function envelope(owner) { return { version: 1, records: state[owner], deletedIds: tombstones[owner] }; }
  function normalizeEnvelope(value) {
    var records = Array.isArray(value) ? value : value && Array.isArray(value.records) ? value.records : [];
    var deleted = value && !Array.isArray(value) && Array.isArray(value.deletedIds) ? value.deletedIds : [];
    return { version: 1, records: records.filter(validRecord), deletedIds: deleted.filter(function (id) { return typeof id === "string"; }) };
  }

  function mergeCloudOwner(owner, remoteValue) {
    var remote = normalizeEnvelope(remoteValue);
    var deleted = new Set(tombstones[owner].concat(remote.deletedIds));
    var byId = new Map();
    remote.records.forEach(function (row) { byId.set(row.id, row); });
    state[owner].forEach(function (row) { byId.set(row.id, row); });
    state[owner] = Array.from(byId.values()).filter(function (row) { return !deleted.has(row.id); });
    tombstones[owner] = Array.from(deleted);
    var merged = envelope(owner);
    return (merged.records.length > 0 || merged.deletedIds.length > 0) && JSON.stringify(merged) !== JSON.stringify(remote);
  }

  function allRows() {
    return state.yy.map(function (row) { return Object.assign({ owner: "yy" }, row); })
      .concat(state.evelyn.map(function (row) { return Object.assign({ owner: "evelyn" }, row); }));
  }

  function visibleRows() {
    return allRows().filter(function (row) { return row.scope === scope && (personView === "both" || row.owner === personView); });
  }

  function destinations() { return scope === "domestic" ? DOMESTIC : INTERNATIONAL; }
  function fillDestinations() {
    var select = $("destinationInput");
    select.innerHTML = '<option value="">请选择' + (scope === "domestic" ? "省级行政区" : "国家 / 地区") + "…</option>" +
      destinations().map(function (item) { return '<option value="' + esc(item.id) + '">' + esc(item.name) + "</option>"; }).join("");
    $("saveBtn").disabled = true;
    $("selectionHint").textContent = scope === "domestic"
      ? "国内按省级行政区记录，地图落点为该地区代表位置。"
      : "国际按国家 / 地区记录，地图落点为该地区代表位置。";
  }

  function labelScope(value) { return value === "domestic" ? "国内" : "国际"; }
  function setMsg(text, kind) {
    var message = $("formMsg");
    message.textContent = text || "";
    message.className = "form-msg" + (kind ? " " + kind : "");
  }

  function setScope(next) {
    scope = next;
    document.querySelectorAll("[data-scope]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.scope === scope));
    });
    $("mapScopeName").textContent = labelScope(scope) + "地图";
    $("listTitle").textContent = labelScope(scope) + "足迹";
    if (map) map.setView(scope === "domestic" ? [35.8617, 104.1954] : [20, 0], scope === "domestic" ? 4 : 2);
    fillDestinations();
    render();
  }

  function setPerson(next) {
    personView = next;
    document.querySelectorAll("[data-person]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.person === personView));
    });
    render();
  }

  function markerIcon(kind) {
    return L.divIcon({ className: "travel-icon", html: "<div class=\"travel-marker " + kind + "\"></div>", iconSize: [17, 17], iconAnchor: [8, 8] });
  }

  function popupHtml(group, kind) {
    var rows = group.rows.map(function (row) { return "<div class=\"pop-row\">" + esc(ownerName(row.owner)) + " 去过</div>"; }).join("");
    var badge = kind === "shared" ? "<span class=\"pop-badge\">共同去过</span>" : "";
    return "<div class=\"pop-title\">" + esc(group.rows[0].name) + badge + "</div>" + rows;
  }

  function grouped(rows) {
    var groups = new Map(), out = [];
    rows.forEach(function (row) {
      var key = placeKey(row), group = groups.get(key);
      if (!group) {
        group = { rows: [], owners: {}, lat: Number(row.lat), lon: Number(row.lon) };
        groups.set(key, group);
        out.push(group);
      }
      group.rows.push(row);
      group.owners[row.owner] = true;
    });
    return out;
  }

  function renderMap() {
    markers.forEach(function (marker) { map.removeLayer(marker); });
    markers = [];
    var rows = visibleRows(), groups = grouped(rows);
    groups.forEach(function (group) {
      var kind = personView === "both"
        ? (group.owners.yy && group.owners.evelyn ? "shared" : group.owners.yy ? "yy" : "evelyn")
        : personView;
      var marker = L.marker([group.lat, group.lon], { icon: markerIcon(kind) }).addTo(map);
      marker.bindPopup(popupHtml(group, kind));
      markers.push(marker);
    });
    $("mapSummary").textContent = groups.length ? groups.length + " 个地区" : "还没有去过记录";
  }

  function renderList() {
    var rows = visibleRows().slice().sort(function (a, b) { return a.name.localeCompare(b.name, "zh-CN"); });
    $("recordCount").textContent = rows.length + " 处";
    if (!rows.length) {
      $("recordList").innerHTML = '<div class="empty">这个视角还没有足迹。选一个地区，点击“标记为去过”即可。</div>';
      return;
    }
    $("recordList").innerHTML = rows.map(function (row) {
      return '<div class="record"><i class="record-dot ' + row.owner + '"></i><div class="record-copy"><div class="record-title">' + esc(row.name) +
        '</div><div class="record-meta">' + esc(ownerName(row.owner)) + " 去过</div></div><button class=\"del\" type=\"button\" data-delete-owner=\"" + row.owner +
        "\" data-delete-id=\"" + esc(row.id) + "\" aria-label=\"删除" + esc(row.name) + "足迹\">删除</button></div>";
    }).join("");
  }

  function render() {
    if (!map) return;
    renderMap();
    renderList();
  }

  function anyDirty() { return dirty.yy || dirty.evelyn; }
  function syncOwner(owner) {
    dirty[owner] = true;
    if (!cloudReady) return;
    cloudWritable = hasWriteKey();
    if (!cloudWritable) { setCloudStatus("云端只读 · 此设备未绑定写入权限", "wait"); return; }
    setCloudStatus("正在同步旅行记录到云端…", "wait");
    syncQueue = syncQueue.catch(function () {}).then(function () {
      if (!hasWriteKey()) throw new Error("no-write-key");
      return window.WB.put(cloudKey(owner), envelope(owner));
    }).then(function () {
      dirty[owner] = false;
      writeLocal();
      setCloudStatus(anyDirty() ? "正在同步旅行记录到云端…" : "旅行记录已同步到云端", anyDirty() ? "wait" : "ok");
    }).catch(function (error) {
      cloudWritable = hasWriteKey();
      if (error && error.message === "no-write-key") setCloudStatus("云端只读 · 此设备未绑定写入权限", "wait");
      else { setCloudStatus("云端同步失败 · 本机记录仍已保存", "error"); setMsg("同步失败；记录仍在本机，之后添加或删除一处可重试同步。", "error"); }
    });
  }

  function onCloudReady() {
    cloudReady = true;
    cloudWritable = hasWriteKey();
    var needsSync = [];
    ["yy", "evelyn"].forEach(function (owner) {
      var remote = window.WB.data && window.WB.data[cloudKey(owner)];
      if (mergeCloudOwner(owner, remote)) needsSync.push(owner);
    });
    writeLocal();
    render();
    if (!cloudWritable) { setCloudStatus("云端只读 · 此设备未绑定写入权限", "wait"); return; }
    if (!needsSync.length) { setCloudStatus("旅行记录已从云端载入", "ok"); return; }
    needsSync.forEach(function (owner) { syncOwner(owner); });
  }

  function afterLocalChange(owner) {
    if (cloudReady && cloudWritable) syncOwner(owner);
    else if (cloudReady) setCloudStatus("云端只读 · 此设备未绑定写入权限", "wait");
    else setCloudStatus("云端连接中 · 本机记录已保存", "wait");
  }

  function saveRecord(event) {
    event.preventDefault();
    var owner = $("personInput").value;
    var placeId = $("destinationInput").value;
    var place = destinations().find(function (item) { return item.id === placeId; });
    if (!place) { setMsg("先从列表中选择一个地区。", "error"); return; }
    var key = scope + "|" + place.id;
    if (state[owner].some(function (row) { return placeKey(row) === key; })) {
      setMsg("" + place.name + "已经记录为去过了。", "error");
      return;
    }
    var record = {
      id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      placeId: place.id, name: place.name, scope: scope,
      lat: place.lat, lon: place.lon, createdAt: new Date().toISOString()
    };
    state[owner].push(record);
    if (!writeLocal()) {
      state[owner].pop();
      setMsg("浏览器无法保存数据，请检查本机存储空间或隐私设置。", "error");
      return;
    }
    $("destinationInput").value = "";
    $("saveBtn").disabled = true;
    setMsg(cloudWritable ? "已标记为去过，正在同步云端。" : "已标记为去过；云端连接后会尝试同步。", "ok");
    render();
    afterLocalChange(owner);
  }

  function deleteRecord(event) {
    var button = event.target.closest("[data-delete-id]");
    if (!button) return;
    var owner = button.dataset.deleteOwner, id = button.dataset.deleteId;
    var records = state[owner] || [];
    var index = records.findIndex(function (row) { return row.id === id; });
    if (index < 0) return;
    var removed = records.splice(index, 1)[0];
    tombstones[owner].push(id);
    if (!writeLocal()) {
      records.splice(index, 0, removed);
      tombstones[owner].pop();
      setMsg("删除未保存，请重试。", "error");
      return;
    }
    render();
    setMsg(cloudWritable ? "已删除足迹，正在同步云端。" : "已删除本机足迹；云端连接后会同步。", "ok");
    afterLocalChange(owner);
  }

  function fitAll() {
    var rows = visibleRows();
    if (!rows.length) {
      map.setView(scope === "domestic" ? [35.8617, 104.1954] : [20, 0], scope === "domestic" ? 4 : 2);
      return;
    }
    var bounds = L.latLngBounds(rows.map(function (row) { return [row.lat, row.lon]; }));
    if (rows.length === 1) map.setView(bounds.getCenter(), scope === "domestic" ? 5 : 4);
    else map.fitBounds(bounds.pad(.16), { maxZoom: 6 });
  }

  function init() {
    readState();
    if (!window.L) {
      $("mapOverlay").textContent = "地图组件加载失败，请检查网络后刷新此页。";
      $("mapOverlay").classList.add("error");
      setMsg("地图组件暂不可用。", "error");
      return;
    }
    map = L.map("map", { zoomControl: true, worldCopyJump: true }).setView([35.8617, 104.1954], 4);
    var tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
    });
    tiles.addTo(map);
    tiles.on("tileerror", function () {
      $("mapOverlay").textContent = "底图加载较慢；仍可尝试缩放或重新加载页面。";
      $("mapOverlay").classList.add("error");
    });
    document.querySelectorAll("[data-scope]").forEach(function (button) {
      button.addEventListener("click", function () { setScope(button.dataset.scope); });
    });
    document.querySelectorAll("[data-person]").forEach(function (button) {
      button.addEventListener("click", function () { setPerson(button.dataset.person); });
    });
    $("destinationInput").addEventListener("change", function () { $("saveBtn").disabled = !this.value; });
    $("visitForm").addEventListener("submit", saveRecord);
    $("recordList").addEventListener("click", deleteRecord);
    $("fitBtn").addEventListener("click", fitAll);
    setScope("domestic");
    setPerson("both");
    setTimeout(function () { map.invalidateSize(); }, 80);
    if (window.WB && window.WB.onReady) window.WB.onReady(onCloudReady);
    else setCloudStatus("云端接口不可用 · 数据暂存在本机", "error");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
