/* =========================================================================
   store.js —— 本地存储封装（网页版 localStorage 的对应物）

   多小朋友：每个小朋友一份独立进度，靠 key 后缀区分
     shizi_players_v1               { cur:'p1', list:[{id,name,age}] }
     shizi_panda_v1::p1             该小朋友累计认对字数（熊猫养成进度）
     shizi_world_v1::p1             该小朋友已住过的场景数（四季搬家进度）
     shizi_history_v1::p1           该小朋友的历次测试记录

   兼容：小程序最早那一版（以及网页版）把进度直接存在不带后缀的
   shizi_quest_panda_v1 / _world_v1 / _history_v1 里。第一次运行时会把这些
   老数据迁到第一个小朋友名下，不会丢进度。
   ========================================================================= */
'use strict';

var PLAYERS_KEY = 'shizi_players_v1';
var BASE_PANDA = 'shizi_quest_panda_v1';
var BASE_SCENE = 'shizi_quest_world_v1';
var BASE_HIST = 'shizi_quest_history_v1';
var LEGACY_PROFILE = 'shizi_quest_profile_v1';

function safeGet(key) {
  try {
    var v = wx.getStorageSync(key);
    return (v === '' || v === null || v === undefined) ? null : v;
  } catch (e) { return null; }
}
function safeSet(key, val) {
  try { wx.setStorageSync(key, val); } catch (e) { }
}
function safeDel(key) {
  try { wx.removeStorageSync(key); } catch (e) { }
}
function parse(v, fallback) {
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return fallback; } }
  return v === null || v === undefined ? fallback : v;
}
function keyOf(base, pid) { return base + '::' + pid; }

/* ============ 小朋友 ============ */

function newId() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }

/* 老数据迁移：不带后缀的那三个 key → 指定小朋友名下 */
function migrateLegacy(pid) {
  var moved = false;
  [[BASE_PANDA, 'panda'], [BASE_SCENE, 'scene'], [BASE_HIST, 'hist']].forEach(function (pair) {
    var v = safeGet(pair[0]);
    if (v === null) return;
    safeSet(keyOf(pair[0], pid), v);
    safeDel(pair[0]);
    moved = true;
  });
  if (moved) safeDel(LEGACY_PROFILE);
  return moved;
}

/* 读小朋友列表；首次运行会建一个默认小朋友并把老进度迁进来 */
function loadPlayers() {
  var v = parse(safeGet(PLAYERS_KEY), null);
  if (!v || !Array.isArray(v.list) || !v.list.length) {
    var old = parse(safeGet(LEGACY_PROFILE), {});
    var first = { id: 'p1', name: (old && old.name) || '跳跳', age: (old && old.age) || 5 };
    v = { cur: first.id, list: [first] };
    safeSet(PLAYERS_KEY, JSON.stringify(v));
    migrateLegacy(first.id);
    return v;
  }
  /* 兜底：cur 指向不存在的小朋友 */
  var found = false;
  for (var i = 0; i < v.list.length; i++) { if (v.list[i].id === v.cur) found = true; }
  if (!found) { v.cur = v.list[0].id; safeSet(PLAYERS_KEY, JSON.stringify(v)); }
  return v;
}

function savePlayers(v) { safeSet(PLAYERS_KEY, JSON.stringify(v)); }

function listPlayers() { return loadPlayers().list; }

/* 当前小朋友（一定返回一个有效对象） */
function curPlayer() {
  var v = loadPlayers();
  for (var i = 0; i < v.list.length; i++) { if (v.list[i].id === v.cur) return v.list[i]; }
  return v.list[0];
}
function curId() { return curPlayer().id; }

function setCur(id) {
  var v = loadPlayers();
  for (var i = 0; i < v.list.length; i++) { if (v.list[i].id === id) { v.cur = id; savePlayers(v); return true; } }
  return false;
}

