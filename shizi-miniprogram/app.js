/* =========================================================================
   app.js —— 全局状态
   测试进行中的 session 放在 globalData 里，页面之间靠它传递（纯数据对象，可安全持有）
   小朋友的名字年龄由 store 管理（支持多个小朋友，各自一份进度）
   ========================================================================= */
var store = require('./utils/store.js');

App({
  globalData: {
    session: null,      // 正在进行的这一次测试
    lastResult: null,   // 最近一次算出来的结果（结果页读它）
    lastFresh: [],      // 这次新解锁的零件 id
    profile: null       // 当前小朋友（懒加载）
  },

  onLaunch: function () {
    this.globalData.profile = store.getProfile();
  },

  /* 取（或补上）当前小朋友的名字年龄 */
  profile: function () {
    if (!this.globalData.profile) this.globalData.profile = store.getProfile();
    return this.globalData.profile;
  },

  /* 存名字年龄（写到当前小朋友名下） */
  setProfile: function (p) {
    store.setProfile(p);
    this.globalData.profile = store.getProfile();
    return this.globalData.profile;
  },

  /* 换人 / 新增 / 删除后调一下，把缓存的名字刷新掉 */
  reloadProfile: function () {
    this.globalData.profile = store.getProfile();
    return this.globalData.profile;
  }
});
