const CAMPUS = { latitude: 30.5067, longitude: 114.4047 };
const PLACE_POINTS = {
  '学校东门': { latitude: 30.5069, longitude: 114.4072 },
  '学校北门': { latitude: 30.5104, longitude: 114.4042 },
  '南湖校区': { latitude: 30.5067, longitude: 114.4047 },
  '武汉站': { latitude: 30.6073, longitude: 114.4247 },
  '武昌站': { latitude: 30.5294, longitude: 114.3160 },
  '汉口站': { latitude: 30.6180, longitude: 114.2549 },
  '天河机场': { latitude: 30.7838, longitude: 114.2081 },
  '光谷广场': { latitude: 30.5061, longitude: 114.4009 }
};

function enhanceTrip(trip) {
  const seats = Math.min(Math.max(Number(trip.seats || 4), 1), 4);
  const joined = Math.min(Math.max(Number(trip.joined || 1), 1), seats);
  const availableSeats = Math.max(seats - joined, 0);
  const statusText = trip.status === 'cancelled' ? '已取消' : (availableSeats === 0 ? '已满员' : (joined >= 2 ? '已成行' : '待成行'));
  return Object.assign({}, trip, {
    seats,
    joined,
    availableSeats,
    statusText,
    capacityText: availableSeats === 0 ? '已满员' : `剩余名额 ${availableSeats}`,
    priceText: trip.priceText || 'AA后结算'
  });
}
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
    reason: '取消发布行程',
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

function isVerifiedUser(userInfo) {
  return !!(userInfo && userInfo.verified && userInfo.verifiedType && userInfo.verifiedDetail);
}

