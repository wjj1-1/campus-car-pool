// pages/settings/settings.js
Page({
  data: {
    userInfo: {
      avatar: '/images/default-avatar.png',
      nickname: '未登录',
      userId: '',
      gender: '',
      genderText: '未设置',
      signature: '',
      phone: ''
    },
    genders: ['男', '女', '未设置']
  },
  onLoad(options) {
    this.loadUserInfo();
  },
  onShow() {
    this.loadUserInfo();
  },
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const genderText = this.getGenderText(userInfo.gender);
    
    // 生成用户ID（如果不存在）
    if (!userInfo.userId) {
      userInfo.userId = 'U' + Date.now().toString().slice(-8);
      wx.setStorageSync('userInfo', userInfo);
    }
    
    this.setData({
      userInfo: {
        ...userInfo,
        genderText: genderText
      }
    });
  },
  getGenderText(gender) {
    const genderMap = {
      1: '男',
      2: '女'
    };
    return genderMap[gender] || '未设置';
  },
  // 修改头像
  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.avatar = tempFilePath;
        wx.setStorageSync('userInfo', userInfo);
        this.setData({ 'userInfo.avatar': tempFilePath });
        wx.showToast({
          title: '头像修改成功',
          icon: 'success'
        });
      }
    });
  },
  // 修改昵称
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.userInfo.nickname === '未登录' ? '' : this.data.userInfo.nickname,
      success: (res) => {
        if (res.confirm && res.content) {
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.nickname = res.content;
          wx.setStorageSync('userInfo', userInfo);
          this.setData({ 'userInfo.nickname': res.content });
          wx.showToast({
            title: '修改成功',
            icon: 'success'
          });
        }
      }
    });
  },
  // 修改性别
  onGenderChange(e) {
    const index = e.detail.value;
    const genderMap = { 0: 1, 1: 2, 2: 0 };
    const gender = genderMap[index];
    const genderText = this.data.genders[index];
    
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.gender = gender;
    wx.setStorageSync('userInfo', userInfo);
    
    this.setData({
      'userInfo.gender': gender,
      'userInfo.genderText': genderText
    });
    
    wx.showToast({
      title: '修改成功',
      icon: 'success'
    });
  },
  // 修改个性签名
  editSignature() {
    wx.showModal({
      title: '修改个性签名',
      editable: true,
      placeholderText: '请输入个性签名',
      content: this.data.userInfo.signature || '',
      success: (res) => {
        if (res.confirm) {
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.signature = res.content || '';
          wx.setStorageSync('userInfo', userInfo);
          this.setData({ 'userInfo.signature': res.content || '' });
          wx.showToast({
            title: '修改成功',
            icon: 'success'
          });
        }
      }
    });
  },
  // 修改联系电话
  editPhone() {
    wx.showModal({
      title: '修改联系电话',
      editable: true,
      placeholderText: '请输入手机号',
      content: this.data.userInfo.phone || '',
      success: (res) => {
        if (res.confirm && res.content) {
          if (!/^1\d{10}$/.test(res.content)) {
            wx.showToast({
              title: '请输入正确的手机号',
              icon: 'none'
            });
            return;
          }
          
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.phone = res.content;
          wx.setStorageSync('userInfo', userInfo);
          this.setData({ 'userInfo.phone': res.content });
          wx.showToast({
            title: '修改成功',
            icon: 'success'
          });
        }
      }
    });
  }
})