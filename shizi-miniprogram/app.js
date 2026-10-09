/* =========================================================================
   app.js —— 全局状态
   测试进行中的 session 放在 globalData 里，页面之间靠它传递（纯数据对象，可安全持有）
   ========================================================================= */
var store = require('./utils/store.js');

App({
  globalData: {
    session: null,      // 正在进行的这一次测试
    lastResult: null,   // 最近一次算出来的结果（结果页读它）
    lastFresh: [],      // 这次新解锁的零件 id
    profile: { name: '跳跳', age: 5 }
  },

  onLaunch: function () {
    this.globalData.profile = store.getProfile();
  },

  /* 取（或补上）小朋友的名字 */
  profile: function () {
    if (!this.globalData.profile) this.globalData.profile = store.getProfile();
    return this.globalData.profile;
  },

  setProfile: function (p) {
    this.globalData.profile = { name: (p && p.name) || '跳跳', age: (p && p.age) || 5 };
    store.setProfile(this.globalData.profile);
    return this.globalData.profile;
  }
});
