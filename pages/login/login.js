Page({
  data: {
    nickname: '',
    phone: '',
    school: '中南财经政法大学',
    genderIndex: 0,
    identityIndex: 0,
    genders: ['女', '男'],
    genderValues: ['female', 'male'],
    identities: ['学生', '教师'],
    identityValues: ['student', 'teacher'],
    agreed: true,
    redirect: ''
  },

  onLoad(options) {
    this.setData({ redirect: options.redirect || '' });
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.isLoggedIn) {
      this.setData({
        nickname: userInfo.nickname || '',
        phone: userInfo.phone || '',
        school: userInfo.school || '中南财经政法大学',
        genderIndex: userInfo.gender === 'male' ? 1 : 0,
        identityIndex: userInfo.identity === 'teacher' ? 1 : 0
      });
    }
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },

  onGenderChange(e) {
    this.setData({ genderIndex: Number(e.detail.value) });
  },

  onIdentityChange(e) {
    this.setData({ identityIndex: Number(e.detail.value) });
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  submitLogin() {
    const nickname = this.data.nickname.trim();
    const phone = this.data.phone.trim();
    const school = this.data.school.trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (!school) {
      wx.showToast({ title: '请输入学校', icon: 'none' });
      return;
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意服务规则', icon: 'none' });
      return;
    }

    const gender = this.data.genderValues[this.data.genderIndex];
    const identity = this.data.identityValues[this.data.identityIndex];
    const userInfo = {
      isLoggedIn: true,
      userId: `U${Date.now()}`,
      nickname,
      phone,
      school,
      gender,
      genderText: this.data.genders[this.data.genderIndex],
      identity,
      identityText: this.data.identities[this.data.identityIndex],
      verified: false,
      verifiedType: '',
      verifiedDetail: null,
      authStatus: '',
      creditScore: 100,
      phoneBound: true
    };
    wx.setStorageSync('userInfo', userInfo);
    wx.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => {
      if (!this.data.redirect) {
        wx.switchTab({ url: '/pages/mine/mine' });
        return;
      }
      const target = decodeURIComponent(this.data.redirect);
      const tabPages = ['/pages/index/index', '/pages/publish/publish', '/pages/trips/trips', '/pages/messages/messages', '/pages/mine/mine'];
      if (tabPages.indexOf(target) > -1) {
        wx.switchTab({ url: target });
        return;
      }
      wx.redirectTo({
        url: target,
        fail: () => wx.switchTab({ url: '/pages/mine/mine' })
      });
    }, 500);
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
