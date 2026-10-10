/* =========================================================================
   结果页：已认识的字（实测口径）+ 豆豆的成长 + 各段表现 + 参考坐标 + 奖状
   2026-10-10 起主数字改为字库实测累计（认识多少字以真判过的为准，
   估算只留在引擎里调节难度，不再上界面）
   ========================================================================= */
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');
var P = require('../../utils/panda.js');
var app = getApp();
var Card = require('./result_card.js');

Page(Object.assign({
  data: {
    name: '', shownEst: 0,
    r: null, starStars: [], levelText: '',
    wrongTotal: 0,
    pandaText: '', panda: [], sceneSrc: '', sceneTag: '', snow: [],
    parts: [], scenes: [], worldNote: '',
    bars: [], barsNote: '',
    refRows: [],
    wrong: [],
    certMeta: '',
    facing: 'front'
  },

  onLoad: function () {
    var r = app.globalData.lastResult;
    if (!r) { wx.redirectTo({ url: '/pages/index/index' }); return; }
    var fresh = app.globalData.lastFresh || { parts: [], scenes: [] };
    var profile = app.profile();
    var total = store.pandaTotal();
    var isSent = r.mode === 'sentence';
    var knownTotal = (r.knownTotal !== undefined) ? r.knownTotal : 0;
    var wrongTotal = (r.wrongTotal !== undefined) ? r.wrongTotal : 0;
    var knownGain = r.knownGain || 0;

    var starStars = [], i;
    for (i = 1; i <= E.LEVELS.length; i++) starStars.push({ i: i, on: i <= r.starLevel });
    var nextLv = E.LEVELS[r.starLevel];   /* 下一星要攒满的容量 */
    var lvText = r.starLevel > 0
      ? ('已点亮 ' + r.starLevel + ' 星（累计认识 ' + knownTotal + ' 字）')
      : ('再认识 ' + (nextLv ? nextLv.size - knownTotal : 0) + ' 个字，点亮一星');
    var levelText = '这一轮新认识 ' + knownGain + ' 个字 · ' + lvText
      + (isSent ? (' · 共读了 ' + r.sentCount + ' 句') : (' · 共做 ' + r.count + ' 题'));

    /* ---- 豆豆的成长 ---- */
    var pun = E.pandaUnlocked(total), pnext = E.pandaNext(total), freshNames = [];
    E.PANDA_PARTS.forEach(function (p) { if (fresh.parts.indexOf(p.id) >= 0) freshNames.push(p.name); });
    var pandaText = freshNames.length
      ? ('这次新长出了 ' + freshNames.join('、') + '！豆豆现在一共有 ' + pun.length + ' 个零件。')
      : (pnext
        ? ('这次没有长出新零件。再答对 ' + Math.ceil((pnext.at - total) / E.EARN_RATE) + ' 个字，豆豆就能长出「' + pnext.name + '」了。')
        : '豆豆的零件已经全部长齐啦，真厉害！');

    var cur = E.sceneCur(total), scNext = E.sceneNext(total);
    var freshScNames = [];
    E.SCENES.forEach(function (sc) { if (fresh.scenes.indexOf(sc.id) >= 0) freshScNames.push(sc.name); });
    var worldNote = freshScNames.length
      ? ('豆豆这次搬去了 ' + freshScNames.join('、') + '！')
      : (scNext
        ? ('豆豆现在住在 ' + cur.name + '，再答对 ' + Math.ceil((scNext.at - total) / E.EARN_RATE) + ' 个字就搬去「' + scNext.name + '」')
        : '豆豆把四个季节都住遍啦，真了不起！');

    /* ---- 条形图（各难度段的实测认识率，决定下一轮从哪测） ---- */
    var bars = r.levels.map(function (L) {
      var tested = L.asked > 0;
      var pct = Math.round(L.pc * 100);
      return {
        i: L.i, stars: L.stars, color: tested ? L.color : '#e6ecf8',
        w: tested ? Math.max(pct, 2) : 0,
        pcText: tested ? pct + '%' : '—',
        nText: tested ? (L.correct + '/' + L.asked) : '未测'
      };
    });
    var barsNote = '颜色越长表示这一段的字认识得越多（题数是几轮合起来的）。'
      + '程序按这个表现调整下一轮的出题难度：都认识就往上探，碰壁了就在附近多测。';

    /* ---- 同龄参考 ---- */
    var refRows = E.AGE_REF.map(function (row) {
      var a = parseInt(row[0], 10);
      return { label: row[0], range: row[1], self: !isNaN(a) && a === profile.age };
    });

    this.setData({
      name: profile.name,
      r: r,
      wrongTotal: wrongTotal,
      starStars: starStars,
      levelText: levelText,
      pandaText: pandaText,
      panda: P.layers(total, 'front'),
      sceneSrc: P.sceneImage(total),
      sceneTag: cur.emoji + ' ' + cur.name,
      snow: (cur.id === 'winter') ? P.snowflakes(12) : [],
      parts: P.partWall(total).map(function (p) {
        p.fresh = fresh.parts.indexOf(p.id) >= 0 ? 1 : 0; return p;
      }),
      scenes: P.sceneWall(total).map(function (s2) {
        s2.fresh = fresh.scenes.indexOf(s2.id) >= 0 ? 1 : 0; return s2;
      }),
      worldNote: worldNote,
      bars: bars, barsNote: barsNote,
      refRows: refRows,
      wrong: r.wrong.slice(0, 40),
      certMeta: profile.age + ' 岁 · 已认识 ' + knownTotal + ' 个字 · ' + E.todayStr()
    });

    this.animNumber(knownTotal);
  },

  /* 数字滚动 */
  animNumber: function (target) {
    var that = this, t0 = Date.now();
    var timer = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / 900);
      var e = 1 - Math.pow(1 - k, 3);
      that.setData({ shownEst: Math.round(target * e) });
      if (k >= 1) clearInterval(timer);
    }, 30);
    this._numTimer = timer;
  },

  onUnload: function () { if (this._numTimer) clearInterval(this._numTimer); },

  turnPanda: function () {
    if (this._turning) return;
    this._turning = true;
    var that = this;
    var facing = this.data.facing === 'back' ? 'front' : 'back';
    setTimeout(function () {
      that.setData({ facing: facing, panda: P.layers(store.pandaTotal(), facing) });
      that._turning = false;
    }, 120);
  },

  showWord: function (e) {
    var ch = e.currentTarget.dataset.c;
    wx.showModal({
      title: '这个字念什么？',
      content: ch + ' —— 请家长带着小朋友多念几遍，下次见到就是老朋友啦。',
      showCancel: false, confirmText: '记住啦'
    });
  },

  again: function () {
    var profile = app.profile();
    var r = this.data.r;
    var session = E.newSession({
      name: profile.name, age: profile.age, mode: r.mode,
      prior: store.getPrior(r.mode)
    });
    app.globalData.session = session;
    wx.redirectTo({ url: '/pages/test/test' });
  },

  goHome: function () { wx.reLaunch({ url: '/pages/index/index' }); },
  goHistory: function () { wx.navigateTo({ url: '/pages/history/history' }); }
}, Card));
