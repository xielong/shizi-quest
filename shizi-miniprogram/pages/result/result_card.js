/* =========================================================================
   result_card.js —— 成绩卡绘制（Canvas 2D）
   从 result.js 混入（require 后 Object.assign 到 Page 对象上）
   画一张 600×800 的分享图：名字 + 会多少字（大数字）+ 星级 + 豆豆 + 日期
   ========================================================================= */
'use strict';

var E = require('../../utils/engine.js');
var P = require('../../utils/panda.js');
var store = require('../../utils/store.js');

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImg(canvas, src) {
  return new Promise(function (resolve) {
    var img = canvas.createImage();
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

/* 画布 → 临时图片文件 */
function toFile(canvas, that) {
  return new Promise(function (resolve) {
    wx.canvasToTempFilePath({
      canvas: canvas,
      success: function (t) { resolve(t.tempFilePath); },
      fail: function () { resolve(null); }
    }, that);
  });
}

module.exports = {
  /* 生成成绩卡：画布 → 图片 → 菜单（保存/发送） */
  makeCard: function () {
    var r = this.data.r;
    if (!r) {
      wx.showToast({ title: '还没有成绩哦', icon: 'none' });
      return;
    }
    var that = this;
    this.prepareShareImage().then(function () {
      if (!that._cardImg) {
        wx.showToast({ title: '生成失败，再试一次', icon: 'none' });
        return;
      }
      wx.showShareImageMenu({
        path: that._cardImg,
        /* 低版本基础库没有分享图片菜单：直接存相册 */
        fail: function () { that.saveCardToAlbum(that._cardImg); }
      });
    });
  },

  /* 存相册（失败时提示去开权限） */
  saveCardToAlbum: function (file) {
    wx.saveImageToPhotosAlbum({
      filePath: file,
      success: function () { wx.showToast({ title: '已保存到相册', icon: 'success' }); },
      fail: function (err) {
        if (err && err.errMsg && err.errMsg.indexOf('auth') >= 0) {
          wx.showModal({
            title: '需要相册权限',
            content: '打开「保存到相册」的权限，就能把成绩卡存下来啦。',
            confirmText: '去设置',
            success: function (m) { if (m.confirm) wx.openSetting(); }
          });
        }
      }
    });
  },

  /* 静默预生成两张分享图：_cardImg 600×800（保存/发给好友）、_squareImg 800×800（朋友圈）
     分享是同步返回的，图必须先备好，否则只能退化成系统截图 */
  prepareShareImage: function () {
    var that = this;
    if (!this.data.r) return Promise.resolve(null);
    if (this._cardImg && this._squareImg) return Promise.resolve(this._squareImg);
    if (this._preparing) return this._preparing;

    this._preparing = new Promise(function (resolve) {
      wx.createSelectorQuery().in(that)
        .select('#shareCanvas').fields({ node: true, size: true })
        .exec(function (res) {
          if (!res || !res[0] || !res[0].node) { that._preparing = null; resolve(null); return; }
          var canvas = res[0].node;
          var dpr = (wx.getSystemInfoSync().pixelRatio || 2);
          var W = 600, H = 800;

          /* 先画竖版成绩卡 */
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          var ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);

          that.paintCard(ctx, canvas, W, H)
            .then(function () { return toFile(canvas, that); })
            .then(function (f1) {
              that._cardImg = f1 || null;
              /* 同一块画布换个尺寸再画方版（改 width 会重置变换矩阵） */
              var S = 800;
              canvas.width = S * dpr;
              canvas.height = S * dpr;
              var c2 = canvas.getContext('2d');
              c2.scale(dpr, dpr);
              return that.paintSquare(c2, canvas, S).then(function () { return toFile(canvas, that); });
            })
            .then(function (f2) {
              that._squareImg = f2 || null;
              that._preparing = null;
              resolve(that._squareImg);
            })
            .catch(function () {
              that._preparing = null;
              resolve(null);
            });
        });
    });
    return this._preparing;
  },

  paintCard: function (ctx, canvas, W, H) {
    var r = this.data.r, that = this;
    var profile = getApp().profile();

    /* 背景：浅蓝渐变 + 圆角 */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eaf4ff');
    g.addColorStop(1, '#f7fbff');
    ctx.fillStyle = g;
    rr(ctx, 0, 0, W, H, 0);
    ctx.fillRect(0, 0, W, H);

    /* 顶部标题带 */
    ctx.fillStyle = '#3ea6ff';
    rr(ctx, 0, 0, W, 200, 0);
    ctx.fillRect(0, 0, W, 200);
    /* 一个个圆泡泡装饰 */
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.arc(90, 50, 34, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(520, 130, 46, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(560, 40, 22, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('识字冒险记', W / 2, 86);
    ctx.font = '24px sans-serif';
    ctx.fillText(profile.name + '（' + profile.age + ' 岁）已经认识', W / 2, 140);

    /* 大数字 */
    ctx.font = 'bold 130px sans-serif';
    ctx.fillStyle = '#2b8fe0';
    ctx.fillText(String(r.knownTotal || 0), W / 2, 335);
    ctx.fillStyle = '#2b3a55';
    ctx.font = '30px sans-serif';
    ctx.fillText('个字', W / 2 + 145, 320);

    /* 星级 */
    var starTxt = '';
    for (var i = 1; i <= E.LEVELS.length; i++) starTxt += i <= r.starLevel ? '★' : '☆';
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#e8a900';
    ctx.fillText(starTxt, W / 2, 395);
    ctx.fillStyle = '#71809e';
    ctx.font = '24px sans-serif';
    ctx.fillText((r.starLevel > 0 ? '已点亮 ' + r.starLevel + ' 星' : '继续加油！') + ' · ' + E.modeName(r.mode) + ' · 第 ' + r.rounds + ' 轮', W / 2, 438);

    /* 中间白色面板 + 豆豆 */
    ctx.fillStyle = '#ffffff';
    rr(ctx, 60, 470, W - 120, 230, 24);
    ctx.fill();
    ctx.strokeStyle = '#e6ecf8';
    ctx.lineWidth = 2;
    rr(ctx, 60, 470, W - 120, 230, 24);
    ctx.stroke();

    var layers = P.layers(store.pandaTotal(), 'front');
    var imgs = layers.map(function (l) { return loadImg(canvas, l.src); });
    return Promise.all(imgs).then(function (loaded) {
      var px = W / 2 - 90, py = 480, pw = 180, ph = 210;   /* 豆豆画在面板里 */
      loaded.forEach(function (img) { if (img) ctx.drawImage(img, px, py, pw, ph); });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#71809e';
      ctx.font = '22px sans-serif';
      ctx.fillText('豆豆陪着一起长大 🌱', W / 2, 676);

      /* 底部 */
      ctx.fillStyle = '#a0aec6';
      ctx.font = '22px sans-serif';
      ctx.fillText('每天认识几个字，和豆豆一起长大 · ' + E.todayStr(), W / 2, 745);
      ctx.fillStyle = '#c3cfdf';
      ctx.fillText('识字冒险记 · 微信小程序', W / 2, 780);
    });
  },

  /* 方版分享图 800×800：专门给朋友圈（朋友圈卡片是方的） */
  paintSquare: function (ctx, canvas, S) {
    var r = this.data.r;
    var profile = getApp().profile();
    var cx = S / 2;

    /* 背景 */
    var g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#eaf4ff');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    /* 顶部标题带 + 泡泡装饰 */
    ctx.fillStyle = '#3ea6ff';
    ctx.fillRect(0, 0, S, 240);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.arc(112, 62, 40, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(700, 172, 56, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(624, 52, 26, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('识字冒险记', cx, 112);
    ctx.font = '30px sans-serif';
    ctx.fillText(profile.name + '（' + profile.age + ' 岁）已经认识', cx, 178);

    /* 大数字 */
    ctx.font = 'bold 190px sans-serif';
    ctx.fillStyle = '#2b8fe0';
    ctx.fillText(String(r.knownTotal || 0), cx, 400);
    ctx.fillStyle = '#2b3a55';
    ctx.font = '40px sans-serif';
    ctx.fillText('个字', cx + 205, 382);

    /* 星级 */
    var starTxt = '';
    for (var i = 1; i <= E.LEVELS.length; i++) starTxt += i <= r.starLevel ? '★' : '☆';
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#e8a900';
    ctx.fillText(starTxt, cx, 470);

    /* 豆豆 */
    var layers = P.layers(store.pandaTotal(), 'front');
    var imgs = layers.map(function (l) { return loadImg(canvas, l.src); });
    return Promise.all(imgs).then(function (loaded) {
      var pw = 260, ph = 300, px = cx - pw / 2, py = 512;
      loaded.forEach(function (img) { if (img) ctx.drawImage(img, px, py, pw, ph); });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#71809e';
      ctx.font = '26px sans-serif';
      ctx.fillText('豆豆陪着一起长大 · 每天认识几个字', cx, 748);
      ctx.fillStyle = '#a8b6cc';
      ctx.font = '24px sans-serif';
      ctx.fillText(E.todayStr(), cx, 782);
    });
  }
};
