Page({
  data: {
    saved: false,
    roleIndex: 0,
    roles: ['学生', '教师'],
    roleValues: ['student', 'teacher'],
    name: '',
    school: '',
    idNumber: '',
    department: '',
    title: ''
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },

  onRoleChange(e) {
    this.setData({ roleIndex: Number(e.detail.value) });
  },

  submit() {
    const currentUser = wx.getStorageSync('userInfo') || {};
    if (!currentUser.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/auth/auth') });
      return;
    }
    const { roleValues, roleIndex, name, school, idNumber, department, title } = this.data;
    if (!name.trim() || !school.trim() || !idNumber.trim()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    const current = currentUser;
    const identity = roleValues[roleIndex];
    const detail = identity === 'student'
      ? { studentName: name.trim(), school: school.trim(), studentId: idNumber.trim() }
      : { teacherName: name.trim(), school: school.trim(), department: department.trim(), title: title.trim(), employeeId: idNumber.trim() };
    const application = {
      id: `A${Date.now()}`,
      userId: current.userId || 'local-user',
      identity,
      identityText: this.data.roles[roleIndex],
      name: name.trim(),
      school: school.trim(),
      detail,
      status: 'pending',
      statusText: '待审核',
      submittedAt: Date.now(),
      time: new Date().toLocaleString()
    };
    const applications = wx.getStorageSync('authApplications') || [];
    applications.unshift(application);
    wx.setStorageSync('authApplications', applications);

    const userInfo = Object.assign({}, current, {
      nickname: name.trim(),
      school: school.trim(),
      identity,
      identityText: this.data.roles[roleIndex],
      verified: false,
      verifiedType: '',
      verifiedDetail: null,
      authStatus: 'pending',
      authStatusText: '待审核',
      pendingAuthId: application.id,
      pendingAuthDetail: detail
    });
    wx.setStorageSync('userInfo', userInfo);
    this.setData({ saved: true });
    wx.showToast({ title: '已提交审核', icon: 'success' });
  }
});