/* =========================================================================
   首页：豆豆舞台 + 养成进度 + 选玩法开测
   ========================================================================= */
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');
var P = require('../../utils/panda.js');
var app = getApp();

var BUBBLES = [
  '嗨，我是熊猫豆豆，一起来闯关吧！',
  '你每认识一个字，我就长大一点点！',
  '今天想让我穿什么衣服，就看你的啦～',
  '我已经准备好啦，随时可以开始！'
];

Page({
  data: {
    name: '跳跳',
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
    worldLine: ''
  },

  onLoad: function () {
    var p = app.profile();
    var idx = [3, 4, 5, 6, 7, 8].indexOf(p.age);
    this.setData({
      name: p.name,
      ageIdx: idx >= 0 ? idx : 2,
      bubble: BUBBLES[Math.floor(Math.random() * BUBBLES.length)]
    });
  },

  onShow: function () { this.refresh(); },

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

  /* ---- 表单 ---- */
  onName: function (e) { this.setData({ name: e.detail.value }); },
  onAge: function (e) { this.setData({ ageIdx: Number(e.detail.value) }); },
  pickMode: function (e) { this.setData({ mode: e.currentTarget.dataset.mode }); },

  /* ---- 开始测试 ---- */
  start: function () {
    var ages = [3, 4, 5, 6, 7, 8];
    var name = (this.data.name || '').trim() || '跳跳';
    var age = ages[this.data.ageIdx] || 5;
    app.setProfile({ name: name, age: age });

    var session = E.newSession({ name: name, age: age, mode: this.data.mode });
    app.globalData.session = session;
    wx.navigateTo({ url: '/pages/test/test' });
  },

  goHelp: function () { wx.navigateTo({ url: '/pages/help/help' }); },
  goHistory: function () { wx.navigateTo({ url: '/pages/history/history' }); }
});
