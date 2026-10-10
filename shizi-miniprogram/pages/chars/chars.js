/* =========================================================================
   字库页：小朋友认识的字 + 生字本
   数据来自 store 的字库（每轮结算写入，同一个字以最近一次判定为准）
   ========================================================================= */
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');

Page({
  data: {
    tab: 0,           /* 0 认识的字 · 1 生字本 */
    name: '',
    knownCnt: 0, wrongCnt: 0, testedCnt: 0,
    groups: [], empty: false
  },

  onLoad: function () { this.refresh(); },
  onShow: function () { this.refresh(); },   /* 从别页回来时刷新计数 */

  refresh: function () {
    var v = store.getChars();
    var known = Object.keys(v.known);
    var wrong = Object.keys(v.wrong);
    var list = this.data.tab === 0 ? known : wrong;
    this.setData({
      name: store.getProfile().name,
      knownCnt: known.length,
      wrongCnt: wrong.length,
      testedCnt: known.length + wrong.length,
      groups: this.buildGroups(list),
      empty: list.length === 0
    });
    wx.setNavigationBarTitle({ title: this.data.tab === 0 ? '认识的字' : '生字本' });
  },

  /* 按星级分组（字表里每个字都属于某一档） */
  buildGroups: function (chars) {
    var byLevel = {};
    chars.forEach(function (ch) {
      var L = E.LEVEL_OF[ch] || 1;
      (byLevel[L] = byLevel[L] || []).push({ ch: ch });
    });
    var out = [];
    Object.keys(byLevel).map(Number).sort(function (a, b) { return a - b; }).forEach(function (L) {
      var lv = E.LEVELS[L - 1];
      out.push({
        stars: lv.stars, name: lv.name, color: lv.color,
        cnt: byLevel[L].length, chars: byLevel[L]
      });
    });
    return out;
  },

  switchTab: function (e) {
    this.setData({ tab: +e.currentTarget.dataset.t });
    this.refresh();
  },

  /* 生字本里点一个字：复习提示 */
  showChar: function (e) {
    if (this.data.tab !== 1) return;
    var ch = e.currentTarget.dataset.c;
    wx.showModal({
      title: '这个字念什么？',
      content: ch + ' —— 请家长带着小朋友多念几遍，下次测到它认识啦，就会从生字本搬进「认识的字」。',
      showCancel: false, confirmText: '记住啦'
    });
  }
});
