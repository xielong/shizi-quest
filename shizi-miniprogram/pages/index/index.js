/* =========================================================================
   首页：豆豆舞台 + 养成进度 + 选玩法开测 + 多小朋友
   ========================================================================= */
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');
var P = require('../../utils/panda.js');
var app = getApp();

var AGES = [3, 4, 5, 6, 7, 8];

var BUBBLES = [
  '嗨，我是熊猫豆豆，一起来闯关吧！',
  '你每认识一个字，我就长大一点点！',
  '今天想让我穿什么衣服，就看你的啦～',
  '我已经准备好啦，随时可以开始！'
];

Page({
  data: {
    name: '',
    ages: ['3 岁', '4 岁', '5 岁', '6 岁', '7 岁', '8 岁'],
    ageIdx: 2,
    mode: 'read',
    bubble: '',
    facing: 'front',
    turnCls: '',
    turnHint: '点豆豆，他会转身',
    panda: [],
    sceneSrc: '',
    sceneTag: '',
    snow: [],
    ppPct: 0,
    ppText: '',
    chips: [],
    worldLine: '',
    /* 小朋友 */
    players: [],
    curPid: '',
    curName: ''
  },

  onLoad: function () {
    this.setData({ bubble: BUBBLES[Math.floor(Math.random() * BUBBLES.length)] });
    this.loadPlayers();
  },

  onShow: function () { this.refresh(); },

  /* ---- 小朋友列表 ---- */
  loadPlayers: function () {
    var list = store.listPlayers();
    var cur = store.curPlayer();
    this.setData({
      players: list.map(function (p) { return { id: p.id, name: p.name, age: p.age }; }),
      curPid: cur.id,
      curName: cur.name,
      name: cur.name,
      ageIdx: Math.max(0, AGES.indexOf(cur.age))
    });
  },

  /* 换人：进度、豆豆、表单一起换成他的 */
  switchPlayer: function (e) {
    var id = e.currentTarget.dataset.id;
    if (id === this.data.curPid) return;
    store.setCur(id);
    app.reloadProfile();
    this.setData({ facing: 'front', turnCls: '', turnHint: '点豆豆，他会转身' });
    this.loadPlayers();
    this.refresh();
    wx.showToast({ title: '换成 ' + store.curPlayer().name + ' 啦', icon: 'none', duration: 1200 });
  },

  addPlayer: function () {
    var that = this;
    wx.showModal({
      title: '加一个小朋友',
      editable: true,
      placeholderText: '写个小名就好，比如「朵朵」',
      success: function (res) {
        if (!res.confirm) return;
        var nm = (res.content || '').trim();
        if (!nm) return;
        store.addPlayer(nm, 5);
        app.reloadProfile();
        that.setData({ facing: 'front', turnCls: '', turnHint: '点豆豆，他会转身' });
        that.loadPlayers();
        that.refresh();
        wx.showToast({ title: '已切到 ' + nm + '，进度是全新的哦', icon: 'none', duration: 1800 });
      }
    });
  },

  /* 长按某个小朋友：改名 / 删掉 */
  playerMenu: function (e) {
    var id = e.currentTarget.dataset.id, that = this;
    var target = null;
    this.data.players.forEach(function (p) { if (p.id === id) target = p; });
    if (!target) return;
    var items = ['改名', '删掉这个小朋友'];
    wx.showActionSheet({
      itemList: items,
      success: function (res) {
        if (res.tapIndex === 0) that.renamePlayer(target);
        else that.deletePlayer(target);
      }
    });
  },

  renamePlayer: function (target) {
    var that = this;
    wx.showModal({
      title: '改名字',
      editable: true,
      content: target.name,
      placeholderText: '新的名字',
      success: function (res) {
        if (!res.confirm) return;
        var nm = (res.content || '').trim();
        if (!nm) return;
        store.updatePlayer(target.id, { name: nm });
        app.reloadProfile();
        that.loadPlayers();
        that.setData({ curName: store.curPlayer().name });
      }
    });
  },

  deletePlayer: function (target) {
    var that = this;
    if (this.data.players.length <= 1) {
      wx.showToast({ title: '至少要留一个小朋友', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '删掉 ' + target.name + '？',
      content: '他的豆豆和成长记录会一起删掉，没法恢复。',
      confirmText: '删掉',
      confirmColor: '#e05b5b',
      success: function (res) {
        if (!res.confirm) return;
        store.removePlayer(target.id);
        app.reloadProfile();
        that.setData({ facing: 'front', turnCls: '', turnHint: '点豆豆，他会转身' });
        that.loadPlayers();
        that.refresh();
        wx.showToast({ title: '删掉了', icon: 'none' });
      }
    });
  },

  /* ---- 清空当前小朋友的进度 ---- */
  resetProgress: function () {
    var that = this;
    var cur = store.curPlayer();
    wx.showModal({
      title: '清空 ' + cur.name + ' 的进度？',
      content: '豆豆会变回一开始的样子（只剩个头），四季小世界和成长记录也一起清零。名字会留着。',
      confirmText: '清空',
      confirmColor: '#e05b5b',
      success: function (res) {
        if (!res.confirm) return;
        store.clearPlayerData(cur.id);
        that.setData({ facing: 'front', turnCls: '', turnHint: '点豆豆，他会转身' });
        that.refresh();
        wx.showToast({ title: '进度已清零，豆豆重新开始', icon: 'none', duration: 1800 });
      }
    });
  },

  /* ---- 把豆豆和进度刷成最新（每次回到首页都调） ---- */
  refresh: function () {
    var total = store.pandaTotal();
    var cur = E.sceneCur(total);
    var next = E.pandaNext(total);
    var sn = E.sceneNext(total);

    /* 进度条：离下一个零件有多远（跟网页版同一条公式） */
    var pct = 100, ppText;
    if (next) {
      var prev = 0, i;
      for (i = 0; i < E.PANDA_PARTS.length; i++) { if (E.PANDA_PARTS[i].at <= total) prev = E.PANDA_PARTS[i].at; }
      pct = Math.max(4, Math.min(100, Math.round((total - prev) / (next.at - prev) * 100)));
      ppText = '再认识 ' + (next.at - total) + ' 个字，豆豆就能长出「' + next.name + '」';
    } else {
      ppText = '豆豆的零件全都长齐啦，真了不起！';
    }

    this.setData({
      panda: P.layers(total, this.data.facing),
      sceneSrc: P.sceneImage(total),
      sceneTag: cur.emoji + ' ' + cur.name,
      snow: (cur.id === 'winter') ? P.snowflakes(16) : [],
      ppPct: pct,
      ppText: ppText,
      chips: P.partWall(total),
      worldLine: cur.emoji + ' ' + cur.name +
        (sn ? ('　·　再认 ' + (sn.at - total) + ' 个字，豆豆就搬去「' + sn.name + '」')
            : '　·　这是豆豆最喜欢的地方啦')
    });
  },

  /* ---- 点豆豆：转身看背面 ---- */
  turnPanda: function () {
    if (this._turning) return;
    this._turning = true;
    var that = this;
    var facing = this.data.facing === 'back' ? 'front' : 'back';
    this.setData({
      turnCls: 'turn-out',
      turnHint: facing === 'back' ? '点豆豆，转回正面' : '点豆豆，他会转身'
    });
    setTimeout(function () {
      that.setData({
        facing: facing,
        panda: P.layers(store.pandaTotal(), facing),
        turnCls: 'turn-in'
      });
      setTimeout(function () {
        that.setData({ turnCls: '' });
        that._turning = false;
      }, 320);
    }, 180);
  },

  /* ---- 表单（改的就是当前小朋友） ---- */
  onName: function (e) { this.setData({ name: e.detail.value }); },
  onAge: function (e) {
    var idx = Number(e.detail.value);
    this.setData({ ageIdx: idx });
    this.saveForm();
  },
  saveForm: function () {
    var name = (this.data.name || '').trim();
    if (!name) { this.setData({ name: store.curPlayer().name }); return; }
    var saved = store.updatePlayer(store.curId(), { name: name, age: AGES[this.data.ageIdx] || 5 });
    if (saved) this.setData({ curName: saved.name });
    app.reloadProfile();
  },
  pickMode: function (e) { this.setData({ mode: e.currentTarget.dataset.mode }); },

  /* ---- 开始测试 ---- */
  start: function () {
    this.saveForm();
    var p = app.profile();
    var session = E.newSession({ name: p.name, age: p.age, mode: this.data.mode });
    app.globalData.session = session;
    wx.navigateTo({ url: '/pages/test/test' });
  },

  goHelp: function () { wx.navigateTo({ url: '/pages/help/help' }); },
  goHistory: function () { wx.navigateTo({ url: '/pages/history/history' }); }
});
