Page({
  data: {
    genderIndex: 0,
    genders: ['女', '男'],
    genderValues: ['female', 'male'],
    identityIndex: 0,
    identities: ['学生', '教师'],
    identityValues: ['student', 'teacher'],
    preferenceIndex: 0,
    preferences: ['不限男女', '仅限女生', '仅限男生'],
    preferenceValues: ['all', 'female_only', 'male_only'],
    sceneIndex: 0,
    scenes: ['普通出行', '节假日出行', '返校/开学', '考试周', '晚间出行'],
    sceneValues: ['normal', 'holiday', 'back_to_school', 'exam_week', 'night'],
    seatIndex: 3,
    seatOptions: ['1人', '2人', '3人', '4人'],
    seatValues: [1, 2, 3, 4],
    luggageIndex: -1,
    luggageOptions: ['无行李', '小件行李', '大件行李', '多件行李'],
    luggageValues: ['none', 'small', 'large', 'multi'],
    luggageSlots: '',
    rideMode: '拼车',
    rideModeDesc: '适合普通同学同行拼车，费用默认AA后结算',
    luggageTextDisplay: '请选择',
    start: '',
    end: '',
    date: '2026-05-26',
    time: '18:00',
    meetPoint: '',
    contact: '',
    remark: '',
    startPoint: null,
    endPoint: null
  },

  // 发布按钮点击事件
  async doPublish() {
    wx.showLoading({ title: '发布中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: "publishCarpool",
        data: {
          start: "学校东门",
          end: "武汉站",
          time: "2025-05-30 18:30",
          price: 15,
          seats: 3,
          contact: "13800138000"
        }
      })

      console.log("发布成功", res.result)
      wx.hideLoading()
      wx.showToast({ title: "发布成功" })
    } catch (err) {
      console.error("发布失败", err)
      wx.hideLoading()
    }
  },

  onGenderChange(e) { this.setData({ genderIndex: Number(e.detail.value) }); },
  onIdentityChange(e) { this.setData({ identityIndex: Number(e.detail.value) }); },
  onPreferenceChange(e) { this.setData({ preferenceIndex: Number(e.detail.value) }); },
  onSceneChange(e) { this.setData({ sceneIndex: Number(e.detail.value) }, () => this.updateRideMode()); },
  onSeatChange(e) { this.setData({ seatIndex: Number(e.detail.value) }); },
  onLuggageChange(e) { const index = Number(e.detail.value); this.setData({ luggageIndex: index, luggageTextDisplay: this.data.luggageOptions[index] }, () => this.updateRideMode()); },
  onInput(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },
  onDateChange(e) { this.setData({ date: e.detail.value }); },
  onTimeChange(e) { this.setData({ time: e.detail.value }); },
  onLuggageSlotsInput(e) { this.setData({ luggageSlots: e.detail.value }, () => this.updateRideMode()); },

  isVerifiedUser(userInfo) {
    return !!(userInfo && userInfo.verified && userInfo.verifiedType && userInfo.verifiedDetail);
  },

  ensureVerified() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    if (!userInfo.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/publish/publish') });
      return false;
    }
    if (this.isVerifiedUser(userInfo)) return true;
    if (userInfo.authStatus === 'pending') {
      wx.showToast({ title: '身份认证待审核', icon: 'none' });
      return false;
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
      return false;
    }
    wx.showModal({
      title: '需要身份认证',
      content: '发布拼车前请先完成身份认证，学生和教师都需要认证后才能使用拼车功能。',
      confirmText: '去认证',
      success: (res) => {
        if (res.confirm) wx.navigateTo({ url: '/pages/auth/auth' });
      }
    });
    return false;
  },

  updateRideMode() {
    const slots = Number(this.data.luggageSlots || 0);
    const luggageValue = this.data.luggageValues[this.data.luggageIndex];
    const sceneValue = this.data.sceneValues[this.data.sceneIndex];
    const shouldSpecial = slots > 2 || luggageValue === 'multi';
    const isPeak = sceneValue === 'holiday' || sceneValue === 'back_to_school';
    let rideMode = '拼车';
    let rideModeDesc = '适合普通同学同行拼车，费用默认AA后结算';
    if (shouldSpecial) {
      rideMode = '大件行李约伴';
      rideModeDesc = '行李占位较多，建议找同路线同学一起单独约车';
    } else if (isPeak) {
      rideMode = '高峰拼车';
      rideModeDesc = '节假日或返校高峰，建议提前确认集合点和行李空间';
    }
    this.setData({ rideMode, rideModeDesc });
  },

  chooseLocation(e) {
    const type = e.currentTarget.dataset.type;
    wx.chooseLocation({
      success: (res) => {
        const name = res.name || res.address;
        if (type === 'start') this.setData({ start: name, startPoint: { latitude: res.latitude, longitude: res.longitude } });
        else this.setData({ end: name, endPoint: { latitude: res.latitude, longitude: res.longitude } });
      },
      fail: () => wx.showToast({ title: '未选择位置', icon: 'none' })
    });
  },

  validateForm() {
    const { start, end, meetPoint, contact, luggageIndex, luggageSlots } = this.data;
    if (!start || !end || !meetPoint || !contact) return '请补全必填信息';
    if (!/^1\d{10}$/.test(contact)) return '请输入正确手机号';
    if (luggageIndex < 0) return '请选择行李情况';
    if (luggageSlots === '' || Number(luggageSlots) < 0) return '请输入行李占位';
    if (Number(luggageSlots) > 4) return '行李占位最多为4个';
    return '';
  },

  submit() {
    if (!this.ensureVerified()) return;
    const error = this.validateForm();
    if (error) { wx.showToast({ title: error, icon: 'none' }); return; }
    this.saveTrip();
  },

  saveTrip() {
    const { start, end, date, time, meetPoint, contact, remark, startPoint, endPoint, genderIndex, identityIndex, preferenceIndex, sceneIndex, seatIndex, luggageIndex, luggageSlots } = this.data;
    const userInfo = wx.getStorageSync('userInfo') || { nickname: '校园用户', userId: 'local-user', creditScore: 100 };
    const gender = this.data.genderValues[genderIndex];
    const identity = this.data.identityValues[identityIndex];
    const preference = this.data.preferenceValues[preferenceIndex];
    const seats = this.data.seatValues[seatIndex];
    wx.setStorageSync('userInfo', Object.assign({}, userInfo, { gender, genderText: this.data.genders[genderIndex], identity, identityText: this.data.identities[identityIndex] }));

    wx.showLoading({ title: '发布中...', mask: true });

    wx.cloud.callFunction({
      name: 'publishCarpool',
      data: {
        start, end, date, time, meetPoint,
        contact, seats, remark,
        startPoint, endPoint,
        genderPreference: preference,
        genderPreferenceText: this.data.preferences[preferenceIndex],
        tripScene: this.data.sceneValues[sceneIndex],
        tripSceneText: this.data.scenes[sceneIndex],
        luggageLevel: this.data.luggageValues[luggageIndex],
        luggageText: this.data.luggageOptions[luggageIndex],
        luggageSlots: Number(luggageSlots),
        mode: 'carpool',
        modeText: this.data.rideMode,
        publisher: userInfo.nickname || '校园用户',
        publisherGender: gender,
        publisherGenderText: this.data.genders[genderIndex],
        publisherIdentity: identity,
        publisherIdentityText: this.data.identities[identityIndex],
        publisherCreditScore: userInfo.creditScore || 100
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.errCode === 0) {
          console.log('发布成功：', res.result);
          // 同步更新本地数据（用于离线兜底）
          const trips = wx.getStorageSync('trips') || [];
          const trip = {
            id: `T${Date.now()}`,
            mode: 'carpool',
            modeText: this.data.rideMode,
            role: 'passenger',
            start, end, date, time, meetPoint,
            seats,
            joined: 1,
            memberIds: [userInfo.userId || 'local-user'],
            price: 0,
            priceText: 'AA后结算',
            contact,
            publisher: userInfo.nickname || '校园用户',
            publisherGender: gender,
            publisherGenderText: this.data.genders[genderIndex],
            publisherIdentity: identity,
            publisherIdentityText: this.data.identities[identityIndex],
            publisherCreditScore: userInfo.creditScore || 100,
            genderPreference: preference,
            genderPreferenceText: this.data.preferences[preferenceIndex],
            tripScene: this.data.sceneValues[sceneIndex],
            tripSceneText: this.data.scenes[sceneIndex],
            luggageLevel: this.data.luggageValues[luggageIndex],
            luggageText: this.data.luggageOptions[luggageIndex],
            luggageSlots: Number(luggageSlots),
            remark,
            startPoint,
            endPoint,
            status: 'open'
          };
          trips.unshift(trip);
          wx.setStorageSync('trips', trips);
          const mine = wx.getStorageSync('myPublishedTrips') || [];
          mine.unshift(trip.id);
          wx.setStorageSync('myPublishedTrips', mine);
          const messages = wx.getStorageSync('messages') || [];
          messages.unshift({ id: `M${Date.now()}`, tripId: trip.id, title: '发布成功', content: `你发布的 ${start} -> ${end} 已进入拼车大厅，费用默认AA后结算。`, time: '刚刚', unread: true });
          wx.setStorageSync('messages', messages);

          wx.showToast({ title: '发布成功', icon: 'success' });
          setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }); }, 600);
        } else {
          const msg = (res.result && res.result.msg) || '发布失败';
          wx.showToast({ title: msg, icon: 'none' });
          // 云端失败时回退到本地存储
          console.warn('云端发布失败，回退到本地存储');
          this.saveTripLocal(start, end, date, time, meetPoint, contact, remark, startPoint, endPoint, genderIndex, identityIndex, preferenceIndex, sceneIndex, seatIndex, luggageIndex, luggageSlots, userInfo);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('publishCarpool 调用失败，使用本地存储：', err);
        wx.showToast({ title: '已保存到本地', icon: 'none' });
        this.saveTripLocal(start, end, date, time, meetPoint, contact, remark, startPoint, endPoint, genderIndex, identityIndex, preferenceIndex, sceneIndex, seatIndex, luggageIndex, luggageSlots, userInfo);
      }
    });
  },

  saveTripLocal(start, end, date, time, meetPoint, contact, remark, startPoint, endPoint, genderIndex, identityIndex, preferenceIndex, sceneIndex, seatIndex, luggageIndex, luggageSlots, userInfo) {
    const seats = this.data.seatValues[seatIndex];
    const trips = wx.getStorageSync('trips') || [];
    const trip = {
      id: `T${Date.now()}`,
      mode: 'carpool',
      modeText: this.data.rideMode,
      role: 'passenger',
      start, end, date, time, meetPoint,
      seats,
      joined: 1,
      memberIds: [userInfo.userId || 'local-user'],
      price: 0,
      priceText: 'AA后结算',
      contact,
      publisher: userInfo.nickname || '校园用户',
      publisherGender: this.data.genderValues[genderIndex],
      publisherGenderText: this.data.genders[genderIndex],
      publisherIdentity: this.data.identityValues[identityIndex],
      publisherIdentityText: this.data.identities[identityIndex],
      publisherCreditScore: userInfo.creditScore || 100,
      genderPreference: this.data.preferenceValues[preferenceIndex],
      genderPreferenceText: this.data.preferences[preferenceIndex],
      tripScene: this.data.sceneValues[sceneIndex],
      tripSceneText: this.data.scenes[sceneIndex],
      luggageLevel: this.data.luggageValues[luggageIndex],
      luggageText: this.data.luggageOptions[luggageIndex],
      luggageSlots: Number(luggageSlots),
      remark,
      startPoint,
      endPoint,
      status: 'open'
    };
    trips.unshift(trip);
    wx.setStorageSync('trips', trips);
    const mine = wx.getStorageSync('myPublishedTrips') || [];
    mine.unshift(trip.id);
    wx.setStorageSync('myPublishedTrips', mine);
    wx.showToast({ title: '已保存到本地', icon: 'success' });
    setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }); }, 600);
  }
});