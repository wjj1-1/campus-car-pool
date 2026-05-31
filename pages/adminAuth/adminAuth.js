Page({
  data: {
    applications: []
  },

  onShow() {
    this.loadApplications();
  },

  loadApplications() {
    const applications = wx.getStorageSync('authApplications') || [];
    this.setData({ applications });
  },

  approve(e) {
    const id = e.currentTarget.dataset.id;
    const applications = wx.getStorageSync('authApplications') || [];
    const target = applications.find(item => item.id === id);
    if (!target) return;
    const nextApplications = applications.map(item => item.id === id ? Object.assign({}, item, {
      status: 'approved',
      statusText: '已通过',
      reviewedAt: Date.now()
    }) : item);
    wx.setStorageSync('authApplications', nextApplications);

    const userInfo = wx.getStorageSync('userInfo') || {};
    if ((userInfo.userId || 'local-user') === target.userId) {
      wx.setStorageSync('userInfo', Object.assign({}, userInfo, {
        identity: target.identity,
        identityText: target.identityText,
        nickname: target.name,
        school: target.school,
        verified: true,
        verifiedType: target.identity,
        verifiedDetail: target.detail,
        authStatus: 'approved',
        authStatusText: '已认证',
        pendingAuthId: ''
      }));
    }
    wx.showToast({ title: '已通过', icon: 'success' });
    this.loadApplications();
  },

  reject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '驳回原因',
      editable: true,
      placeholderText: '请填写驳回原因',
      confirmText: '驳回',
      success: (res) => {
        if (!res.confirm) return;
        const reason = (res.content || '').trim();
        if (!reason) {
          wx.showToast({ title: '请填写原因', icon: 'none' });
          return;
        }
        const applications = wx.getStorageSync('authApplications') || [];
        const target = applications.find(item => item.id === id);
        const nextApplications = applications.map(item => item.id === id ? Object.assign({}, item, {
          status: 'rejected',
          statusText: '已驳回',
          rejectReason: reason,
          reviewedAt: Date.now()
        }) : item);
        wx.setStorageSync('authApplications', nextApplications);

        const userInfo = wx.getStorageSync('userInfo') || {};
        if (target && (userInfo.userId || 'local-user') === target.userId) {
          wx.setStorageSync('userInfo', Object.assign({}, userInfo, {
            verified: false,
            verifiedType: '',
            verifiedDetail: null,
            authStatus: 'rejected',
            authStatusText: '已驳回',
            authRejectReason: reason,
            pendingAuthId: ''
          }));
        }
        wx.showToast({ title: '已驳回', icon: 'success' });
        this.loadApplications();
      }
    });
  }
});
