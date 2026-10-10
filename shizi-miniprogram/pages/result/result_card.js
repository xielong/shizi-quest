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

module.exports = {
  /* 生成成绩卡：画布 → 图片 → 菜单（保存/发送） */
  makeCard: function () {
    var r = this.data.r;
    if (!r || !r.enough) {
      wx.showToast({ title: '测够字数才能生成哦', icon: 'none' });
      return;
    }
    var that = this;
    wx.createSelectorQuery().in(this)
      .select('#shareCanvas').fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return;
        var canvas = res[0].node;
        var dpr = (wx.getSystemInfoSync().pixelRatio || 2);
        var W = 600, H = 800;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        that.paintCard(ctx, canvas, W, H).then(function () {
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: function (tmp) {
              wx.showShareImageMenu({
                path: tmp.tempFilePath,
                fail: function () {
                  /* 低版本基础库没有分享图片菜单：直接存相册 */
                  wx.saveImageToPhotosAlbum({
                    filePath: tmp.tempFilePath,
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
                }
              });
            },
            fail: function () { wx.showToast({ title: '生成失败，再试一次', icon: 'none' }); }
          }, that);
        });
      });
  },

  paintCard: function (ctx, canvas, W, H) {
    var r = this.data.r, that = this;
    var profile = getApp().profile();
    var isLow = !!(r.topOut || r.allOk || r.floored || (r.misses === 0 && r.count > 0));
    var word = isLow ? '至少' : '约';

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
    ctx.fillText('识字大冒险', W / 2, 86);
    ctx.font = '24px sans-serif';
    ctx.fillText(profile.name + '（' + profile.age + ' 岁）的识字量', W / 2, 140);

    /* 大数字 */
    ctx.fillStyle = '#2b3a55';
    ctx.font = '30px sans-serif';
    ctx.fillText(word, W / 2 - 118, 320);
    ctx.font = 'bold 130px sans-serif';
    ctx.fillStyle = '#2b8fe0';
    ctx.fillText(String(r.est), W / 2, 335);
    ctx.fillStyle = '#2b3a55';
    ctx.font = '30px sans-serif';
    ctx.fillText('字', W / 2 + 130, 320);

    /* 星级 */
    var starTxt = '';
    for (var i = 1; i <= 10; i++) starTxt += i <= r.starLevel ? '★' : '☆';
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#e8a900';
    ctx.fillText(starTxt, W / 2, 395);
    ctx.fillStyle = '#71809e';
    ctx.font = '24px sans-serif';
    ctx.fillText('通过 ' + r.starLevel + ' 星难度 · ' + E.modeName(r.mode) + ' · 第 ' + r.rounds + ' 轮', W / 2, 438);

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
      ctx.fillText('多玩几轮，数字会更准 · ' + E.todayStr(), W / 2, 745);
      ctx.fillStyle = '#c3cfdf';
      ctx.fillText('识字大冒险 · 微信小程序', W / 2, 780);
    });
  }
};
