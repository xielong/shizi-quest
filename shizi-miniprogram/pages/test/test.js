/* =========================================================================
   测试页：三种玩法的出题与判分
   逻辑引擎都在 utils/engine.js（与网页版同一套），这里只负责把状态画到界面上
   ========================================================================= */
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');
var P = require('../../utils/panda.js');
var app = getApp();

Page({
  data: {
    stars: 0, qText: '', prog: 0, progText: '', lvChip: '',
    prompt: '', q: null, qKey: 0,
    fbCls: '', fbText: '',
    marksN: 0, doneText: '都会，下一句 ✓',
    miniHint: '', mini: [],
    toast: null,
    testSnow: []
  },

  onLoad: function () {
    var s = app.globalData.session;
    if (!s) { wx.redirectTo({ url: '/pages/index/index' }); return; }
    this.s = s;
    this.locked = false;
    this._facing = 'front';
    s.pandaShown = E.pandaUnlocked(store.pandaTotal()).length;

    var isSent = s.mode === 'sentence';
    this.setData({
      miniHint: isSent
        ? '小朋友念完这句话，把他没念出来的字点一下（会变红），都会就直接点右边。'
        : (s.mode === 'read'
          ? '家长提示：小朋友读对了点左边，读不出来点右边，不要提示哦'
          : '家长念字，小朋友点出对应的字；点错也没关系，会自动跳下一题')
    });
    this.refreshMini(true);
    this.step();
  },

  /* ---------- 出题 ---------- */
  step: function () {
    var s = this.s;
    if (!s) return;
    var q = E.nextQuestion(s);
    if (!q) { this.wrapUp(); return; }
    this.locked = false;
    this._qKey = (this._qKey || 0) + 1;

    var patch = { qKey: this._qKey, prog: Math.round(E.levelProgress(s) * 1000) / 10 };

    if (s.mode === 'sentence') {
      patch.lvChip = '第 ' + (s.sentCount + 1) + ' / ' + (s.sentCap || E.SENT_MAX) + ' 句';
      patch.progText = '读句子：看看这句话认识几个字';
      patch.qText = '测到 ' + s.count + ' 个字';
      patch.prompt = '请小朋友把这句话读出来';
      patch.doneText = '都会，下一句 ✓';
      patch.marksN = 0;
      patch.q = { type: 'sentence', level: q.level, cells: this.buildCells(q.sen.t, {}) };
    } else {
      var lv = E.LEVELS[q.level - 1];
      /* 升温提示：热身结束后的第一题如果直接从高关开始，说明是接着上一轮的分界测的 */
      var stairFirst = (s.phase === 'stair' && !s._stairSeen);
      if (stairFirst) s._stairSeen = 1;
      var tip = '';
      if (stairFirst && q.level >= 3) tip = '接着上次，从第 ' + q.level + ' 关开始';
      else if (!stairFirst && s.shownLevel && q.level > s.shownLevel) tip = '升到第 ' + q.level + ' 关啦！';
      if (tip) {
        patch.fbCls = 'info';
        patch.fbText = tip;
        var that = this;
        setTimeout(function () {
          if (that.data.fbText === tip) that.setData({ fbText: '' });
        }, 900);
      }
      s.shownLevel = q.level;
      patch.lvChip = '第 ' + q.level + ' 关';
      patch.progText = s.phase === 'warmup' ? '热身中，先认识几个老朋友'
        : (s.phase === 'topup' ? ('回头复核：再把第 ' + q.level + ' 关确认几题')
                               : ('正在挑战：' + lv.name));
      patch.qText = '已做 ' + s.count + ' 题 · 最多 ' + (s.cap || E.MAX_Q) + ' 题';
      if (s.mode === 'read') {
        patch.prompt = '请小朋友把这个字读出来';
        patch.q = { type: 'read', ch: q.ch, level: q.level };
      } else {
        patch.prompt = '听一听，点出正确的那个字';
        patch.q = {
          type: 'listen', level: q.level, answer: q.answer, ch: q.ch,
          options: q.options.map(function (c) { return { ch: c, cls: '' }; })
        };
      }
    }
    this.setData(patch);
  },

  buildCells: function (t, marks) {
    var cells = [], NOT = E.NOT_SCORED;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      cells.push({ idx: i, ch: ch, punc: NOT[ch] ? 1 : 0, unk: marks[ch] ? 1 : 0 });
    }
    return cells;
  },

  /* ---------- 读一读：家长判分 ---------- */
  judgeYes: function () { this.handleAnswer(true, null); },
  judgeNo: function () { this.handleAnswer(false, null); },

  /* ---------- 找一找：点选项 ---------- */
  onOption: function (e) {
    if (this.locked) return;
    var chosen = e.currentTarget.dataset.ch;
    this.handleAnswer(chosen === this.s.q.answer, chosen);
  },

  handleAnswer: function (ok, chosen) {
    if (this.locked || !this.s || !this.s.q) return;
    this.locked = true;
    var s = this.s;

    /* 选项上色：对的亮绿，点错的亮红 */
    if (this.data.q && this.data.q.options) {
      var answer = s.q.answer;
      this.setData({
        'q.options': this.data.q.options.map(function (o) {
          var cls = '';
          if (o.ch === answer) cls = 'right';
          else if (o.ch === chosen && !ok) cls = 'wrong';
          return { ch: o.ch, cls: cls };
        })
      });
    }

    E.answerQuestion(s, ok);
    var patch = { qText: '已做 ' + s.count + ' 题', stars: s.stars };
    if (ok) {
      patch.fbCls = 'ok';
      patch.fbText = E.CHEER[Math.floor(Math.random() * E.CHEER.length)];
      s.earned = (s.earned || 0) + 1;
      this.refreshMini();
    } else {
      patch.fbCls = 'no';
      patch.fbText = E.SOFT[Math.floor(Math.random() * E.SOFT.length)];
    }
    this.setData(patch);

    var that = this;
    setTimeout(function () {
      that.setData({ fbText: '' });
      if (that.s) that.step();
    }, ok ? 820 : 1250);
  },

  /* ---------- 读句子：点字标记 ---------- */
  toggleMark: function (e) {
    var s = this.s;
    if (!s || s.mode !== 'sentence' || this.locked) return;
    var idx = e.currentTarget.dataset.idx;
    var cell = this.data.q.cells[idx];
    var ch = cell.ch;
    if (s.marks[ch]) delete s.marks[ch];
    else s.marks[ch] = 1;
    var n = 0, k;
    for (k in s.marks) n++;
    this.setData({
      ['q.cells[' + idx + '].unk']: s.marks[ch] ? 1 : 0,
      marksN: n,
      doneText: n > 0 ? ('有 ' + n + ' 个字不认识，下一句 →') : '都会，下一句 ✓'
    });
  },

  resetMarks: function () {
    var s = this.s;
    if (!s || s.mode !== 'sentence') return;
    s.marks = {};
    this.setData({
      'q.cells': this.data.q.cells.map(function (c) {
        return { idx: c.idx, ch: c.ch, punc: c.punc, unk: 0 };
      }),
      marksN: 0, doneText: '都会，下一句 ✓'
    });
  },

  commitSentence: function () {
    if (this.locked || !this.s) return;
    this.locked = true;
    var s = this.s;
    var info = E.submitSentence(s, s.marks);
    var patch = { qText: '测到 ' + s.count + ' 个字', stars: s.stars };

    /* 这一句认出来的字，也算进豆豆的成长 */
    if (info && info.known > 0) {
      s.earned = (s.earned || 0) + info.known;
      this.refreshMini();
    }
    var marked = info ? info.marked : 0;
    patch.fbCls = 'ok';
    patch.fbText = marked === 0
      ? E.CHEER[Math.floor(Math.random() * E.CHEER.length)]
      : '记下来啦，继续加油';
    this.setData(patch);

    var that = this;
    setTimeout(function () {
      that.setData({ fbText: '' });
      if (that.s) that.step();
    }, marked === 0 ? 760 : 620);
  },

  /* ---------- 豆豆实时成长 ---------- */
  refreshMini: function (quiet) {
    var s = this.s;
    if (!s) return;
    var live = store.pandaTotal() + (s.earned || 0);
    var patch = { mini: P.layers(live, this._facing) };
    /* 跨进冬天：测试页当场下雪 */
    if (E.sceneCur(live).id === 'winter' && !this.data.testSnow.length) {
      patch.testSnow = P.snowflakes(24);
    }
    this.setData(patch);

    var un = E.pandaUnlocked(live), shown = s.pandaShown || 0;
    if (un.length > shown) {
      s.pandaShown = un.length;
      if (!quiet) {
        var lastId = un[un.length - 1], part = null;
        E.PANDA_PARTS.forEach(function (p) { if (p.id === lastId) part = p; });
        if (part) this.showToast(part);
      }
    }
  },

  showToast: function (part) {
    var that = this;
    this.setData({ toast: { emoji: part.emoji, tip: part.tip } });
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () { that.setData({ toast: null }); }, 2200);
  },

  turnMini: function () {
    if (!this.s) return;
    this._facing = this._facing === 'back' ? 'front' : 'back';
    this.setData({ mini: P.layers(store.pandaTotal() + (this.s.earned || 0), this._facing) });
  },

  /* ---------- 这一轮的额度用完了 ----------
     样本够（累计测满 MIN_TESTED 个字）就正常结算；
     不够就直说"还需要再多答几道题"，家长同意就接着这轮继续出题
     （不重开一轮：先验不动，做完一起结算；也最多接三次，别把孩子困住） */
  wrapUp: function () {
    var s = this.s, that = this;
    if (!s) return;
    var r = E.computeResult(s);
    this._askMore = this._askMore || 0;
    if (r.enough || this._askMore >= 3) { this.finish(); return; }
    this._askMore++;
    /* 就差临门一脚（1~2 个字）：别为这点事弹窗打扰家长，直接接着出题 */
    if (r.needN <= 2) { E.extendSession(s, r.needN); this.step(); return; }
    wx.showModal({
      title: '还差 ' + r.needN + ' 个字才给分数',
      content: '已经测了 ' + r.testedN + ' 个字，至少要 ' + r.minTested + ' 个才算数——'
             + '题太少的话，算出来的数字没有意义。再答几道就够了，继续吗？',
      confirmText: '继续答',
      cancelText: '先到这儿',
      success: function (res) {
        if (res.confirm && that.s) {
          E.extendSession(that.s, r.needN);
          that.step();
        } else {
          that.finish();
        }
      }
    });
  },

  /* ---------- 结算 ---------- */
  finish: function () {
    var s = this.s;
    if (!s) return;
    var r = E.computeResult(s);

    /* 「至少」棘轮：全对的轮次证明过"至少 N"，把这个下限存起来；
       之后任何一轮显示的数字都不低于它（跨轮折价会让估算小幅波动，
       但已证明的下限不该往回缩，家长看着数字变少会不信任） */
    var floor = (s.prior && s.prior.lbFloor) || 0;
    if (r.enough && r.allOk && r.est > floor) floor = r.est;
    if (r.enough && floor > r.est) {
      r.est = floor;
      if (r.hi < floor) r.hi = floor;
      r.floored = true;
    }

    /* 一轮结束：把这一轮的证据折价存起来，下一轮开测时带进去
       （一场题少，精度靠跨轮累积补；累计测过多少字也记在里面，用来判样本够不够） */
    store.setPrior(s.mode, E.priorNext(s, floor));

    /* 这次认对的字记到豆豆账上（一场题少，每个字按 EARN_RATE 点算，长大节奏跟以前持平）
       注意：样本不够、不出分数的时候，豆豆照样长大——孩子认真答了就该有奖励 */
    var pe = E.pandaEarn(store.pandaTotal(), (s.earned || 0) * E.EARN_RATE);
    store.pandaSetTotal(pe.after);
    s.earned = 0;

    /* 搬家检查 */
    var freshScenes = [];
    var unlocked = E.sceneUnlocked(pe.after).length;
    var seen = store.sceneSeen();
    if (unlocked > seen) {
      freshScenes = E.SCENES.slice(seen, unlocked);
      store.sceneSetSeen(unlocked);
    }

    /* 历史记录（字段与网页版一致）。样本不够、不出分数的那次不入记录，
       免得成长记录里出现一条没有分数的数据 */
    if (r.enough) {
      store.pushRecord({
        date: E.todayStr(), ts: Date.now(), name: s.name, age: s.age, mode: s.mode,
        est: r.est, lo: r.lo, hi: r.hi, stars: r.starLevel,
        count: r.count, correct: r.correctTotal, sent: r.sentCount || 0
      });
    }

    app.globalData.lastResult = r;
    app.globalData.lastFresh = {
      parts: pe.fresh,
      scenes: freshScenes.map(function (x) { return x.id; })
    };
    app.globalData.session = null;
    this.s = null;
    wx.redirectTo({ url: '/pages/result/result' });
  },

  quit: function () {
    var s = this.s, that = this;
    if (!s || s.count === 0) {
      app.globalData.session = null;
      this.s = null;
      wx.navigateBack();
      return;
    }
    /* 测得太少就不给分数，所以这时候别问"要不要出结果"，
       直接告诉家长"还要再多答几道"（不拦着他退出，只是说明清楚） */
    var tested = E.testedTotal(s), enough = tested >= E.MIN_TESTED;
    wx.showModal({
      title: enough ? '退出测试' : '还要再多答几道题',
      content: enough
        ? ('已经测的 ' + s.count + ' 个字会算出结果，确定退出吗？')
        : ('一共才测了 ' + tested + ' 个字，至少测满 ' + E.MIN_TESTED + ' 个才给分数，'
           + '还差 ' + (E.MIN_TESTED - tested) + ' 个。现在退出不会有分数，要不要再答几道？'),
      confirmText: enough ? '出结果' : '还是要退出',
      cancelText: enough ? '继续测' : '再答几道',
      success: function (res) { if (res.confirm) that.finish(); }
    });
  },

  onUnload: function () {
    /* 非正常退出（比如手势返回）：session 作废，避免下次进来挂着旧题 */
    if (this.s) { app.globalData.session = null; this.s = null; }
  }
});
