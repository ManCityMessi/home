(function () {
  "use strict";

  var LOCAL_KEY = "travel-map.records.v1";
  var CLOUD_PREFIX = "travel:";
  var state = { yy: [], evelyn: [] };
  var tombstones = { yy: [], evelyn: [] };
  var dirty = { yy: false, evelyn: false };
  var scope = "domestic";
  var personView = "both";
  var selected = null;
  var pendingMarker = null;
  var pickMode = false;
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
  function placeKey(row) { return [row.scope, tidy(row.country), tidy(row.name)].join("|"); }
  function ownerName(owner) { return owner === "yy" ? "YY" : "Evelyn"; }
  function cloudKey(owner) { return CLOUD_PREFIX + owner + ":v1"; }
  function hasWriteKey() {
    try { return !!localStorage.getItem("wb-write-key"); } catch (e) { return false; }
  }

  function setCloudStatus(text, mode) {
    var box = $("cloudStatus");
    if (!box) return;
    box.dataset.state = mode || "wait";
    box.title = text;
    box.querySelector("span").textContent = text;
  }

  function envelope(owner) {
    return { version: 1, records: state[owner], deletedIds: tombstones[owner] };
  }

  function normalizeEnvelope(value) {
    var records = Array.isArray(value) ? value : value && Array.isArray(value.records) ? value.records : [];
    var deleted = value && !Array.isArray(value) && Array.isArray(value.deletedIds) ? value.deletedIds : [];
    return {
      version: 1,
      records: records.filter(validRecord),
      deletedIds: deleted.filter(function (id) { return typeof id === "string"; })
    };
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
    var hasTravelData = merged.records.length > 0 || merged.deletedIds.length > 0;
    return hasTravelData && JSON.stringify(merged) !== JSON.stringify(remote);
  }

  function allRows() {
    return state.yy.map(function (row) { return Object.assign({ owner: "yy" }, row); })
      .concat(state.evelyn.map(function (row) { return Object.assign({ owner: "evelyn" }, row); }));
  }

  function visibleRows() {
    return allRows().filter(function (row) {
      return row.scope === scope && (personView === "both" || row.owner === personView);
    });
  }

  function updateKnownPlaces() {
    var seen = {}, items = [];
    allRows().forEach(function (row) {
      if (row.name && !seen[tidy(row.name)]) {
        seen[tidy(row.name)] = 1;
        items.push(row.name);
      }
    });
    $("knownPlaces").innerHTML = items.map(function (name) {
      return "<option value=\"" + esc(name) + "\"></option>";
    }).join("");
  }

  function labelScope(value) { return value === "domestic" ? "国内" : "国际"; }
  function setMsg(text, kind) {
    var message = $("formMsg");
    message.textContent = text || "";
    message.className = "form-msg" + (kind ? " " + kind : "");
  }

  function setScope(next) {
    scope = next;
    $("scopeInput").value = scope;
    document.querySelectorAll("[data-scope]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.scope === scope));
    });
    $("mapScopeName").textContent = labelScope(scope) + "地图";
    $("listTitle").textContent = labelScope(scope) + "足迹";
    if (scope === "domestic" && !$("countryInput").value.trim()) $("countryInput").value = "中国";
    if (map) map.setView(scope === "domestic" ? [35.8617, 104.1954] : [20, 0], scope === "domestic" ? 4 : 2);
    render();
  }

  function setPerson(next) {
    personView = next;
    document.querySelectorAll("[data-person]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.person === personView));
    });
    if (next === "yy" || next === "evelyn") $("personInput").value = next;
    render();
  }

  function markerIcon(kind) {
    return L.divIcon({
      className: "travel-icon",
      html: "<div class=\"travel-marker " + kind + "\"></div>",
      iconSize: [17, 17],
      iconAnchor: [8, 8]
    });
  }

  function popupHtml(group, kind) {
    var rows = group.rows.map(function (row) {
      var meta = [ownerName(row.owner), row.country, row.region, row.date].filter(Boolean).join(" · ");
      return "<div class=\"pop-row\">" + esc(meta) + (row.note ? "<br>" + esc(row.note) : "") + "</div>";
    }).join("");
    var badge = kind === "shared" ? "<span class=\"pop-badge\">共同去过</span>" : "";
    return "<div class=\"pop-title\">" + esc(group.rows[0].name) + badge + "</div>" + rows;
  }

  function grouped(rows) {
    var groups = new Map(), out = [];
    rows.forEach(function (row) {
      var key = placeKey(row), group = groups.get(key);
      if (!group) {
        group = { key: key, rows: [], owners: {}, lat: Number(row.lat), lon: Number(row.lon) };
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
    $("mapSummary").textContent = groups.length
      ? groups.length + " 个地点 · " + rows.length + " 条记录"
      : "点击“选地图位置”后在地图上点选地点";
  }

  function renderList() {
    var rows = visibleRows().slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    $("recordCount").textContent = rows.length + " 条";
    if (!rows.length) {
      $("recordList").innerHTML = "<div class=\"empty\">这个视角还没有记录。通过右侧表单添加第一处旅行地点。</div>";
      return;
    }
    $("recordList").innerHTML = rows.map(function (row) {
      var owner = row.owner;
      var meta = [ownerName(owner), row.country, row.region, row.date].filter(Boolean).join(" · ");
      return "<div class=\"record\"><i class=\"record-dot " + owner + "\"></i><div class=\"record-copy\"><div class=\"record-title\">" + esc(row.name) + "</div><div class=\"record-meta\">" + esc(meta) + "</div>" + (row.note ? "<div class=\"record-note\">" + esc(row.note) + "</div>" : "") + "</div><button class=\"del\" type=\"button\" data-delete-owner=\"" + owner + "\" data-delete-id=\"" + esc(row.id) + "\" aria-label=\"删除" + esc(row.name) + "记录\">删除</button></div>";
    }).join("");
  }

  function render() {
    if (!map) return;
    renderMap();
    renderList();
    updateKnownPlaces();
  }

  function anyDirty() { return dirty.yy || dirty.evelyn; }

  function syncOwner(owner) {
    dirty[owner] = true;
    if (!cloudReady) return;
    cloudWritable = hasWriteKey();
    if (!cloudWritable) {
      setCloudStatus("云端只读 · 此设备未绑定写入权限", "wait");
      return;
    }
    setCloudStatus("正在同步旅行记录到云端…", "wait");
    syncQueue = syncQueue.catch(function () {}).then(function () {
      if (!hasWriteKey()) throw new Error("no-write-key");
      return window.WB.put(cloudKey(owner), envelope(owner));
    }).then(function () {
      dirty[owner] = false;
      writeLocal();
      if (!anyDirty()) setCloudStatus("旅行记录已同步到云端", "ok");
      else setCloudStatus("正在同步旅行记录到云端…", "wait");
    }).catch(function (error) {
      cloudWritable = hasWriteKey();
      if (error && error.message === "no-write-key") {
        setCloudStatus("云端只读 · 此设备未绑定写入权限", "wait");
      } else {
        setCloudStatus("云端同步失败 · 本机记录仍已保存", "error");
        setMsg("同步失败，记录仍在本机；联网后重新保存或删除即可重试。", "error");
      }
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
    if (!cloudWritable) {
      setCloudStatus("云端只读 · 此设备未绑定写入权限", "wait");
      return;
    }
    if (!needsSync.length) {
      setCloudStatus("旅行记录已从云端载入", "ok");
      return;
    }
    needsSync.forEach(function (owner) { syncOwner(owner); });
  }

  function afterLocalChange(owner) {
    if (cloudReady && cloudWritable) syncOwner(owner);
    else if (cloudReady) setCloudStatus("云端只读 · 此设备未绑定写入权限", "wait");
    else setCloudStatus("云端连接中 · 本机记录已保存", "wait");
  }

  function togglePickMode() {
    pickMode = !pickMode;
    $("pickBtn").classList.toggle("active", pickMode);
    $("pickBtn").textContent = pickMode ? "✓ 正在地图上点选" : "⌖ 选地图位置";
    $("mapOverlay").innerHTML = pickMode
      ? "<b>现在点选地图：</b>单击城市或景点位置，完成后再保存"
      : "<b>地图定位：</b>开启“选地图位置”，然后点击对应城市或景点";
  }

  function locate(latlng) {
    selected = { lat: Number(latlng.lat.toFixed(5)), lon: Number(latlng.lng.toFixed(5)) };
    $("coordReadout").textContent = selected.lat.toFixed(5) + ", " + selected.lon.toFixed(5);
    $("coordReadout").classList.add("ready");
    $("saveBtn").disabled = false;
    if (pendingMarker) map.removeLayer(pendingMarker);
    pendingMarker = L.marker([selected.lat, selected.lon], { icon: markerIcon("pending"), draggable: true, zIndexOffset: 1000 }).addTo(map);
    pendingMarker.on("dragend", function (event) { locate(event.target.getLatLng()); });
    if (pickMode) togglePickMode();
    setMsg("位置已选好，补全信息后可以保存。", "ok");
  }

  function fitAll() {
    var rows = visibleRows();
    if (!rows.length) {
      map.setView(scope === "domestic" ? [35.8617, 104.1954] : [20, 0], scope === "domestic" ? 4 : 2);
      return;
    }
    var bounds = L.latLngBounds(rows.map(function (row) { return [row.lat, row.lon]; }));
    if (rows.length === 1) map.setView(bounds.getCenter(), scope === "domestic" ? 7 : 5);
    else map.fitBounds(bounds.pad(.16), { maxZoom: 8 });
  }

  function saveRecord(event) {
    event.preventDefault();
    var name = $("placeInput").value.trim();
    var country = $("countryInput").value.trim();
    var region = $("regionInput").value.trim();
    var owner = $("personInput").value;
    var recordScope = $("scopeInput").value;
    if (!name || !country) { setMsg("请填写地点名称和国家或地区。", "error"); return; }
    if (!selected) { setMsg("先开启“选地图位置”，在地图上点选这个地点。", "error"); return; }

    var record = {
      id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      name: name, country: country, region: region,
      date: $("dateInput").value || "", note: $("noteInput").value.trim(),
      scope: recordScope, lat: selected.lat, lon: selected.lon,
      createdAt: new Date().toISOString()
    };
    state[owner].push(record);
    if (!writeLocal()) {
      state[owner].pop();
      setMsg("浏览器无法保存数据，请检查本机存储空间或隐私设置。", "error");
      return;
    }

    $("visitForm").reset();
    $("personInput").value = owner;
    $("scopeInput").value = scope;
    $("countryInput").value = recordScope === "domestic" ? "中国" : "";
    selected = null;
    $("coordReadout").textContent = "尚未选择地图位置";
    $("coordReadout").classList.remove("ready");
    $("saveBtn").disabled = true;
    if (pendingMarker) { map.removeLayer(pendingMarker); pendingMarker = null; }
    setMsg(cloudWritable ? "已保存到本机，正在同步云端。" : "已保存到本机；云端连接后会尝试同步。", "ok");
    render();
    afterLocalChange(owner);
  }

  function deleteRecord(event) {
    var button = event.target.closest("[data-delete-id]");
    if (!button) return;
    var owner = button.dataset.deleteOwner;
    var id = button.dataset.deleteId;
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
    setMsg(cloudWritable ? "已删除本机记录，正在同步云端。" : "已删除本机记录；云端连接后会同步。", "ok");
    afterLocalChange(owner);
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
    map.on("click", function (event) { if (pickMode) locate(event.latlng); });
    document.querySelectorAll("[data-scope]").forEach(function (button) {
      button.addEventListener("click", function () { setScope(button.dataset.scope); });
    });
    document.querySelectorAll("[data-person]").forEach(function (button) {
      button.addEventListener("click", function () { setPerson(button.dataset.person); });
    });
    $("pickBtn").addEventListener("click", togglePickMode);
    $("visitForm").addEventListener("submit", saveRecord);
    $("recordList").addEventListener("click", deleteRecord);
    $("fitBtn").addEventListener("click", fitAll);
    $("scopeInput").addEventListener("change", function () { setScope(this.value); });
    setScope("domestic");
    setPerson("both");
    setTimeout(function () { map.invalidateSize(); }, 80);

    if (window.WB && window.WB.onReady) window.WB.onReady(onCloudReady);
    else setCloudStatus("云端接口不可用 · 数据暂存在本机", "error");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
