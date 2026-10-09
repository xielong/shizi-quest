/* =========================================================================
   store.js —— 本地存储封装（网页版 localStorage 的对应物）
   网页版三个 key 原样沿用，所以老数据如果将来做迁移也能对得上：
     shizi_quest_panda_v1   累计认对字数（熊猫养成进度）
     shizi_quest_world_v1   已住过的场景数（四季搬家进度）
     shizi_quest_history_v1 历次测试记录
   ========================================================================= */
'use strict';

var PANDA_KEY = 'shizi_quest_panda_v1';
var SCENE_KEY = 'shizi_quest_world_v1';
var STORE_KEY = 'shizi_quest_history_v1';
var PROFILE_KEY = 'shizi_quest_profile_v1';   // 小朋友的名字、年龄

function safeGet(key) {
  try {
    var v = wx.getStorageSync(key);
    return (v === '' || v === null || v === undefined) ? null : v;
  } catch (e) { return null; }
}
function safeSet(key, val) {
  try { wx.setStorageSync(key, val); } catch (e) { }
}

/* ---- 熊猫养成进度 ---- */
function pandaTotal() {
  var v = parseInt(safeGet(PANDA_KEY), 10);
  return isNaN(v) ? 0 : Math.max(0, v);
}
function pandaSetTotal(n) { safeSet(PANDA_KEY, String(Math.max(0, n | 0))); }
function pandaAdd(n) {
  var before = pandaTotal(), after = before + (n | 0);
  pandaSetTotal(after);
  return after;
}

/* ---- 四季场景进度 ---- */
function sceneSeen() {
  var v = parseInt(safeGet(SCENE_KEY), 10);
  return isNaN(v) ? 0 : Math.max(0, v);
}
function sceneSetSeen(n) { safeSet(SCENE_KEY, String(Math.max(0, n | 0))); }

/* ---- 成长记录 ---- */
function loadHistory() {
  var v = safeGet(STORE_KEY);
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return []; } }
  return Array.isArray(v) ? v : [];
}
function saveHistory(list) { safeSet(STORE_KEY, JSON.stringify(list || [])); }
function pushRecord(rec) {
  var list = loadHistory();
  list.push(rec);
  if (list.length > 60) list = list.slice(list.length - 60);
  saveHistory(list);
  return list;
}

/* ---- 小朋友的名字 / 年龄 ---- */
function getProfile() {
  var v = safeGet(PROFILE_KEY);
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
  return (v && v.name) ? v : { name: '跳跳', age: 5 };
}
function setProfile(p) {
  safeSet(PROFILE_KEY, JSON.stringify({ name: (p && p.name) || '跳跳', age: (p && p.age) || 5 }));
}

module.exports = {
  PANDA_KEY: PANDA_KEY, SCENE_KEY: SCENE_KEY, STORE_KEY: STORE_KEY,
  pandaTotal: pandaTotal, pandaSetTotal: pandaSetTotal, pandaAdd: pandaAdd,
  sceneSeen: sceneSeen, sceneSetSeen: sceneSetSeen,
  loadHistory: loadHistory, saveHistory: saveHistory, pushRecord: pushRecord,
  getProfile: getProfile, setProfile: setProfile
};
