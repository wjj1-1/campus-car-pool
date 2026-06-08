Page({
  data: { messages: [] },

  onShow() {
    const messages = wx.getStorageSync('messages') || [];
    this.setData({ messages });
  },

  openMessage(e) {
    const id = e.currentTarget.dataset.id;
    const messages = (wx.getStorageSync('messages') || []).map(item => item.id === id ? Object.assign({}, item, { unread: false }) : item);
    wx.setStorageSync('messages', messages);
    this.setData({ messages });
    const message = messages.find(item => item.id === id);
    if (message && message.tripId) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${message.tripId}` });
    }
  },

  clearAll() {
    wx.showModal({
      title: '清空消息',
      content: '确定清空全部消息？',
      success: (res) => {
        if (!res.confirm) return;
        wx.setStorageSync('messages', []);
        this.setData({ messages: [] });
      }
    });
  }
});