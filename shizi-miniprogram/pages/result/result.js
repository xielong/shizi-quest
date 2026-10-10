/* =========================================================================
   结果页：识字量 + 豆豆的成长 + 各段表现 + 参考坐标 + 奖状
   ========================================================================= */
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');
var P = require('../../utils/panda.js');
var app = getApp();

Page({
  data: {
    name: '', shownEst: 0, heroTitle: '',
    r: null, starStars: [], levelText: '',
    topOut: false, noMiss: false, estWord: '约',
    enough: true, shortText: '',
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
    /* 没摸到分界就收工的（全对，或只错了两三题但没有哪段认识率掉到一半以下）：
       数字都是下限口径（r.allOk 由 engine 判定），黄框文案按有没有答错过区分 */
    var noMiss = ((r.misses === 0 || r.allOk) && r.count > 0 && !topOut);
    /* 棘轮生效：这轮估出的数比历史「至少」下限还低，显示历史下限（见 test.js finish） */
    var floored = !!r.floored;
    /* 样本够不够：累计测满 MIN_TESTED 个字才出分数。
       不够的时候整页都不显示数字 —— 只答了几道题，算出来的"识字量"没有意义，
       家长要看到的是"还需要再多答几道"。 */
    var enough = !!r.enough;

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
    /* 没答错过（或只错了两三题、分界没露出来）→ 数字是下限，得说清楚 */
    var noMissText = noMiss
      ? ((r.misses === 0
        ? ('他这轮 ' + r.count + ' 题一道都没答错，')
        : ('他这轮 ' + r.count + ' 题里只错了 ' + r.misses + ' 题，而且没有哪一段的字认到一半以下，'))
         + '说明还没摸到"他认不出的那条线"，'
         + '所以上面这个数字是保守下限（至少这么多），不是精确值——'
         + '每一段都按"证据能证明的下限"折算，宁可少报；'
         + '而且测的字还少，数字上限也压着（测满 100 个字才能报到 5000）。'
         + '用同一种玩法再玩一两轮，证据累加进来、上限放开，数字自己会往上走。')
      : '';
    var levelText;
    if (!enough) {
      levelText = '这次一共测了 ' + r.testedN + ' 个字（' + howDone + '），题目太少了。'
        + '至少测满 ' + r.minTested + ' 个字才出分数——题太少的话，算出来的数字没有意义，所以先不显示。';
    } else if (topOut) {
      levelText = '全部答对！一路闯到最高难度（' + E.LEVELS[E.LEVELS.length - 1].name + '），' + howDone;
    } else if (noMiss) {
      levelText = '这轮一道都没答错，还没碰到他认不出的字，' + howDone;
    } else {
      levelText = r.starLevel > 0
        ? ('稳定掌握到 ' + r.starLevel + ' 星难度（' + E.LEVELS[r.starLevel - 1].name + '），' + howDone)
        : ('本次认识 ' + r.correctTotal + ' 个字，' + howDone);
    }
    /* 样本不够时给家长下一步：说清楚"还差几个字、怎么补"，并安抚一句豆豆照长 */
    var shortText = enough ? '' 
      : ('同一套玩法再答一轮就行：前面测过的字会累加进来，攒够 ' + r.minTested + ' 个字马上出分数。'
         + '豆豆的成长值已经记上了，这几道题没白答。');

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
    if (r.allOk) {
      barsNote += ' 这轮一道没错：每段按小样本的置信下限折算（宁可少报），'
        + '所以长条不到 100% 是正常的——画出来的是"证据确凿"的部分。';
    }

    /* ---- 同龄参考 ---- */
    var refRows = E.AGE_REF.map(function (row) {
      var a = parseInt(row[0], 10);
      return { label: row[0], range: row[1], self: !isNaN(a) && a === profile.age };
    });

    this.setData({
      name: profile.name,
      r: r,
      heroTitle: enough
        ? (profile.name + ' 的识字量' + ((topOut || noMiss || floored) ? '至少' : '约'))
        : ('还差 ' + r.needN + ' 个字就能出分数'),
      starStars: starStars,
      levelText: levelText,
      topOut: topOut,
      noMiss: noMiss,
      enough: enough,
      shortText: shortText,
      estWord: (topOut || noMiss || floored) ? '至少' : '约',
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

    if (enough) this.animNumber(r.est);
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
    var lowB = !!(r.topOut || r.floored || r.allOk || (r.misses === 0 && r.count > 0));   // 没摸到分界/棘轮保底 = 下限口径
    var howMany = isSent
      ? ('共读 ' + r.sentCount + ' 句、测到 ' + r.distinct + ' 个字')
      : ('共 ' + r.count + ' 题');
    var txt;
    if (!r.enough) {
      /* 样本不够：不报数字，只说"还需要再多答几道题" */
      txt = profile.name + '（' + profile.age + '岁）识字小测：这次一共测了 ' + r.testedN + ' 个字，'
        + '题目太少（至少 ' + r.minTested + ' 个才出分数），先不给成绩，还要再多答 ' + r.needN + ' 个。'
        + '玩法：' + E.modeName(r.mode) + '，' + howMany + '。' + E.todayStr();
    } else {
      txt = profile.name + '（' + profile.age + '岁）识字量测试结果：' + (lowB ? '至少 ' : '约 ') + r.est + ' 字（合理区间 ' + r.lo + '~' + r.hi + '），'
        + '玩法：' + E.modeName(r.mode) + '，' + howMany
        + (r.priorN > 0 ? ('（第 ' + r.rounds + ' 轮，把前面几轮攒的 ' + r.priorN + ' 题也一起算了）') : '')
        + '，通过 ' + r.starLevel + ' 星难度。'
        + (r.topOut ? '（全部答对，测到字表上限）' : (lowB ? '（一道都没答错，还没测到他的边界，这是下限）' : ''))
        + E.todayStr();
    }
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
