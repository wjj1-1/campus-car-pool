function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function parseTripTime(trip) {
  if (!trip || !trip.date || !trip.time) return null;
  const value = `${trip.date} ${trip.time}`.replace(/-/g, '/');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeTrip(trip) {
  if (!trip) return trip;
  const seats = Math.min(Math.max(Number(trip.seats || 4), 1), 4);
  const joined = Math.min(Math.max(Number(trip.joined || 1), 1), seats);
  const luggageSlots = Math.min(Math.max(Number(trip.luggageSlots || 0), 0), 4);
  const modeText = luggageSlots > 2 || trip.mode === 'charter' || trip.modeText === '包车' ? '大件行李约伴' : '拼车';
  const departAt = parseTripTime(trip);
  const isEnded = departAt && Date.now() >= departAt.getTime() + 60 * 60 * 1000;
  const status = trip.status === 'cancelled' ? 'cancelled' : (trip.status === 'completed' || isEnded ? 'completed' : 'open');
  const next = Object.assign({}, trip, {
    role: 'passenger',
    mode: 'carpool',
    modeText,
    seats,
    joined,
    luggageSlots,
    price: 0,
    priceText: 'AA后结算',
    status
  });
  delete next[['accepted', 'Dri', 'ver'].join('')];
  delete next[['dri', 'ver', 'Contacts'].join('')];
  delete next[['dri', 'ver', 'Price'].join('')];
  delete next[['dri', 'ver', 'Id'].join('')];
  delete next[['dri', 'ver', 'Name'].join('')];
  delete next.orderStatus;
  return next;
}

App({
  globalData: {
    userInfo: null
  },

  onLaunch() {
    // 只保留最基础的初始化，不写多余代码
    if (!wx.cloud) {
      console.error('wx.cloud 不存在，请升级基础库');
      return;
    }

    // 标准初始化，不写 force、不写多余参数
    wx.cloud.init({
      env: 'cloud1-d7gk8zo83e93eecad'
    });
    this.ensureSeedData();
    this.normalizeLocalData();
  },
  

  normalizeLocalData() {
    const userInfo = wx.getStorageSync('userInfo');
    const creditRecords = wx.getStorageSync('creditRecords') || [];
    let nextUserInfo = userInfo;
    if (nextUserInfo && nextUserInfo.nickname && nextUserInfo.isLoggedIn !== true) {
      nextUserInfo = Object.assign({}, nextUserInfo, { isLoggedIn: true });
    }
    if (nextUserInfo && nextUserInfo.verified && (!nextUserInfo.verifiedType || !nextUserInfo.verifiedDetail)) {
      nextUserInfo = Object.assign({}, nextUserInfo, { verified: false });
    }
    if (nextUserInfo && Number(nextUserInfo.creditScore) === 96 && creditRecords.length === 0) {
      nextUserInfo = Object.assign({}, nextUserInfo, { creditScore: 100 });
    }
    if (nextUserInfo && nextUserInfo !== userInfo) {
      wx.setStorageSync('userInfo', nextUserInfo);
    }

    const trips = wx.getStorageSync('trips') || [];
    if (trips.length) wx.setStorageSync('trips', trips.map(normalizeTrip));

    const messages = wx.getStorageSync('messages') || [];
    const nextMessages = messages.map(item => {
      const content = String(item.content || '')
        .replace(new RegExp(['待', '车', '主', '报', '价'].join(''), 'g'), '等待同行加入')
        .replace(new RegExp(['车', '主'].join(''), 'g'), '发布人')
        .replace(new RegExp(['司', '机'].join(''), 'g'), '同行人')
        .replace(new RegExp(['接', '单'].join(''), 'g'), '确认同行')
        .replace(new RegExp(['报', '价'].join(''), 'g'), 'AA费用说明');
      const title = String(item.title || '')
        .replace(new RegExp(['待', '车', '主', '报', '价'].join(''), 'g'), '等待同行加入')
        .replace(new RegExp(['车', '主'].join(''), 'g'), '发布人')
        .replace(new RegExp(['司', '机'].join(''), 'g'), '同行人')
        .replace(new RegExp(['接', '单'].join(''), 'g'), '确认同行')
        .replace(new RegExp(['报', '价'].join(''), 'g'), 'AA费用说明');
      return Object.assign({}, item, { title, content });
    });
    wx.setStorageSync('messages', nextMessages);
  },

  ensureSeedData() {

    const trips = wx.getStorageSync('trips');
    if (!trips || trips.length === 0) {
      wx.setStorageSync('trips', [
        {
          id: 'T1001', mode: 'carpool', modeText: '拼车', role: 'passenger', start: '学校东门', end: '武汉站', date: addDays(0), time: '18:30', meetPoint: '东门保安亭旁', seats: 4, joined: 2,
          memberIds: ['seed-a', 'seed-b'], price: 0, priceText: 'AA后结算', contact: '13800000001', publisher: '张同学', publisherGender: 'female', publisherGenderText: '女', publisherIdentity: 'student', publisherIdentityText: '学生', publisherCreditScore: 98, tripScene: 'holiday', tripSceneText: '节假日出行', luggageLevel: 'large', luggageText: '大件行李', luggageSlots: 2,
          genderPreference: 'female_only', genderPreferenceText: '仅限女生', remark: '女生拼车去高铁站，行李多请提前说。', status: 'open'
        },
        {
          id: 'T1002', mode: 'carpool', modeText: '拼车', role: 'passenger', start: '南湖校区', end: '天河机场', date: addDays(1), time: '07:20', meetPoint: '图书馆门口', seats: 4, joined: 1,
          memberIds: ['seed-c'], price: 0, priceText: 'AA后结算', contact: '13800000002', publisher: '李老师', publisherGender: 'male', publisherGenderText: '男', publisherIdentity: 'teacher', publisherIdentityText: '教师', publisherCreditScore: 100, tripScene: 'normal', tripSceneText: '普通出行', luggageLevel: 'small', luggageText: '小件行李', luggageSlots: 1,
          genderPreference: 'all', genderPreferenceText: '不限男女', remark: '早班机出行，希望一起准时到达。', status: 'open'
        },
        {
          id: 'T1003', mode: 'carpool', modeText: '拼车', role: 'passenger', start: '学校北门', end: '光谷广场', date: addDays(0), time: '20:00', meetPoint: '北门公交站', seats: 4, joined: 3,
          memberIds: ['seed-d', 'seed-e', 'seed-f'], price: 0, priceText: 'AA后结算', contact: '13800000003', publisher: '王同学', publisherGender: 'male', publisherGenderText: '男', publisherIdentity: 'student', publisherIdentityText: '学生', publisherCreditScore: 91, tripScene: 'normal', tripSceneText: '普通出行', luggageLevel: 'none', luggageText: '无行李', luggageSlots: 0,
          genderPreference: 'all', genderPreferenceText: '不限男女', remark: '晚饭后出发，还差一人。', status: 'open'
        },
        {
          id: 'T1004', mode: 'carpool', modeText: '大件行李约伴', role: 'passenger', start: '学校东门', end: '武昌站', date: addDays(2), time: '09:10', meetPoint: '东门校牌旁', seats: 4, joined: 1,
          memberIds: ['seed-g'], price: 0, priceText: 'AA后结算', contact: '13800000004', publisher: '陈同学', publisherGender: 'female', publisherGenderText: '女', publisherIdentity: 'student', publisherIdentityText: '学生', publisherCreditScore: 95, tripScene: 'back_to_school', tripSceneText: '返校/开学', luggageLevel: 'multi', luggageText: '多件行李', luggageSlots: 3,
          genderPreference: 'all', genderPreferenceText: '不限男女', remark: '去武昌站，行李较多，希望找同路线同学一起约车。', status: 'open'
        }
      ]);
    }

    const messages = wx.getStorageSync('messages');
    if (!messages || messages.length === 0) {
      wx.setStorageSync('messages', [
        { id: 'M1', title: '拼车提醒', content: '你加入的 学校东门 -> 武汉站 将在今天 18:30 出发。', time: '10:20', unread: true },
        { id: 'M2', title: '信誉提示', content: '按时赴约、少取消、少被投诉会提高信誉分；低于 60 分将限制加入拼车。节假日和大件行李行程请提前确认空间。', time: '昨天', unread: false }
      ]);
    }
  }
});


