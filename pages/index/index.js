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

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function parseTripTime(trip) {
  if (!trip || !trip.date || !trip.time) return null;
  const value = `${trip.date} ${trip.time}`.replace(/-/g, '/');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveTrip(item) {
  if (!item || item.status === 'cancelled' || item.status === 'completed') return false;
  const departAt = parseTripTime(item);
  return !departAt || Date.now() < departAt.getTime() + 60 * 60 * 1000;
}

function enhanceTrip(item) {
  const seats = Math.min(Math.max(Number(item.seats || 4), 1), 4);
  const joined = Math.min(Math.max(Number(item.joined || 1), 1), seats);
  const availableSeats = Math.max(seats - joined, 0);
  const isReady = joined >= 2;
  const isFull = availableSeats === 0;
  const luggageSlots = Number(item.luggageSlots || 0);
  const alerts = [];
  if (item.tripScene === 'holiday' || item.tripScene === 'back_to_school') alerts.push('高峰出行');
  if (luggageSlots > 2 || item.luggageLevel === 'multi') alerts.push('行李较多');
  if (item.genderPreference && item.genderPreference !== 'all') alerts.push(item.genderPreferenceText);
  return Object.assign({}, item, {
    seats,
    joined,
    availableSeats,
    capacityText: isFull ? '已满员' : `剩余名额 ${availableSeats}`,
    statusBadge: isFull ? '已满员' : (isReady ? '已成行' : '待成行'),
    statusClass: isFull ? 'full' : (isReady ? 'ready' : 'waiting'),
    priceText: item.priceText || 'AA后结算',
    alerts: alerts.length ? alerts : ['普通拼车']
  });
}

Page({
  data: {
    latitude: CAMPUS.latitude,
    longitude: CAMPUS.longitude,
    scale: 12,
    markers: [],
    userLocation: null,
    locationAccuracy: '',
    locationHint: '正在获取当前位置',
    locating: false,
    keyword: '',
    activeFilter: '全部',
    filters: ['全部', '今天', '明天', '机场', '高铁站', '女同学优先', '行李友好'],
    quickPlaces: ['武汉站', '武昌站', '汉口站', '天河机场', '光谷广场'],
    todayText: '',
    trips: [],
    displayTrips: [],
    stats: { todayTrips: 0, availableSlots: 0, readyTrips: 0 },
    selectedTrip: null
  },

  onLoad() {
    // ====== 云函数诊断（请查看控制台输出）======
    console.log('========== 云函数诊断开始 ==========');
    console.log('步骤1: 检查 wx.cloud 是否存在:', !!wx.cloud);

    if (!wx.cloud) {
      console.error('❌ wx.cloud 不存在！基础库版本太低，请在 project.config.json 中设置 libVersion 为 2.19.4 或以上');
      this.setData({ locationHint: '云能力不可用，请检查基础库版本' });
      this.loadLocalTrips();
      return;
    }

    console.log('步骤2: 当前环境ID:', wx.cloud.env || '未获取到');
    console.log('步骤3: 目标环境ID应为: cloud1-d7gk8zo83e93eecad');

    // 测试调用 login 函数，带详细日志
    console.log('步骤4: 开始调用 login 云函数...');
    const callStartTime = Date.now();

    wx.cloud.callFunction({
      name: 'login',
      env: 'cloud1-d7gk8zo83e93eecad',
      success: (res) => {
        const cost = Date.now() - callStartTime;
        console.log(`✅ login 调用成功！耗时 ${cost}ms`);
        console.log('返回结果:', JSON.stringify(res.result));
        this.setData({ locationHint: `云端连接正常 (${cost}ms)` });
      },
      fail: (err) => {
        const cost = Date.now() - callStartTime;
        console.error(`❌ login 调用失败！耗时 ${cost}ms`);
        console.error('错误完整对象:', err);
        console.error('errCode:', err.errCode);
        console.error('errMsg:', err.errMsg);

        // 根据错误码给出具体建议
        let hint = `调用失败 (${cost}ms): `;
        if (err.errCode === -1) {
          hint += '通用错误，可能是网络问题或环境不存在';
          console.error('💡 建议: 请确认云开发控制台环境中是否有此AppID的权限');
        } else if (err.errCode === -501002 || err.errCode === -504001 || err.errCode === -504002) {
          hint += '云资源超时或失败';
          console.error('💡 建议: 确认云函数是否已上传部署');
        } else if (err.errCode === -601027) {
          hint += '环境不存在！请检查环境ID';
          console.error('💡 建议: 登录微信云开发控制台确认环境 cloud1-d7gk8zo83e93eecad 是否存在');
        } else if (err.errCode === -601034) {
          hint += '未开通云服务！';
          console.error('💡 建议: 在微信公众平台 → 开发管理 → 云开发 中开通服务');
        } else if (err.errCode === -601012) {
          hint += '无权限访问该环境';
          console.error('💡 建议: 检查 AppID 是否有该环境的访问权限');
        } else {
          hint += err.errMsg || '未知错误';
          console.error(`💡 未识别的错误码 ${err.errCode}，请将此错误截图反馈`);
        }
        this.setData({ locationHint: hint });
      }
    });
    // ====== 诊断结束 ======

    this.loadTrips();
  },

  onReady() {
    this.mapContext = wx.createMapContext('campusMap');  },

  onShow() {
    this.loadTrips();
  },

  initUserLocation() {
    this.setData({ locating: true, locationHint: '正在获取当前位置' });
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success: (res) => {
        const userLocation = { latitude: res.latitude, longitude: res.longitude };
        const accuracy = typeof res.accuracy === 'number' ? Math.round(res.accuracy) : 0;
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          scale: 17,
          userLocation,
          locationAccuracy: accuracy ? `约${accuracy}米` : '未知',
          locationHint: accuracy ? `定位精度约${accuracy}米，真机更准确` : '已定位到当前位置',
          locating: false
        }, () => this.loadTrips());
      },
      fail: () => {
        this.setData({ locating: false, locationHint: '定位未授权，当前显示校园默认位置' });
        wx.showModal({
          title: '需要定位权限',
          content: '允许定位后，首页地图会显示你的当前位置。开发者工具常使用模拟定位，建议用真机调试确认精度。',
          confirmText: '去授权',
          success: (res) => {
            if (res.confirm) wx.openSetting({ success: () => this.initUserLocation() });
          }
        });      }
    });
  },

  loadTrips() {
    wx.cloud.callFunction({
      name: 'getCarpoolList',
      env: 'cloud1-d7gk8zo83e93eecad',
      success: (res) => {
        console.log('getCarpoolList 调用成功：', res.result);
        if (res.result && res.result.errCode === 0) {
          const rawTrips = res.result.data || [];
          const trips = rawTrips.filter(isActiveTrip).map(enhanceTrip);
          const displayTrips = this.filterTrips(trips);
          this.setData({
            trips,
            displayTrips,
            stats: this.buildStats(displayTrips),
            markers: this.buildMarkers(displayTrips)
          });
        } else {
          console.warn('getCarpoolList 返回异常，使用本地数据');
          this.loadLocalTrips();
        }
      },
      fail: (err) => {
        console.error('getCarpoolList 调用失败，使用本地数据：', err);
        this.loadLocalTrips();
      }
    });
  },

  loadLocalTrips() {
    const all = wx.getStorageSync('trips') || [];
    const trips = all.filter(isActiveTrip).map(enhanceTrip);
    const displayTrips = this.filterTrips(trips);
    this.setData({
      trips,
      displayTrips,
      stats: this.buildStats(displayTrips),
      markers: this.buildMarkers(displayTrips)
    });
  },

  buildStats(trips) {
    return trips.reduce((acc, item) => {
      acc.todayTrips += 1;
      acc.availableSlots += item.availableSeats;
      if (item.joined >= 2) acc.readyTrips += 1;
      return acc;
    }, { todayTrips: 0, availableSlots: 0, readyTrips: 0 });
  },

  filterTrips(trips) {
    const { keyword, activeFilter } = this.data;
    const today = formatDate(new Date());
    const tomorrow = formatDate(addDays(new Date(), 1));
    return trips.filter(item => {
      const text = `${item.start}${item.end}${item.date}${item.time}${item.meetPoint}${item.publisher}${item.tripSceneText}${item.luggageText}`;
      const keywordOk = !keyword || text.indexOf(keyword) > -1;
      let filterOk = true;
      if (activeFilter === '今天') filterOk = item.date === today;
      if (activeFilter === '明天') filterOk = item.date === tomorrow;
      if (activeFilter === '机场') filterOk = item.end.indexOf('机场') > -1;
      if (activeFilter === '高铁站') filterOk = item.end.indexOf('站') > -1;
      if (activeFilter === '女同学优先') filterOk = item.genderPreference === 'female_only';
      if (activeFilter === '行李友好') filterOk = Number(item.luggageSlots || 0) <= 2;
      return keywordOk && filterOk;
    });
  },

  buildMarkers(trips) {
    const markers = [];
    if (this.data.userLocation) {
      markers.push({
        id: 99,
        latitude: this.data.userLocation.latitude,
        longitude: this.data.userLocation.longitude,
        width: 34,
        height: 34,
        callout: { content: '我的位置', color: '#05A854', fontSize: 12, borderRadius: 8, bgColor: '#FFFFFF', padding: 8, display: 'ALWAYS' }
      });
    } else {
      markers.push({
        id: 0,
        latitude: CAMPUS.latitude,
        longitude: CAMPUS.longitude,
        width: 34,
        height: 34,
        callout: { content: '校园默认点', color: '#05A854', fontSize: 12, borderRadius: 8, bgColor: '#FFFFFF', padding: 8, display: 'ALWAYS' }
      });
    }

    trips.slice(0, 8).forEach((trip, index) => {
      const point = trip.endPoint || PLACE_POINTS[trip.end] || trip.startPoint || PLACE_POINTS[trip.start] || CAMPUS;
      markers.push({
        id: index + 1,
        latitude: point.latitude,
        longitude: point.longitude,
        width: 30,
        height: 30,
        callout: { content: `${trip.end} ${trip.capacityText}`, color: '#1F2D28', fontSize: 11, borderRadius: 8, bgColor: '#FFFFFF', padding: 7, display: 'BYCLICK' }
      });
    });
    return markers;
  },

  onMarkerTap(e) {
    if (e.markerId === 0 || e.markerId === 99) return;
    const selectedTrip = this.data.displayTrips[e.markerId - 1];
    if (!selectedTrip) return;
    this.setData({ selectedTrip });
  },

  focusMyLocation() {
    if (this.data.userLocation) {
      this.setData({ latitude: this.data.userLocation.latitude, longitude: this.data.userLocation.longitude, scale: 17 });
      if (this.mapContext) this.mapContext.moveToLocation();
      return;
    }
    this.initUserLocation();
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, () => this.loadTrips());
  },

  chooseFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.name, selectedTrip: null }, () => this.loadTrips());
  },

  usePlace(e) {
    const name = e.currentTarget.dataset.name;
    const point = PLACE_POINTS[name];
    this.setData({ keyword: name, selectedTrip: null, latitude: point ? point.latitude : CAMPUS.latitude, longitude: point ? point.longitude : CAMPUS.longitude, scale: point ? 11 : 12 }, () => this.loadTrips());
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  }
});