Page({
  data: {
    trip: null,
    joined: false,
    isPublisher: false,
    markers: [],
    polyline: [],
    latitude: CAMPUS.latitude,
    longitude: CAMPUS.longitude,
    roleText: '拼车需求',
    joinText: '加入同行',
    remarkText: '无特殊说明',
    statusText: '',
    availableSeats: 0
  },

  onLoad(options) {
    this.tripId = options.id;
    this.loadTrip();
  },

  loadTrip() {
    const trips = wx.getStorageSync('trips') || [];
    const rawTrip = trips.find(item => item.id === this.tripId);
    const joinedTrips = wx.getStorageSync('joinedTrips') || [];
    const myPublishedTrips = wx.getStorageSync('myPublishedTrips') || [];
    if (!rawTrip) return;
    const trip = enhanceTrip(rawTrip);
    const mapData = this.buildMapData(trip);
    const hasJoined = joinedTrips.indexOf(this.tripId) > -1;
    this.setData({
      trip,
      joined: hasJoined,
      isPublisher: myPublishedTrips.indexOf(this.tripId) > -1,
      remarkText: trip.remark ? trip.remark : '无特殊说明',
      statusText: trip.statusText,
      joinText: hasJoined ? '已加入' : (trip.availableSeats === 0 ? '已满员' : '加入同行'),
      availableSeats: trip.availableSeats,
      ...mapData
    });
  },

  buildMapData(trip) {
    const start = trip.startPoint || PLACE_POINTS[trip.start] || CAMPUS;
    const end = trip.endPoint || PLACE_POINTS[trip.end] || CAMPUS;
    return {
      latitude: (start.latitude + end.latitude) / 2,
      longitude: (start.longitude + end.longitude) / 2,
      markers: [
        { id: 1, latitude: start.latitude, longitude: start.longitude, width: 28, height: 28, callout: { content: trip.start, color: '#05A854', fontSize: 11, borderRadius: 8, bgColor: '#FFFFFF', padding: 7, display: 'ALWAYS' } },
        { id: 2, latitude: end.latitude, longitude: end.longitude, width: 28, height: 28, callout: { content: trip.end, color: '#05A854', fontSize: 11, borderRadius: 8, bgColor: '#FFFFFF', padding: 7, display: 'ALWAYS' } }
      ],
      polyline: [{ points: [start, end], color: '#07C160', width: 5, dottedLine: false, arrowLine: true }]
    };
  },

  getJoinBlockReason(trip, userInfo) {
    if (!isVerifiedUser(userInfo)) return '请先完成身份认证';
    if (this.data.isPublisher) return '不能加入自己发布的拼车';
    if (this.data.joined) return '你已经加入过该拼车';
    if (trip.status !== 'open') return '该拼车当前不可加入';
    if ((userInfo.creditScore || 100) < 60) return '信誉分低于60，暂不能加入拼车';
    if ((trip.joined || 1) >= (trip.seats || 4)) return '该拼车已满员';
    const memberIds = trip.memberIds || [];
    const userId = userInfo.userId || 'local-user';
    if (memberIds.indexOf(userId) > -1) return '你已经在这次拼车里';
    if (trip.genderPreference === 'female_only' && userInfo.gender !== 'female') return '该拼车仅限女生加入';
    if (trip.genderPreference === 'male_only' && userInfo.gender !== 'male') return '该拼车仅限男生加入';
    return '';
  },

  joinTrip() {
    const trip = this.data.trip;
    if (!trip) return;
    const userInfo = wx.getStorageSync('userInfo') || {};
    if (!userInfo.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/detail/detail?id=' + trip.id) });
      return;
    }
    if (!isVerifiedUser(userInfo)) {
      if (userInfo.authStatus === 'pending') {
        wx.showToast({ title: '身份认证待审核', icon: 'none' });
        return;
      }
      if (userInfo.authStatus === 'rejected') {
        wx.showModal({
          title: '认证已驳回',
          content: userInfo.authRejectReason ? `原因：${userInfo.authRejectReason}` : '请重新提交身份认证。',
          confirmText: '重新认证',
          success: (res) => {
            if (res.confirm) wx.navigateTo({ url: '/pages/auth/auth' });
          }
        });
        return;
      }
      wx.showModal({
        title: '需要身份认证',
        content: '加入拼车前请先完成身份认证，认证后才能使用拼车功能。',
        confirmText: '去认证',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/auth/auth' });
        }
      });
      return;
    }
    const reason = this.getJoinBlockReason(trip, userInfo);
    if (reason) { wx.showToast({ title: reason, icon: 'none' }); return; }

    wx.showModal({
      title: '确认加入同行',
      content: `加入 ${trip.start} 到 ${trip.end} 的拼车？费用默认AA后结算，请主动联系发布人确认集合点。`,
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '加入中...', mask: true });

        // 优先调用云函数（支持 _id）
        if (trip._id) {
          wx.cloud.callFunction({
            name: 'joinCarpool',
            data: { tripId: trip._id },
            success: (cloudRes) => {
              wx.hideLoading();
              if (cloudRes.result && cloudRes.result.errCode === 0) {
                console.log('加入成功（云端）：', cloudRes.result);
                // 同步本地数据
                this.syncLocalJoin(trip, userInfo);
              } else {
                const msg = (cloudRes.result && cloudRes.result.msg) || '加入失败';
                wx.showToast({ title: msg, icon: 'none' });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('joinCarpool 云端失败，回退本地：', err);
              // 回退到本地操作
              this.joinTripLocal(trip, userInfo);
            }
          });
        } else {
          // 无 _id，使用本地存储
          wx.hideLoading();
          this.joinTripLocal(trip, userInfo);
        }
      }
    });
  },

  syncLocalJoin(trip, userInfo) {
    const trips = wx.getStorageSync('trips') || [];
    const index = trips.findIndex(item => item.id === trip.id || item._id === trip._id);
    if (index > -1) {
      const memberIds = trips[index].memberIds || [];
      const passengerContacts = trips[index].passengerContacts || [];
      trips[index] = Object.assign({}, trips[index], {
        joined: (trips[index].joined || 1) + 1,
        memberIds: memberIds.concat([userInfo.userId || 'local-user']),
        passengerContacts: passengerContacts.concat([{ userId: userInfo.userId || 'local-user', name: userInfo.nickname || '拼车人', phone: userInfo.phone || '' }])
      });
      wx.setStorageSync('trips', trips);
    }
    const joined = wx.getStorageSync('joinedTrips') || [];
    const idToUse = trip._id || trip.id;
    if (joined.indexOf(idToUse) === -1) joined.unshift(idToUse);
    wx.setStorageSync('joinedTrips', joined);
    const messages = wx.getStorageSync('messages') || [];
    messages.unshift({ id: `M${Date.now()}`, tripId: idToUse, title: '加入成功', content: `你已加入 ${trip.start} -> ${trip.end}，请联系发布人确认集合点和费用AA方式。`, time: '刚刚', unread: true });
    wx.setStorageSync('messages', messages);
    wx.showToast({ title: '加入成功', icon: 'success' });
    this.loadTrip();
  },

  joinTripLocal(trip, userInfo) {
    const trips = wx.getStorageSync('trips') || [];
    const index = trips.findIndex(item => item.id === trip.id);
    if (index === -1) return;
    const latestTrip = enhanceTrip(trips[index]);
    const latestReason = this.getJoinBlockReason(latestTrip, userInfo);
    if (latestReason) { wx.showToast({ title: latestReason, icon: 'none' }); this.loadTrip(); return; }
    const memberIds = latestTrip.memberIds || [];
    const passengerContacts = latestTrip.passengerContacts || [];
    trips[index] = Object.assign({}, latestTrip, {
      joined: latestTrip.joined + 1,
      memberIds: memberIds.concat([userInfo.userId || 'local-user']),
      passengerContacts: passengerContacts.concat([{ userId: userInfo.userId || 'local-user', name: userInfo.nickname || '拼车人', phone: userInfo.phone || '' }])
    });
    wx.setStorageSync('trips', trips);
    const joined = wx.getStorageSync('joinedTrips') || [];
    if (joined.indexOf(trip.id) === -1) joined.unshift(trip.id);
    wx.setStorageSync('joinedTrips', joined);
    const messages = wx.getStorageSync('messages') || [];
    messages.unshift({ id: `M${Date.now()}`, tripId: trip.id, title: '加入成功', content: `你已加入 ${trip.start} -> ${trip.end}，请联系发布人确认集合点和费用AA方式。`, time: '刚刚', unread: true });
    wx.setStorageSync('messages', messages);
    wx.showToast({ title: '加入成功', icon: 'success' });
    this.loadTrip();
  },

  contactPublisher() {
    const trip = this.data.trip;
    if (!trip) return;
    wx.makePhoneCall({ phoneNumber: trip.contact });
  },

  contactCarpoolers() {
    const trip = this.data.trip;
    if (!trip) return;
    const contacts = trip.passengerContacts || [];
    if (contacts.length === 0) { wx.showToast({ title: '暂无同行人电话', icon: 'none' }); return; }
    wx.showActionSheet({
      itemList: contacts.map(item => item.name || item.phone || '同行人'),
      success: (res) => {
        const person = contacts[res.tapIndex];
        if (person && person.phone) wx.makePhoneCall({ phoneNumber: person.phone });
      }
    });
  },

  saveReport(reason, detail) {
    const trip = this.data.trip;
    const reports = wx.getStorageSync('reports') || [];
    reports.unshift({
      id: `R${Date.now()}`,
      tripId: trip.id,
      route: `${trip.start} -> ${trip.end}`,
      reason,
      detail,
      time: new Date().toLocaleString()
    });
    wx.setStorageSync('reports', reports);
    wx.showToast({ title: '反馈已提交', icon: 'success' });
  },

  reportTrip() {
    const trip = this.data.trip;
    if (!trip) return;
    const reasons = ['未按时赴约', '临时取消未说明', '联系方式无效', '同行行为不当', '其他问题'];
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
            this.saveReport(reason, detail);
          }
        });
      }
    });
  },

  cancelPublishedTrip() {
    const trip = this.data.trip;
    if (!trip) return;
    wx.showModal({
      title: '取消拼车',
      content: '确定取消这条拼车需求？取消后将从大厅隐藏，并进入信誉记录核验。',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '处理中...', mask: true });

        // 优先调用云函数
        if (trip._id) {
          wx.cloud.callFunction({
            name: 'cancelCarpool',
            data: { tripId: trip._id, action: 'cancelPublish' },
            success: (cloudRes) => {
              wx.hideLoading();
              if (cloudRes.result && cloudRes.result.errCode === 0) {
                console.log('取消成功（云端）：', cloudRes.result);
                // 同步本地数据
                this.syncLocalCancel(trip);
              } else {
                const msg = (cloudRes.result && cloudRes.result.msg) || '取消失败';
                wx.showToast({ title: msg, icon: 'none' });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('cancelCarpool 云端失败，回退本地：', err);
              this.cancelPublishedTripLocal(trip);
            }
          });
        } else {
          // 无 _id，使用本地存储
          wx.hideLoading();
          this.cancelPublishedTripLocal(trip);
        }
      }
    });
  },

  syncLocalCancel(trip) {
    const trips = wx.getStorageSync('trips') || [];
    const nextTrips = trips.map(item => {
      const matchId = item._id === trip._id || item.id === trip.id;
      return matchId ? Object.assign({}, item, { status: 'cancelled', cancelReason: 'user_cancelled', cancelledAt: Date.now() }) : item;
    });
    wx.setStorageSync('trips', nextTrips);
    addPendingCreditRecord('cancel_publish', trip);
    wx.showToast({ title: '已进入核验', icon: 'success' });
    setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }); }, 600);
  },

  cancelPublishedTripLocal(trip) {
    const trips = wx.getStorageSync('trips') || [];
    const nextTrips = trips.map(item => item.id === trip.id ? Object.assign({}, item, { status: 'cancelled', cancelReason: 'user_cancelled', cancelledAt: Date.now() }) : item);
    addPendingCreditRecord('cancel_publish', trip);
    wx.setStorageSync('trips', nextTrips);
    wx.showToast({ title: '已进入核验', icon: 'success' });
    setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }); }, 600);
  }
});





