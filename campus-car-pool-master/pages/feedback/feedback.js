// pages/feedback/feedback.js
Page({
  data: {
    feedbackType: '',
    content: '',
    contact: '',
    images: [],
    canSubmit: false,
    feedbackTypes: [
      '功能建议',
      '程序bug',
      '用户体验',
      '内容问题',
      '其他'
    ]
  },
  onLoad(options) {},
  // 类型选择
  onTypeChange(e) {
    const index = e.detail.value;
    this.setData({ feedbackType: this.data.feedbackTypes[index] });
    this.checkCanSubmit();
  },
  // 输入内容
  inputContent(e) {
    this.setData({ content: e.detail.value });
    this.checkCanSubmit();
  },
  // 输入联系方式
  inputContact(e) {
    this.setData({ contact: e.detail.value });
  },
  // 检查是否可以提交
  checkCanSubmit() {
    const { feedbackType, content } = this.data;
    const canSubmit = feedbackType && content && content.length >= 10;
    this.setData({ canSubmit });
  },
  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 3 - this.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          images: this.data.images.concat(tempFilePaths)
        });
      },
      fail: () => {
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },
  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },
  // 提交反馈
  onSubmit() {
    const { feedbackType, content, contact, images } = this.data;
    
    if (!feedbackType) {
      wx.showToast({
        title: '请选择反馈类型',
        icon: 'none'
      });
      return;
    }
    
    if (!content || content.length < 10) {
      wx.showToast({
        title: '请至少输入10个字的反馈内容',
        icon: 'none'
      });
      return;
    }
    
    // 保存反馈信息
    const feedback = {
      id: Date.now(),
      type: feedbackType,
      content,
      contact,
      images,
      status: 'pending',
      submitTime: new Date().getTime()
    };
    
    // 保存到本地历史
    const feedbackList = wx.getStorageSync('feedbackList') || [];
    feedbackList.unshift(feedback);
    wx.setStorageSync('feedbackList', feedbackList);
    
    wx.showModal({
      title: '提交成功',
      content: '感谢您的反馈，我们会尽快处理',
      showCancel: false,
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  }
})