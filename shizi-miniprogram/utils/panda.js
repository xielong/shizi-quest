/* =========================================================================
   panda.js —— 熊猫图层 / 四季场景的装配
   网页版是运行时刻拼 SVG；小程序里改成「预渲染好的透明 PNG 分层绝对定位叠加」，
   所以这里只负责：算哪些层该显示、每层图片路径、层次顺序、雪花粒子参数
   ========================================================================= */
'use strict';

var E = require('./engine.js');

/* 图层顺序照抄网页版的绘制顺序（先画的在下层）；head 是脸，插在围巾前 */
var ORDER_FRONT = ['tail', 'bag', 'legL', 'legR', 'body', 'armL', 'armR', 'shirt', 'coat',
  'boots', 'mitten', 'head', 'scarf', 'knitHat', 'hat', 'earmuff', 'glasses', 'crown'];
var ORDER_BACK = ['legL', 'legR', 'body', 'armL', 'armR', 'shirt', 'coat', 'tail', 'bag',
  'mitten', 'boots', 'head', 'scarf', 'knitHat', 'hat', 'earmuff', 'crown'];

var SRC = {};
(function () {
  ORDER_FRONT.forEach(function (id) { SRC['front:' + id] = '/images/panda/front/' + id + '.png'; });
  ORDER_BACK.forEach(function (id) { SRC['back:' + id] = '/images/panda/back/' + id + '.png'; });
})();

/* 哪些零件是"一直都在"的（不需要解锁）——网页版里只有头，头是底色层不用图片 */
var ALWAYS = {};

/**
 * 算出某进度下，熊猫该显示哪些图层
 * @param {number} total 累计认对字数
 * @param {string} facing 'front' | 'back'
 * @param {boolean} happy 是否是开心表情（答对时用）
 * @returns {Array} [{id, src}] 按从下到上的顺序
 */
function layers(total, facing, happy) {
  facing = (facing === 'back') ? 'back' : 'front';
  var on = {};
  E.pandaUnlocked(total || 0).forEach(function (id) { on[id] = 1; });
  /* 戴上毛线帽就不戴小帽子了（跟网页版同一条规则，不然头上太挤） */
  if (on.knitHat) on.hat = 0;
  on.head = 1;   /* 头一直都在，不算零件 */

  var order = (facing === 'back') ? ORDER_BACK : ORDER_FRONT;
  var out = [];
  order.forEach(function (id) {
    if (!on[id]) return;
    var src;
    if (id === 'head') {
      src = (facing === 'front' && happy) ? '/images/panda/front/head-happy.png'
                                          : '/images/panda/' + facing + '/head.png';
    } else {
      src = SRC[facing + ':' + id];
    }
    out.push({ id: id, src: src });
  });
  return out;
}

/* 当前该用哪张场景图 */
function sceneImage(total) {
  return '/images/scene/' + E.sceneCur(total || 0).id + '.png';
}

/* 雪花粒子：每片的横向位置、大小、周期、起始相位都随机，飘起来才自然 */
function snowflakes(n, wide) {
  var out = [];
  for (var i = 0; i < n; i++) {
    var size = (wide ? 8 : 9) + Math.random() * (wide ? 13 : 12);   // rpx
    var dur = 7 + Math.random() * 7;                                 // 秒
    var delay = -(Math.random() * dur);                              // 负延迟：截图时也已经在下
    out.push({
      k: i,
      left: (Math.random() * 100).toFixed(2),
      size: size.toFixed(1),
      dur: dur.toFixed(1),
      delay: delay.toFixed(1),
      op: (0.5 + Math.random() * 0.45).toFixed(2)
    });
  }
  return out;
}

/* 零件进度墙的数据 */
function partWall(total) {
  var un = E.pandaUnlocked(total || 0);
  return E.PANDA_PARTS.map(function (p) {
    return { id: p.id, name: p.name, emoji: p.emoji, at: p.at, on: un.indexOf(p.id) >= 0 };
  });
}

/* 四季场景墙的数据 */
function sceneWall(total) {
  return E.SCENES.map(function (s) {
    return { id: s.id, name: s.name, short: s.short, emoji: s.emoji, at: s.at, color: s.color, on: (total || 0) >= s.at };
  });
}

module.exports = {
  ORDER_FRONT: ORDER_FRONT,
  ORDER_BACK: ORDER_BACK,
  layers: layers,
  sceneImage: sceneImage,
  snowflakes: snowflakes,
  partWall: partWall,
  sceneWall: sceneWall
};
