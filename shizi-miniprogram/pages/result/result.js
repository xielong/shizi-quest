/* =========================================================================
   结果页：识字量 + 豆豆的成长 + 各段表现 + 参考坐标 + 奖状
   ========================================================================= */
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');
var P = require('../../utils/panda.js');
var app = getApp();

Page({
  data: {
    name: '', shownEst: 0,
    r: null, starStars: [], levelText: '',
    topOut: false, noMiss: false, estWord: '约',
    accumText: '', roughText: '', noMissText: '',
    pandaText: '', panda: [], sceneSrc: '', sceneTag: '', snow: [],
    parts: [], scenes: [], worldNote: '',
    bars: [], barsNote: '',
    refRows: [],
    wrong: [],
    certMeta: '',
    copied: false,
    facing: 'front'
  },

  onLoad: function () {
    var r = app.globalData.lastResult;
    if (!r) { wx.redirectTo({ url: '/pages/index/index' }); return; }
    var fresh = app.globalData.lastFresh || { parts: [], scenes: [] };
    var profile = app.profile();
    var total = store.pandaTotal();
    var isSent = r.mode === 'sentence';
    /* 一道都没答错 —— 分两种情况：
       ① topOut：真的一路全对闯到了最高关，这张表量不出他了；
       ② noMiss：只是这一轮没答错（题还没做完 / 提前退出，或者他恰好没碰到生字）。
       两种都是"下限"口径，但 ② 必须说清楚，不然家长会以为孩子就认识这么点、
       或者（旧版本的毛病）看着数字贴到 5000 一头雾水。 */
    var topOut = !!r.topOut;
    var noMiss = (r.misses === 0 && r.count > 0 && !topOut);

    /* ---- hero ---- */
    var starStars = [], i;
    for (i = 1; i <= 10; i++) starStars.push({ i: i, on: i <= r.starLevel });
    var howDone = isSent
      ? ('共读了 ' + r.sentCount + ' 句、测到 ' + r.distinct + ' 个字，其中 ' + r.correctTotal + ' 个认识')
      : ('共做 ' + r.count + ' 题、认识 ' + r.correctTotal + ' 题');
    /* 跨轮累积：这一场题少，数字是"这一轮 + 前面几轮"一起算出来的，得跟家长讲清楚 */
    var priorN = r.priorN || 0;
    var accumText = priorN > 0
      ? ('这是第 ' + (r.rounds || 2) + ' 轮。一场只出十来题，免得孩子坐不住；'
         + '所以上面这个数字是把「这一轮 ' + r.count + ' 题」和「前面攒下的 ' + priorN + ' 题」合起来算的。')
      : '';
    var roughText = (priorN > 0 || noMiss)
      ? ''
      : ('这是第一轮摸底，一共才 ' + r.count + ' 题，先看个大概就好。'
         + '用同一种玩法再玩一两轮，前面的证据会累加进来，数字会稳很多。');
    /* 没答错过 → 数字是下限，得说清楚（这也是家长看到的"怎么才这么点/怎么贴顶"的答案） */
    var noMissText = noMiss
      ? ('他这轮 ' + r.count + ' 题一道都没答错，说明还没摸到"他认不出的那条线"，'
         + '所以上面这个数字是保守下限（至少这么多），不是精确值。'
         + '想看得更准：用同一种玩法再玩一两轮，前面的证据会累加进来；'
         + '或者一次多玩几题，等他碰到认不出的字，分界才会露出来。')
      : '';
    var levelText;
    if (topOut) {
      levelText = '全部答对！一路闯到最高难度（' + E.LEVELS[E.LEVELS.length - 1].name + '），' + howDone;
    } else if (noMiss) {
      levelText = '这轮一道都没答错，还没碰到他认不出的字，' + howDone;
    } else {
      levelText = r.starLevel > 0
        ? ('稳定掌握到 ' + r.starLevel + ' 星难度（' + E.LEVELS[r.starLevel - 1].name + '），' + howDone)
        : ('本次认识 ' + r.correctTotal + ' 个字，' + howDone);
    }

    /* ---- 豆豆的成长 ---- */
    var pun = E.pandaUnlocked(total), pnext = E.pandaNext(total), freshNames = [];
    E.PANDA_PARTS.forEach(function (p) { if (fresh.parts.indexOf(p.id) >= 0) freshNames.push(p.name); });
    var pandaText = freshNames.length
      ? ('这次新长出了 ' + freshNames.join('、') + '！豆豆现在一共有 ' + pun.length + ' 个零件。')
      : (pnext
        ? ('这次没有长出新零件。再认对 ' + (pnext.at - total) + ' 个字，豆豆就能长出「' + pnext.name + '」了。')
        : '豆豆的零件已经全部长齐啦，真厉害！');

    var cur = E.sceneCur(total), scNext = E.sceneNext(total);
    var freshScNames = [];
    E.SCENES.forEach(function (sc) { if (fresh.scenes.indexOf(sc.id) >= 0) freshScNames.push(sc.name); });
    var worldNote = freshScNames.length
      ? ('豆豆这次搬去了 ' + freshScNames.join('、') + '！')
      : (scNext
        ? ('豆豆现在住在 ' + cur.name + '，再认 ' + (scNext.at - total) + ' 个字就搬去「' + scNext.name + '」')
        : '豆豆把四个季节都住遍啦，真了不起！');

    /* ---- 条形图 ---- */
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
    var barsNote = isSent
      ? '句子模式统计的是"不同的字"：4/6 就是这一段出现了 6 个不同的字、认出来 4 个（同一个字重复出现只算一次）。题数把前面几轮也一起算进来了，所以可能比这一轮做的多。标「未测」的难度段这一轮没出到题，估算时不给它加分——所以上面的数字不会凭想象往上飘。'
      : '颜色越长表示这一段的字认识得越多；题数是"这一轮 + 前面几轮"合起来的（一场题少，靠多轮累积看趋势）。标「未测」的难度段这一轮没出到题，估算时不给它加分——所以上面的数字不会凭想象往上飘。';

    /* ---- 同龄参考 ---- */
    var refRows = E.AGE_REF.map(function (row) {
      var a = parseInt(row[0], 10);
      return { label: row[0], range: row[1], self: !isNaN(a) && a === profile.age };
    });

    this.setData({
      name: profile.name,
      r: r,
      starStars: starStars,
      levelText: levelText,
      topOut: topOut,
      noMiss: noMiss,
      estWord: (topOut || noMiss) ? '至少' : '约',
      accumText: accumText, roughText: roughText, noMissText: noMissText,
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
      certMeta: profile.age + ' 岁 · 收集到 ' + r.starLevel + ' 颗难度星 · ' + E.todayStr()
    });

    this.animNumber(r.est);
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

  copyResult: function () {
    var r = this.data.r, profile = app.profile();
    var isSent = r.mode === 'sentence';
    var lowB = !!(r.topOut || (r.misses === 0 && r.count > 0));   // 没答错过 = 下限口径
    var txt = profile.name + '（' + profile.age + '岁）识字量测试结果：' + (lowB ? '至少 ' : '约 ') + r.est + ' 字（合理区间 ' + r.lo + '~' + r.hi + '），'
      + '玩法：' + E.modeName(r.mode) + '，' + (isSent ? ('共读 ' + r.sentCount + ' 句、测到 ' + r.distinct + ' 个字') : ('共 ' + r.count + ' 题'))
      + (r.priorN > 0 ? ('（第 ' + r.rounds + ' 轮，把前面几轮攒的 ' + r.priorN + ' 题也一起算了）') : '')
      + '，通过 ' + r.starLevel + ' 星难度。'
      + (r.topOut ? '（全部答对，测到字表上限）' : (lowB ? '（一道都没答错，还没测到他的边界，这是下限）' : ''))
      + E.todayStr();
    var that = this;
    wx.setClipboardData({
      data: txt,
      success: function () { that.setData({ copied: true }); }
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
});