function addPlayer(name, age) {
  var v = loadPlayers();
  var p = { id: newId(), name: (name || '').trim() || ('小朋友' + (v.list.length + 1)), age: age || 5 };
  v.list.push(p);
  v.cur = p.id;
  savePlayers(v);
  return p;
}

function updatePlayer(id, patch) {
  var v = loadPlayers();
  for (var i = 0; i < v.list.length; i++) {
    if (v.list[i].id !== id) continue;
    if (patch && patch.name !== undefined) v.list[i].name = String(patch.name).trim() || v.list[i].name;
    if (patch && patch.age !== undefined) v.list[i].age = patch.age;
    savePlayers(v);
    return v.list[i];
  }
  return null;
}

/* 删掉一个小朋友：连带清掉他的进度数据 */
function removePlayer(id) {
  var v = loadPlayers();
  if (v.list.length <= 1) return false;
  var keep = v.list.filter(function (p) { return p.id !== id; });
  if (keep.length === v.list.length) return false;
  clearPlayerData(id);
  v.list = keep;
  if (v.cur === id) v.cur = keep[0].id;
  savePlayers(v);
  return true;
}

/* 清空某个小朋友的进度（豆豆、场景、成长记录），保留这个小朋友本身 */
function clearPlayerData(id) {
  safeDel(keyOf(BASE_PANDA, id));
  safeDel(keyOf(BASE_SCENE, id));
  safeDel(keyOf(BASE_HIST, id));
}

/* ============ 下面这些读写的都是"当前小朋友"的数据 ============ */

/* ---- 熊猫养成进度 ---- */
function pandaTotal() {
  var v = parseInt(safeGet(keyOf(BASE_PANDA, curId())), 10);
  return isNaN(v) ? 0 : Math.max(0, v);
}
function pandaSetTotal(n) { safeSet(keyOf(BASE_PANDA, curId()), String(Math.max(0, n | 0))); }
function pandaAdd(n) {
  var before = pandaTotal(), after = before + (n | 0);
  pandaSetTotal(after);
  return after;
}

/* ---- 四季场景进度 ---- */
function sceneSeen() {
  var v = parseInt(safeGet(keyOf(BASE_SCENE, curId())), 10);
  return isNaN(v) ? 0 : Math.max(0, v);
}
function sceneSetSeen(n) { safeSet(keyOf(BASE_SCENE, curId()), String(Math.max(0, n | 0))); }

/* ---- 成长记录 ---- */
function loadHistory() {
  var v = parse(safeGet(keyOf(BASE_HIST, curId())), []);
  return Array.isArray(v) ? v : [];
}
function saveHistory(list) { safeSet(keyOf(BASE_HIST, curId()), JSON.stringify(list || [])); }
function pushRecord(rec) {
  var list = loadHistory();
  list.push(rec);
  if (list.length > 60) list = list.slice(list.length - 60);
  saveHistory(list);
  return list;
}

/* ---- 兼容老接口：拿/存当前小朋友的名字年龄 ---- */
function getProfile() {
  var p = curPlayer();
  return { name: p.name, age: p.age };
}
function setProfile(p) {
  return updatePlayer(curId(), { name: (p && p.name) || '跳跳', age: (p && p.age) || 5 });
}

module.exports = {
  PLAYERS_KEY: PLAYERS_KEY,
  listPlayers: listPlayers, curPlayer: curPlayer, curId: curId,
  setCur: setCur, addPlayer: addPlayer, updatePlayer: updatePlayer, removePlayer: removePlayer,
  clearPlayerData: clearPlayerData,
  pandaTotal: pandaTotal, pandaSetTotal: pandaSetTotal, pandaAdd: pandaAdd,
  sceneSeen: sceneSeen, sceneSetSeen: sceneSetSeen,
  loadHistory: loadHistory, saveHistory: saveHistory, pushRecord: pushRecord,
  getProfile: getProfile, setProfile: setProfile
};
