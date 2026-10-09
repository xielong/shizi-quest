var E = require('../../utils/engine.js');

Page({
  data: {
    refRows: []
  },
  onLoad: function () {
    this.setData({
      refRows: E.AGE_REF.map(function (row) {
        return { label: row[0], range: row[1] };
      })
    });
  },
  back: function () { wx.navigateBack(); }
});
