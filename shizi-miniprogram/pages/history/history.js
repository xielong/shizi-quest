/* =========================================================================
   成长记录：canvas 2d 画成长曲线 + 历次记录列表
   ========================================================================= */
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');

Page({
  data: {
    hist: [],
    rows: [],
    hasChart: false,
    curName: ''
  },

  onShow: function () {
    var hist = store.loadHistory();
    var rows = hist.slice().reverse().map(function (h) {
      return {
        ts: h.ts, date: h.date,
        who: h.name + ' · ' + h.age + '岁 · ' + E.modeName(h.mode),
        est: h.est, stars: h.stars
      };
    });
    this.setData({
      hist: hist, rows: rows, hasChart: hist.length >= 2,
      curName: store.curPlayer().name
    });
    if (hist.length >= 2) this.drawChart(hist);
  },

  drawChart: function (hist) {
    var that = this;
    wx.createSelectorQuery().in(this)
      .select('#chart').fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return;
        var canvas = res[0].node;
        var ctx = canvas.getContext('2d');
        var dpr = wx.getSystemInfoSync().pixelRatio || 2;
        var W = res[0].width, H = res[0].height;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);
        that.paint(ctx, W, H, hist);
      });
  },

  paint: function (ctx, W, H, hist) {
    var data = hist.slice(-12);
    var vals = data.map(function (d) { return d.est; });
    var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
    if (mx === mn) mx = mn + 100;
    var span = mx - mn;
    var pad = { l: 66, r: 22, t: 26, b: 44 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var X = function (i) { return pad.l + (data.length === 1 ? iw / 2 : i * iw / (data.length - 1)); };
    var Y = function (v) { return pad.t + ih - (v - mn) / span * ih; };

    ctx.clearRect(0, 0, W, H);

    /* 网格与刻度 */
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#a5b1c9';
    ctx.strokeStyle = '#eef2fa';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 2; g++) {
      var v = mn + span * g / 2;
      var y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(v)), pad.l - 10, y + 7);
    }

    /* 折线下方的淡色填充 */
    ctx.beginPath();
    ctx.moveTo(X(0), Y(vals[0]));
    for (var i = 1; i < vals.length; i++) ctx.lineTo(X(i), Y(vals[i]));
    ctx.lineTo(X(vals.length - 1), pad.t + ih);
    ctx.lineTo(X(0), pad.t + ih);
    ctx.closePath();
    ctx.fillStyle = 'rgba(92,184,255,.12)';
    ctx.fill();

    /* 折线 */
    ctx.beginPath();
    ctx.moveTo(X(0), Y(vals[0]));
    for (var j = 1; j < vals.length; j++) ctx.lineTo(X(j), Y(vals[j]));
    ctx.strokeStyle = '#3ea6ff';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    /* 数据点 */
    for (var k = 0; k < vals.length; k++) {
      ctx.beginPath();
      ctx.arc(X(k), Y(vals[k]), 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#3ea6ff';
      ctx.stroke();
    }

    /* 首尾日期 */
    ctx.fillStyle = '#a5b1c9';
    ctx.textAlign = 'left';
    ctx.fillText(data[0].date.slice(5), pad.l - 20, H - 14);
    ctx.textAlign = 'right';
    ctx.fillText(data[data.length - 1].date.slice(5), W - pad.r + 12, H - 14);
  },

  clearHist: function () {
    var that = this;
    wx.showModal({
      title: '清空成长记录',
      content: '所有历次测试记录都会被删掉（豆豆的零件和小房子不受影响），确定吗？',
      confirmText: '清空', cancelText: '再想想',
      confirmColor: '#ff8a5e',
      success: function (res) {
        if (!res.confirm) return;
        store.saveHistory([]);
        that.setData({ hist: [], rows: [], hasChart: false });
      }
    });
  }
});
