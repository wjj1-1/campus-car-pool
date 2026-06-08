function parseTripTime(trip) {
  if (!trip || !trip.date || !trip.time) return null;
  const value = `${trip.date} ${trip.time}`.replace(/-/g, '/');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveTrip(trip) {
  if (!trip || trip.status === 'cancelled' || trip.status === 'completed') return false;
  const departAt = parseTripTime(trip);
  return !departAt || Date.now() < departAt.getTime() + 60 * 60 * 1000;
}

function countActiveTrips(ids, trips) {
  return ids.filter(id => {
    const trip = trips.find(item => item.id === id);
    return isActiveTrip(trip);
  }).length;
}

function isVerifiedUser(userInfo) {
  return !!(userInfo && userInfo.verified && userInfo.verifiedType && userInfo.verifiedDetail);
}

function getAuthStatusText(userInfo) {
  if (isVerifiedUser(userInfo)) return '已';
  if (userInfo && userInfo.authStatus === 'pending') return '待审';
  if (userInfo && userInfo.authStatus === 'rejected') return '驳回';
  return '未';
}

function parseCreditRecordTime(record) {
  if (!record || !record.tripDate || !record.tripTime) return null;
  const value = `${record.tripDate} ${record.tripTime}`.replace(/-/g, '/');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateCancelPoints(record) {
  const departAt = parseCreditRecordTime(record);
  if (!departAt) return record.points || 2;
  const hoursBefore = (departAt.getTime() - (record.cancelledAt || Date.now())) / (60 * 60 * 1000);
  let points = 0;
  if (hoursBefore >= 24) points = 0;
  else if (hoursBefore >= 2) points = 2;
  else if (hoursBefore >= 0) points = 5;
  else points = 8;
  if (record.hadMembers) points += 2;
  return points;
}

function reviewCreditRecords() {
  const userInfo = wx.getStorageSync('userInfo');
  if (!userInfo || !userInfo.isLoggedIn) return { userInfo: null, creditRecords: [] };
  const records = wx.getStorageSync('creditRecords') || [];
  let score = userInfo.creditScore || 100;
  let changed = false;
  const nextRecords = records.map(record => {
    if (record.status !== 'pending') return record;
    const points = calculateCancelPoints(record);
    changed = true;
    if (points <= 0) {
      return Object.assign({}, record, {
        points: 0,
        status: 'waived',
        statusText: '已核验，不扣分',
        reviewedAt: Date.now()
      });
    }
    score = Math.max(score - points, 0);
    return Object.assign({}, record, {
      points,
      status: 'confirmed',
      statusText: '已核验，已扣分',
      reviewedAt: Date.now()
    });
  });
  if (changed) {
    wx.setStorageSync('creditRecords', nextRecords);
    wx.setStorageSync('userInfo', Object.assign({}, userInfo, { creditScore: score }));
  }
  return { userInfo: wx.getStorageSync('userInfo') || userInfo, creditRecords: nextRecords };
}

Page({
  data: {
    userInfo: null,
    avatarText: '未',
    verifiedText: '未',
    creditScore: 100,
    genderIndex: 0,
    identityIndex: 0,
    genders: ['女', '男'],
    genderValues: ['female', 'male'],
    identities: ['学生', '教师'],
    identityValues: ['student', 'teacher'],
    joinedCount: 0,
    publishedCount: 0,
    creditRecords: [],
    menu: [
      { title: '消息通知', url: '/pages/messages/messages' },
      { title: '身份认证', url: '/pages/auth/auth' },
      { title: '认证审核', url: '/pages/adminAuth/adminAuth' },
      { title: '常用地址', url: '/pages/address/address' },
      { title: '通知设置', url: '/pages/settings/settings' },
      { title: '意见反馈', url: '/pages/feedback/feedback' }
    ]
  },

  onShow() {
    const reviewResult = reviewCreditRecords();
    const userInfo = reviewResult.userInfo || null;
    const genderIndex = userInfo && userInfo.gender === 'male' ? 1 : 0;
    const identityIndex = userInfo && userInfo.identity === 'teacher' ? 1 : 0;
    const trips = wx.getStorageSync('trips') || [];
    const joinedTrips = wx.getStorageSync('joinedTrips') || [];
    const myPublishedTrips = wx.getStorageSync('myPublishedTrips') || [];
    this.setData({
      userInfo,
      avatarText: userInfo && userInfo.nickname ? userInfo.nickname.slice(0, 1) : '未',
      verifiedText: getAuthStatusText(userInfo),
      genderIndex,
      identityIndex,
      joinedCount: countActiveTrips(joinedTrips, trips),
      publishedCount: countActiveTrips(myPublishedTrips, trips),
      creditScore: userInfo && userInfo.creditScore ? userInfo.creditScore : 100,
      creditRecords: (reviewResult.creditRecords || []).slice(0, 5)
    });
  },

  login() {
    wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/mine/mine') });
  },

  onGenderChange(e) { this.updateProfile(Number(e.detail.value), this.data.identityIndex); },
  onIdentityChange(e) { this.updateProfile(this.data.genderIndex, Number(e.detail.value)); },

  updateProfile(genderIndex, identityIndex) {
    const current = wx.getStorageSync('userInfo') || {};
    if (!current.isLoggedIn) {
      this.login();
      return;
    }
    const userInfo = Object.assign({}, current, {
      gender: this.data.genderValues[genderIndex],
      genderText: this.data.genders[genderIndex],
      identity: this.data.identityValues[identityIndex],
      identityText: this.data.identities[identityIndex]
    });
    wx.setStorageSync('userInfo', userInfo);
    this.setData({ userInfo, genderIndex, identityIndex });
    wx.showToast({ title: '资料已更新', icon: 'success' });
  },

  goPage(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
  goTrips() { wx.switchTab({ url: '/pages/trips/trips' }); }
});


