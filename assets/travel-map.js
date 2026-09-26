(function () {
  "use strict";

  var LOCAL_KEY = "travel-map.records.v1";
  var CLOUD_PREFIX = "travel:";
  var DATA_PATH = "./assets/maps/";
  var CONTINENT_ORDER = [
    ["Asia", "亚洲"], ["Europe", "欧洲"], ["NorthAmerica", "北美洲"],
    ["SouthAmerica", "南美洲"], ["Africa", "非洲"], ["Oceania", "大洋洲"]
  ];
  var DOMESTIC = [
    { id:"cn-liaoning", name:"辽宁", group:"东北", adcode:"210000", lat:41.8057, lon:123.4315 },
    { id:"cn-jilin", name:"吉林", group:"东北", adcode:"220000", lat:43.8171, lon:125.3235 },
    { id:"cn-heilongjiang", name:"黑龙江", group:"东北", adcode:"230000", lat:45.8038, lon:126.535 },
    { id:"cn-bj", name:"北京", group:"华北", adcode:"110000", lat:39.9042, lon:116.4074 },
    { id:"cn-tj", name:"天津", group:"华北", adcode:"120000", lat:39.3434, lon:117.3616 },
    { id:"cn-hebei", name:"河北", group:"华北", adcode:"130000", lat:38.0428, lon:114.5149 },
    { id:"cn-shanxi", name:"山西", group:"华北", adcode:"140000", lat:37.8706, lon:112.5489 },
    { id:"cn-neimenggu", name:"内蒙古", group:"华北", adcode:"150000", lat:40.8426, lon:111.7492 },
    { id:"cn-sh", name:"上海", group:"华东", adcode:"310000", lat:31.2304, lon:121.4737 },
    { id:"cn-jiangsu", name:"江苏", group:"华东", adcode:"320000", lat:32.0603, lon:118.7969 },
    { id:"cn-zhejiang", name:"浙江", group:"华东", adcode:"330000", lat:30.2741, lon:120.1551 },
    { id:"cn-anhui", name:"安徽", group:"华东", adcode:"340000", lat:31.8206, lon:117.2272 },
    { id:"cn-fujian", name:"福建", group:"华东", adcode:"350000", lat:26.0745, lon:119.2965 },
    { id:"cn-jiangxi", name:"江西", group:"华东", adcode:"360000", lat:28.682, lon:115.8579 },
    { id:"cn-shandong", name:"山东", group:"华东", adcode:"370000", lat:36.6512, lon:117.1201 },
    { id:"cn-henan", name:"河南", group:"华中", adcode:"410000", lat:34.7466, lon:113.6253 },
    { id:"cn-hubei", name:"湖北", group:"华中", adcode:"420000", lat:30.5928, lon:114.3055 },
    { id:"cn-hunan", name:"湖南", group:"华中", adcode:"430000", lat:28.2282, lon:112.9388 },
    { id:"cn-guangdong", name:"广东", group:"华南", adcode:"440000", lat:23.1291, lon:113.2644 },
    { id:"cn-guangxi", name:"广西", group:"华南", adcode:"450000", lat:22.817, lon:108.3665 },
    { id:"cn-hainan", name:"海南", group:"华南", adcode:"460000", lat:20.044, lon:110.199 },
    { id:"cn-cq", name:"重庆", group:"西南", adcode:"500000", lat:29.4316, lon:106.9123 },
    { id:"cn-sichuan", name:"四川", group:"西南", adcode:"510000", lat:30.5728, lon:104.0668 },
    { id:"cn-guizhou", name:"贵州", group:"西南", adcode:"520000", lat:26.6477, lon:106.6302 },
    { id:"cn-yunnan", name:"云南", group:"西南", adcode:"530000", lat:25.0389, lon:102.7183 },
    { id:"cn-xizang", name:"西藏", group:"西南", adcode:"540000", lat:29.6525, lon:91.1721 },
    { id:"cn-shaanxi", name:"陕西", group:"西北", adcode:"610000", lat:34.3416, lon:108.9398 },
    { id:"cn-gansu", name:"甘肃", group:"西北", adcode:"620000", lat:36.0611, lon:103.8343 },
    { id:"cn-qinghai", name:"青海", group:"西北", adcode:"630000", lat:36.6171, lon:101.7782 },
    { id:"cn-ningxia", name:"宁夏", group:"西北", adcode:"640000", lat:38.4872, lon:106.2309 },
    { id:"cn-xinjiang", name:"新疆", group:"西北", adcode:"650000", lat:43.8256, lon:87.6168 },
    { id:"cn-hongkong", name:"香港", group:"港澳台", adcode:"810000", lat:22.3193, lon:114.1694 },
    { id:"cn-macau", name:"澳门", group:"港澳台", adcode:"820000", lat:22.1987, lon:113.5439 },
    { id:"cn-taiwan", name:"台湾", group:"港澳台", adcode:"710000", lat:25.033, lon:121.5654 }
  ];

  var state = { yy: [], evelyn: [] };
  var tombstones = { yy: [], evelyn: [] };
  var dirty = { yy: false, evelyn: false };
  var scope = "domestic";
  var personView = "both";
  var statusFilter = "all";
  var continentFilter = "";
  var searchText = "";
  var countries = [];
  var countryById = new Map();
  var domesticById = new Map(DOMESTIC.map(function (place) { return [place.id, place]; }));
  var domesticIdByName = new Map(DOMESTIC.map(function (place) { return [normalize(place.name), place.id]; }));
  var geo = { domestic: null, international: null };
  var map = null;
  var fittedBounds = null;
  var currentBounds = null;
  var cloudReady = false;
  var cloudWritable = false;
  var syncQueue = Promise.resolve();
  var fitPending = true;
  var $ = function (id) { return document.getElementById(id); };

  function normalize(value) { return String(value || "").trim().replace(/\s+/g, "").toLocaleLowerCase(); }
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
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[char];
    });
  }
  function ownerName(owner) { return owner === "yy" ? "YY" : "Evelyn"; }
  function cloudKey(owner) { return CLOUD_PREFIX + owner + ":v1"; }
  function hasWriteKey() { try { return !!localStorage.getItem("wb-write-key"); } catch (e) { return false; } }
  function setCloudStatus(message, mode) {
    var box = $("cloudStatus");
    if (!box) return;
    box.dataset.state = mode || "wait";
    box.title = message;
    box.querySelector("span").textContent = message;
  }
  function setMessage(message, kind) {
    var box = $("actionMessage");
    if (!box) return;
    box.textContent = message || "";
    box.dataset.kind = kind || "";
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
  function resolvePlaceId(row) {
    if (row.placeId) return String(row.placeId);
    if (row.scope === "domestic") return domesticIdByName.get(normalize(row.name)) || "";
    var found = countries.find(function (place) {
      return normalize(place.nameZh) === normalize(row.name) || normalize(place.nameEn) === normalize(row.name);
    });
    return found ? found.id : "";
  }
  function isVisited(place, owner) {
    return (state[owner] || []).some(function (row) {
      return row.scope === scope && resolvePlaceId(row) === place.id;
    });
  }
  function ownersForView() { return personView === "both" ? ["yy", "evelyn"] : [personView]; }
  function isVisibleVisited(place) {
    return personView === "both" ? isVisited(place, "yy") || isVisited(place, "evelyn") : isVisited(place, personView);
  }
  function statusKind(place) {
    var yy = isVisited(place, "yy"), ev = isVisited(place, "evelyn");
    if (personView === "both") return yy && ev ? "shared" : yy ? "yy" : ev ? "evelyn" : "";
    return isVisited(place, personView) ? personView : "";
  }
  function scopePlaces() { return scope === "domestic" ? DOMESTIC : countries; }
  function countryContinent(name) {
    for (var i = 0; i < CONTINENT_ORDER.length; i++) if (CONTINENT_ORDER[i][0] === name) return CONTINENT_ORDER[i][1];
    return name;
  }
  function countryTotal(continent) {
    return countries.filter(function (place) { return place.continent === continent; }).length;
  }
  function countryVisited(continent) {
    return countries.filter(function (place) { return place.continent === continent && isVisibleVisited(place); }).length;
  }
  function buildStats() {
    var host = $("statsGrid");
    var places = scopePlaces();
    host.className = "stats-grid " + scope;
    if (scope === "domestic") {
      var visited = places.filter(isVisibleVisited).length;
      var total = DOMESTIC.length;
      host.innerHTML = '<div class="stat-card domestic-total"><div class="stat-side"><span class="stat-name">国内去过 · 省级行政区</span><span class="stat-value">' + visited + '<small> / ' + total + '</small></span><div class="stat-rail"><i></i></div></div></div>';
      host.querySelector(".stat-rail i").style.width = (visited / total * 100) + "%";
      $("statsHint").textContent = personView === "both" ? "合并视图按去过的省级地区去重" : "按当前查看人的去过地区统计";
      return;
    }
    $("statsHint").textContent = personView === "both" ? "各洲分别统计；双方都去过的国家只计一次" : "按当前查看人分别统计";
    host.innerHTML = CONTINENT_ORDER.map(function (item) {
      var key = item[0], label = item[1], total = countryTotal(key), visited = countryVisited(key);
      var selected = continentFilter === key ? " selected" : "";
      return '<button type="button" class="stat-card clickable' + selected + '" data-stat-continent="' + esc(key) + '" aria-pressed="' + (continentFilter === key) + '">' +
        '<div class="stat-side"><span class="stat-name">' + esc(label) + '</span><span class="stat-value">' + visited + '<small> / ' + total + '</small></span><div class="stat-rail"><i></i></div></div></button>';
    }).join("");
    Array.prototype.forEach.call(host.querySelectorAll(".stat-card"), function (card) {
      var total = countryTotal(card.dataset.statContinent);
      var visited = countryVisited(card.dataset.statContinent);
      var rail = card.querySelector(".stat-rail i");
      if (rail) rail.style.width = (total ? visited / total * 100 : 0) + "%";
    });
  }
  function updateMapLabels() {
    $("mapScopeName").textContent = scope === "domestic" ? "中国地图" : "世界地图";
    $("mapSummary").textContent = scope === "domestic"
      ? DOMESTIC.length + " 个省级地区"
      : countries.length + " 个国家";
    $("explorerTitle").textContent = scope === "domestic" ? "选择省份" : "选择国家 / 地区";
    $("placeCount").textContent = scope === "domestic" ? DOMESTIC.length + " 个省级地区" : countries.length + " 个国家";
    $("filterHint").textContent = personView === "both" ? "点地图可同时更新两人" : "点状态按钮切换个人足迹";
    $("mapOverlay").innerHTML = personView === "both"
      ? "<b>快速标记：</b>点击地图区域将切换为共同去过；也可在列表中分别点 YY / Evelyn。"
      : "<b>快速标记：</b>点击地图区域或列表状态，切换 " + ownerName(personView) + " 的足迹。";
  }
  function setScope(next) {
    scope = next;
    continentFilter = "";
    document.querySelectorAll("[data-scope]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.scope === scope));
    });
    fitPending = true;
    updateMapLabels();
    render();
    fitMap();
  }
  function setPerson(next) {
    personView = next;
    document.querySelectorAll("[data-person]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.person === personView));
    });
    updateMapLabels();
    render();
  }
  function shapeColor(place) {
    var kind = place ? statusKind(place) : "";
    return kind === "yy" ? "#72a0f6" : kind === "evelyn" ? "#f17f96" : kind === "shared" ? "#e9bd52" : "#d9e0e7";
  }
  function featureId(feature) { return feature && feature.properties ? feature.properties.id : ""; }
  function placeForFeature(feature) {
    var id = featureId(feature);
    return scope === "domestic" ? domesticById.get(id) : countryById.get(id);
  }
  function ringPath(ring) {
    var previous = null;
    return ring.map(function (point, index) {
      var longitude = Number(point[0]), latitude = Number(point[1]);
      if (previous !== null) {
        while (longitude - previous > 180) longitude -= 360;
        while (longitude - previous < -180) longitude += 360;
      }
      previous = longitude;
      return (index ? "L" : "M") + longitude.toFixed(3) + "," + (-latitude).toFixed(3);
    }).join("") + "Z";
  }
  function geometryPath(geometry) {
    if (!geometry) return "";
    if (geometry.type === "Polygon") return geometry.coordinates.map(ringPath).join("");
    if (geometry.type === "MultiPolygon") return geometry.coordinates.map(function (polygon) { return polygon.map(ringPath).join(""); }).join("");
    if (geometry.type === "GeometryCollection") return geometry.geometries.map(geometryPath).join("");
    return "";
  }
  function boundsFromFeatures(features) {
    var minX = Infinity, minLat = Infinity, maxX = -Infinity, maxLat = -Infinity;
    function visit(value) {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
        minX = Math.min(minX, Number(value[0])); maxX = Math.max(maxX, Number(value[0]));
        minLat = Math.min(minLat, Number(value[1])); maxLat = Math.max(maxLat, Number(value[1]));
        return;
      }
      value.forEach(visit);
    }
    features.forEach(function (feature) { if (feature.geometry) visit(feature.geometry.coordinates); });
    if (![minX,minLat,maxX,maxLat].every(Number.isFinite)) return null;
    if (scope === "domestic") minLat = Math.max(minLat,17.5);
    var width = Math.max(1, maxX - minX), height = Math.max(1, maxLat - minLat);
    if (scope === "international") return { x:-180, y:-85, width:360, height:170 };
    var padX = width * .035, padY = height * .05;
    return { x:minX-padX, y:-maxLat-padY, width:width+padX*2, height:height+padY*2 };
  }
  function applyViewBox() {
    var svg = map && map.querySelector("svg");
    if (!svg || !currentBounds) return;
    svg.setAttribute("viewBox", [currentBounds.x,currentBounds.y,currentBounds.width,currentBounds.height].join(" "));
  }
  function renderMap() {
    if (!map) return;
    var features = geo[scope] && Array.isArray(geo[scope].features) ? geo[scope].features : [];
    if (!features.length) { map.innerHTML = ""; return; }
    var paths = features.map(function (feature) {
      var place = placeForFeature(feature);
      var name = place ? (place.nameZh || place.name) : (feature.properties && feature.properties.name) || "";
      var label = name ? '<title>' + esc(name) + '</title>' : "";
      var id = place ? ' data-place-id="' + esc(place.id) + '" role="button" tabindex="0" aria-label="标记 ' + esc(name) + '" aria-pressed="' + !!statusKind(place) + '"' : "";
      return '<path class="map-shape" fill="' + shapeColor(place) + '" d="' + geometryPath(feature.geometry) + '"' + id + '>' + label + '</path>';
    }).join("");
    map.innerHTML = '<svg class="map-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-180 -85 360 170" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + (scope === "domestic" ? "中国省级行政区旅行足迹" : "全球国家旅行足迹") + '">' + paths + '</svg>';
    applyViewBox();
  }
  function fitMap() {
    if (!map || !geo[scope]) return;
    var features = geo[scope].features || [];
    fittedBounds = boundsFromFeatures(features);
    if (!fittedBounds) return;
    currentBounds = Object.assign({}, fittedBounds);
    fitPending = false;
    applyViewBox();
  }
  function zoomMap(factor) {
    if (!currentBounds) return;
    var width = currentBounds.width * factor, height = currentBounds.height * factor;
    if (width < fittedBounds.width * .18 || width > fittedBounds.width * 8) return;
    currentBounds = { x:currentBounds.x+(currentBounds.width-width)/2, y:currentBounds.y+(currentBounds.height-height)/2, width:width, height:height };
    applyViewBox();
  }
  function renderMapAndList() {
    renderMap();
    buildStats();
    renderList();
    if (fitPending && geo[scope]) fitMap();
  }
  function render() { renderMapAndList(); }
  function getGroupName(place) { return scope === "domestic" ? place.group : place.continent; }
  function groupOrder() { return scope === "domestic" ? ["东北","华北","华东","华中","华南","西南","西北","港澳台"] : CONTINENT_ORDER.map(function (item) { return item[0]; }); }
  function matchesPlace(place) {
    var query = normalize(searchText);
    if (query && normalize([place.nameZh, place.nameEn, place.name].filter(Boolean).join(" ")).indexOf(query) < 0) return false;
    var visited = isVisibleVisited(place);
    if (statusFilter === "visited" && !visited) return false;
    if (statusFilter === "unvisited" && visited) return false;
    if (scope === "international" && continentFilter && place.continent !== continentFilter) return false;
    return true;
  }
  function renderPlace(place) {
    var kind = statusKind(place);
    var statusText = kind === "shared" ? "两人都去过" : kind === "yy" ? "YY 去过" : kind === "evelyn" ? "Evelyn 去过" : "还没去过";
    var ownerButtons = ownersForView().map(function (owner) {
      var visited = isVisited(place, owner);
      var word = ownerName(owner);
      var label = visited ? "✓ " + word : "+ " + word;
      return '<button type="button" class="owner-toggle ' + owner + (visited ? " is-visited" : "") + '" data-toggle-owner="' + owner + '" data-place-id="' + esc(place.id) + '" aria-pressed="' + visited + '" aria-label="' + esc((visited ? "取消" : "标记") + place.nameZh + "为" + word + "去过") + '">' + label + '</button>';
    }).join("");
    var english = scope === "international" && place.nameEn && normalize(place.nameEn) !== normalize(place.nameZh)
      ? '<span class="place-name-en">' + esc(place.nameEn) + '</span>' : "";
    var code = scope === "domestic" ? "CN" : countryCode(place.id);
    var stateClass = kind || "unvisited";
    return '<div class="place-row state-' + stateClass + '"><div class="place-main"><i class="place-swatch ' + kind + '"></i><span class="place-code" aria-hidden="true">' + esc(code) + '</span><div class="place-copy"><div class="place-name">' + esc(place.nameZh || place.name) + english + '</div><div class="place-state">' + statusText + '</div></div></div><div class="owner-actions">' + ownerButtons + '</div></div>';
  }
  function renderList() {
    var host = $("regionList"), places = scopePlaces();
    if (!places.length) {
      host.innerHTML = '<div class="empty">地图地区数据还在载入…</div>';
      return;
    }
    var groupsHtml = [];
    groupOrder().forEach(function (groupName) {
      var fullGroup = places.filter(function (place) { return getGroupName(place) === groupName; });
      var filtered = fullGroup.filter(matchesPlace);
      if (!filtered.length) return;
      var header = scope === "international"
        ? '<span>' + countryVisited(groupName) + ' / ' + fullGroup.length + '</span>'
        : '<span>' + fullGroup.length + ' 个地区</span>';
      groupsHtml.push('<section class="region-section" data-region-section="' + esc(groupName) + '"><div class="region-section-head"><strong>' + esc(scope === "international" ? countryContinent(groupName) : groupName) + '</strong>' + header + '</div>' + filtered.map(renderPlace).join("") + '</section>');
    });
    host.innerHTML = groupsHtml.length ? groupsHtml.join("") : '<div class="empty">没有符合搜索或筛选条件的地区。</div>';
  }
  function countryCode(code) {
    return String(code || "CN").toUpperCase().replace(/[^A-Z]/g, "").slice(0,2);
  }
  function recordPlaceId(row) { return resolvePlaceId(row); }
  function findRecordIndex(owner, place) {
    return state[owner].findIndex(function (row) { return row.scope === scope && recordPlaceId(row) === place.id; });
  }
  function newRecord(place) {
    var latitude = scope === "domestic" ? Number(place.lat) : Number(place.latlng && place.latlng[0]);
    var longitude = scope === "domestic" ? Number(place.lon) : Number(place.latlng && place.latlng[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) { latitude=0; longitude=0; }
    return {
      id:window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      placeId:place.id, name:place.nameZh || place.name, scope:scope, lat:latitude, lon:longitude,
      createdAt:new Date().toISOString()
    };
  }
  function toggleOwners(place, owners) {
    if (!place) return;
    var beforeState = { yy:state.yy.slice(), evelyn:state.evelyn.slice() };
    var beforeTombstones = { yy:tombstones.yy.slice(), evelyn:tombstones.evelyn.slice() };
    owners.forEach(function (owner) {
      var index = findRecordIndex(owner, place);
      if (index >= 0) {
        var removed = state[owner].splice(index,1)[0];
        tombstones[owner].push(removed.id);
      } else {
        state[owner].push(newRecord(place));
      }
    });
    if (!writeLocal()) {
      state=beforeState;
      tombstones=beforeTombstones;
      setMessage("本机存储失败，足迹没有更改。","error");
      return;
    }
    render();
    setMessage((owners.length === 2 ? (owners.every(function (owner) { return isVisited(place,owner); }) ? "已标记为两人都去过。" : "已取消两人的足迹。") : (isVisited(place,owners[0]) ? "已标记为" + ownerName(owners[0]) + "去过。" : "已取消" + ownerName(owners[0]) + "的足迹。")),"ok");
    owners.forEach(function (owner) { afterLocalChange(owner); });
  }
  function toggleMapPlace(place) {
    if (personView === "both") {
      var isShared = isVisited(place,"yy") && isVisited(place,"evelyn");
      if (isShared) {
        toggleOwners(place,["yy","evelyn"]);
      } else {
        var ownersToAdd = ["yy","evelyn"].filter(function (owner) { return !isVisited(place,owner); });
        if (ownersToAdd.length) toggleOwners(place,ownersToAdd);
      }
    } else {
      toggleOwners(place,[personView]);
    }
  }
  function syncOwner(owner) {
    dirty[owner]=true;
    if (!cloudReady) return;
    cloudWritable=hasWriteKey();
    if (!cloudWritable) { setCloudStatus("云端只读 · 此设备未绑定写入权限","wait"); return; }
    setCloudStatus("正在同步旅行记录到云端…","wait");
    syncQueue=syncQueue.catch(function(){}).then(function() {
      if (!hasWriteKey()) throw new Error("no-write-key");
      return window.WB.put(cloudKey(owner),envelope(owner));
    }).then(function() {
      dirty[owner]=false;
      writeLocal();
      setCloudStatus(anyDirty() ? "正在同步旅行记录到云端…" : "旅行记录已同步到云端",anyDirty() ? "wait" : "ok");
    }).catch(function(error) {
      cloudWritable=hasWriteKey();
      if (error && error.message==="no-write-key") setCloudStatus("云端只读 · 此设备未绑定写入权限","wait");
      else { setCloudStatus("云端同步失败 · 本机记录仍已保存","error"); setMessage("同步失败，记录已保存在本机；网络恢复后再点击一次状态即可重试。","error"); }
    });
  }
  function anyDirty() { return dirty.yy || dirty.evelyn; }
  function afterLocalChange(owner) {
    if (cloudReady && cloudWritable) syncOwner(owner);
    else if (cloudReady) setCloudStatus("云端只读 · 此设备未绑定写入权限","wait");
    else setCloudStatus("云端连接中 · 足迹已保存到本机","wait");
  }
  function onCloudReady() {
    cloudReady=true;
    cloudWritable=hasWriteKey();
    var needsSync=[];
    ["yy","evelyn"].forEach(function(owner) {
      var remote=window.WB.data && window.WB.data[cloudKey(owner)];
      if (mergeCloudOwner(owner,remote)) needsSync.push(owner);
    });
    writeLocal();
    render();
    if (!cloudWritable) { setCloudStatus("云端只读 · 此设备未绑定写入权限","wait"); return; }
    if (!needsSync.length) { setCloudStatus("旅行记录已从云端载入","ok"); return; }
    needsSync.forEach(syncOwner);
  }
  function setFilter(next) {
    statusFilter=next;
    document.querySelectorAll("[data-filter]").forEach(function(button) {
      button.setAttribute("aria-pressed",String(button.dataset.filter===statusFilter));
    });
    renderList();
  }
  function bindEvents() {
    document.querySelectorAll("[data-scope]").forEach(function(button) {
      button.addEventListener("click",function(){setScope(button.dataset.scope);});
    });
    document.querySelectorAll("[data-person]").forEach(function(button) {
      button.addEventListener("click",function(){setPerson(button.dataset.person);});
    });
    document.querySelectorAll("[data-filter]").forEach(function(button) {
      button.addEventListener("click",function(){setFilter(button.dataset.filter);});
    });
    $("searchInput").addEventListener("input",function(){searchText=this.value||"";renderList();});
    $("fitBtn").addEventListener("click",fitMap);
    $("regionList").addEventListener("click",function(event) {
      var button=event.target.closest("[data-place-id]");
      if(!button) return;
      var place=scope==="domestic" ? domesticById.get(button.dataset.placeId) : countryById.get(button.dataset.placeId);
      if(place && button.dataset.toggleOwner) toggleOwners(place,[button.dataset.toggleOwner]);
    });
    $("statsGrid").addEventListener("click",function(event) {
      var button=event.target.closest("[data-stat-continent]");
      if(!button) return;
      continentFilter=continentFilter===button.dataset.statContinent ? "" : button.dataset.statContinent;
      buildStats();
      renderList();
    });
    $("map").addEventListener("click",function(event) {
      var shape=event.target.closest("[data-place-id]");
      if(!shape) return;
      var place=scope==="domestic" ? domesticById.get(shape.dataset.placeId) : countryById.get(shape.dataset.placeId);
      if(place) toggleMapPlace(place);
    });
    $("map").addEventListener("keydown",function(event) {
      if((event.key!=="Enter" && event.key!==" ") || !event.target.matches("[data-place-id]")) return;
      event.preventDefault();
      var place=scope==="domestic" ? domesticById.get(event.target.dataset.placeId) : countryById.get(event.target.dataset.placeId);
      if(place) toggleMapPlace(place);
    });
    $("zoomInBtn").addEventListener("click",function(){zoomMap(.78);});
    $("zoomOutBtn").addEventListener("click",function(){zoomMap(1.28);});
    window.addEventListener("resize",function(){if(fitPending)fitMap();});
  }
  function fetchJson(path) {
    return fetch(DATA_PATH+path,{cache:"force-cache"}).then(function(response) {
      if(!response.ok) throw new Error("HTTP "+response.status+" loading "+path);
      return response.json();
    });
  }
  function loadMapData() {
    return Promise.all([fetchJson("china-provinces.geojson"),fetchJson("world-countries.geojson"),fetchJson("countries.json")]).then(function(values) {
      geo.domestic=values[0];
      geo.international=values[1];
      countries=values[2];
      countryById=new Map(countries.map(function(place){return[place.id,place];}));
      updateMapLabels();
      render();
      fitPending=true;
      fitMap();
      if(countries.length!==195 || DOMESTIC.length!==34) throw new Error("Map catalogue count mismatch");
    }).catch(function(error) {
      $("mapOverlay").textContent="地图边界载入失败；可先用搜索列表查看。"+(error.message||"");
      $("mapOverlay").classList.add("error");
      $("regionList").innerHTML='<div class="empty">地图文件未能载入。请刷新页面重试。</div>';
      console.error("travel map data error",error);
    });
  }
  function init() {
    readState();
    bindEvents();
    map=$("map");
    setScope("domestic");
    setPerson("both");
    loadMapData();
    if(window.WB && window.WB.onReady) window.WB.onReady(onCloudReady);
    else setCloudStatus("云端接口不可用 · 足迹暂存在本机","error");
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
