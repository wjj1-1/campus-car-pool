function parseTripTime(trip) {
  if (!trip || !trip.date || !trip.time) return null;
  const value = `${trip.date} ${trip.time}`.replace(/-/g, '/');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateCancelPoints(trip, cancelledAt) {
  const departAt = parseTripTime(trip);
  if (!departAt) return 2;
  const hoursBefore = (departAt.getTime() - cancelledAt) / (60 * 60 * 1000);
  let points = 0;
  if (hoursBefore >= 24) points = 0;
  else if (hoursBefore >= 2) points = 2;
  else if (hoursBefore >= 0) points = 5;
  else points = 8;
  if ((trip.joined || 1) > 1) points += 2;
  return points;
}

function addPendingCreditRecord(type, trip) {
  if (!trip) return;
  const records = wx.getStorageSync('creditRecords') || [];
  const exists = records.some(item => item.tripId === trip.id && item.type === type && item.status === 'pending');
  if (exists) return;
  const cancelledAt = Date.now();
  const estimatedPoints = calculateCancelPoints(trip, cancelledAt);
  records.unshift({
    id: `C${cancelledAt}`,
    type,
    tripId: trip.id,
    route: `${trip.start} -> ${trip.end}`,
    reason: type === 'cancel_publish' ? '取消发布行程' : '取消加入行程',
    points: estimatedPoints,
    status: 'pending',
    statusText: estimatedPoints > 0 ? '系统待核验' : '已记录，预计不扣分',
    cancelledAt,
    tripDate: trip.date,
    tripTime: trip.time,
    hadMembers: (trip.joined || 1) > 1,
    time: new Date(cancelledAt).toLocaleString()
  });
  wx.setStorageSync('creditRecords', records);
}

function recordFeedback(type, trip, detail) {
  const reports = wx.getStorageSync('reports') || [];
  reports.unshift({
    id: `R${Date.now()}`,
    tripId: trip ? trip.id : '',
    route: trip ? `${trip.start} -> ${trip.end}` : '',
    target: type,
    reason: type,
    detail: detail || '',
    time: new Date().toLocaleString()
  });
  wx.setStorageSync('reports', reports);
}

function enhanceTrip(trip, now) {
  const seats = Math.min(Math.max(Number(trip.seats || 4), 1), 4);
  const joined = Math.min(Math.max(Number(trip.joined || 1), 1), seats);
  const availableSeats = Math.max(seats - joined, 0);
  const departAt = parseTripTime(trip);
  let progress = '待出发';
  let statusClass = 'waiting';
  if (trip.status === 'cancelled') {
    progress = '已取消';
    statusClass = 'full';
  } else if (departAt && now >= departAt.getTime() + 60 * 60 * 1000) {
    progress = '已结束';
    statusClass = 'full';
  } else if (departAt && now >= departAt.getTime()) {
    progress = '进行中';
    statusClass = 'ready';
  } else if (joined >= 2) {
    progress = '已成行';
    statusClass = 'ready';
  }
  return Object.assign({}, trip, {
    seats,
    joined,
    availableSeats,
    statusText: progress,
    statusClass,
    capacityText: availableSeats === 0 ? '已满员' : `剩余名额 ${availableSeats}`,
    priceText: trip.priceText || 'AA后结算',
    isPast: !!departAt && now >= departAt.getTime() + 60 * 60 * 1000,
    isActive: trip.status !== 'cancelled' && (!departAt || now < departAt.getTime() + 60 * 60 * 1000)
  });
}

Page({
  data: {
    active: 'joined',
    tabs: [
      { key: 'joined', name: '我加入的' },
      { key: 'published', name: '我发布的' },
      { key: 'history', name: '历史行程' }
    ],
    trips: []
  },

  onShow() {
    this.evaluateTripsBySystem();
    this.loadTrips();
  },

  evaluateTripsBySystem() {
    const trips = wx.getStorageSync('trips') || [];
    const now = Date.now();
    let changed = false;
    const nextTrips = trips.map(trip => {
      if (trip.status === 'cancelled' || trip.status === 'completed') return trip;
      const departAt = parseTripTime(trip);
      if (!departAt) return trip;
      const oneHourAfter = departAt.getTime() + 60 * 60 * 1000;
      if (now >= oneHourAfter && trip.status !== 'completed') {
        changed = true;
        return Object.assign({}, trip, { status: 'completed', systemStatus: 'completed', systemStatusText: '已结束' });
      }
      if (now >= departAt.getTime() && trip.systemStatus !== 'in_progress') {
        changed = true;
        return Object.assign({}, trip, { systemStatus: 'in_progress', systemStatusText: '进行中' });
      }
      if (now - departAt.getTime() > 15 * 60 * 1000 && trip.systemStatus !== 'pending_no_show_review') {
        changed = true;
        return Object.assign({}, trip, { systemStatus: 'pending_no_show_review', systemStatusText: '系统待核验' });
      }
      return trip;
    });
    if (changed) wx.setStorageSync('trips', nextTrips);
  },

  switchTab(e) {
    this.setData({ active: e.currentTarget.dataset.key }, () => this.loadTrips());
  },

  loadTrips() {
    const all = wx.getStorageSync('trips') || [];
    const now = Date.now();
    const enhanced = all.map(item => enhanceTrip(item, now));
    let trips = [];
    if (this.data.active === 'joined') {
      const ids = wx.getStorageSync('joinedTrips') || [];
      trips = enhanced.filter(item => ids.indexOf(item.id) > -1 && item.status !== 'cancelled' && item.isActive);
    } else if (this.data.active === 'published') {
      const ids = wx.getStorageSync('myPublishedTrips') || [];
      trips = enhanced.filter(item => ids.indexOf(item.id) > -1 && item.status !== 'cancelled' && item.isActive);
    } else {
      const ids = (wx.getStorageSync('joinedTrips') || []).concat(wx.getStorageSync('myPublishedTrips') || []);
      trips = enhanced.filter(item => ids.indexOf(item.id) > -1 && (item.status === 'completed' || item.status === 'cancelled' || item.isPast));
    }
    this.setData({ trips });
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  contactTrip(e) {
    const id = e.currentTarget.dataset.id;
    const trips = wx.getStorageSync('trips') || [];
    const trip = trips.find(item => item.id === id);
    if (!trip) return;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  reportTrip(e) {
    const id = e.currentTarget.dataset.id;
    const trips = wx.getStorageSync('trips') || [];
    const trip = trips.find(item => item.id === id);
    if (!trip) return;
    const reasons = ['发布人未按时赴约', '加入人未按时赴约', '临时取消未说明', '联系方式无效', '其他问题'];
    wx.showActionSheet({
      itemList: reasons,
      success: (res) => {
        const reason = reasons[res.tapIndex];
        wx.showModal({
          title: reason,
          editable: true,
          placeholderText: '请填写具体情况，例如约定18:30东门集合，对方一直未出现且未回复消息',
          confirmText: '提交',
          success: (modalRes) => {
            if (!modalRes.confirm) return;
            const detail = (modalRes.content || '').trim();
            if (!detail) {
              wx.showToast({ title: '请填写反馈内容', icon: 'none' });
              return;
            }
            recordFeedback(reason, trip, detail);
            wx.showToast({ title: '反馈已提交', icon: 'success' });
          }
        });
      }
    });
  },

  cancelTrip(e) {
    const id = e.currentTarget.dataset.id;
    const trips = wx.getStorageSync('trips') || [];
    const trip = trips.find(item => item.id === id);
    if (!trip) return;
    wx.showModal({
      title: '确认取消',
      content: this.data.active === 'joined' ? '确定取消加入该行程？取消记录会进入系统核验。' : '确定取消发布该行程？取消记录会进入系统核验。',
      success: (res) => {
        if (!res.confirm) return;
        if (this.data.active === 'joined') {
          const userInfo = wx.getStorageSync('userInfo') || { userId: 'local-user' };
          const userId = userInfo.userId || 'local-user';
          const joined = (wx.getStorageSync('joinedTrips') || []).filter(item => item !== id);
          const nextTrips = trips.map(item => {
            if (item.id !== id) return item;
            const memberIds = (item.memberIds || []).filter(memberId => memberId !== userId);
            const passengerContacts = (item.passengerContacts || []).filter(person => person.userId !== userId);
            return Object.assign({}, item, {
              joined: Math.max((item.joined || 1) - 1, 1),
              memberIds,
              passengerContacts
            });
          });
          addPendingCreditRecord('cancel_join', trip);
          wx.setStorageSync('joinedTrips', joined);
          wx.setStorageSync('trips', nextTrips);
        } else {
          const nextTrips = trips.map(item => item.id === id ? Object.assign({}, item, { status: 'cancelled', cancelReason: 'user_cancelled', cancelledAt: Date.now() }) : item);
          addPendingCreditRecord('cancel_publish', trip);
          wx.setStorageSync('trips', nextTrips);
        }
        recordFeedback('主动取消，待系统核验', trip);
        wx.showToast({ title: '已进入核验', icon: 'success' });
        this.loadTrips();
      }
    });
  }
});