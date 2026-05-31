// pages/address/address.js
Page({
  data: {
    addressList: [],
    showAddressModal: false,
    isEdit: false,
    currentEditId: null,
    currentTag: '',
    formData: {
      name: '',
      building: '',
      room: '',
      description: ''
    },
    tags: ['家', '学校', '公司', '其他'],
    tagValues: ['home', 'school', 'company', 'other']
  },
  onLoad(options) {
    this.loadAddresses();
  },
  onShow() {
    this.loadAddresses();
  },
  // 加载地址列表
  loadAddresses() {
    const addressList = wx.getStorageSync('addressList') || [];
    this.setData({ addressList });
  },
  // 添加地址
  addAddress() {
    this.setData({
      showAddressModal: true,
      isEdit: false,
      currentEditId: null,
      currentTag: '',
      formData: {
        name: '',
        building: '',
        room: '',
        description: ''
      }
    });
  },
  // 编辑地址
  editAddress(e) {
    const id = e.currentTarget.dataset.id;
    const address = this.data.addressList.find(item => item.id === id);
    
    if (address) {
      this.setData({
        showAddressModal: true,
        isEdit: true,
        currentEditId: id,
        currentTag: address.tagText,
        formData: {
          name: address.name,
          building: address.building || '',
          room: address.room || '',
          description: address.description || ''
        }
      });
    }
  },
  // 隐藏弹窗
  hideModal() {
    this.setData({ showAddressModal: false });
  },
  // 阻止事件冒泡
  stopPropagation() {
    return;
  },
  // 标签选择
  onTagChange(e) {
    const index = e.detail.value;
    this.setData({ currentTag: this.data.tags[index] });
  },
  // 输入处理
  inputName(e) {
    this.setData({ 'formData.name': e.detail.value });
  },
  inputBuilding(e) {
    this.setData({ 'formData.building': e.detail.value });
  },
  inputRoom(e) {
    this.setData({ 'formData.room': e.detail.value });
  },
  inputDescription(e) {
    this.setData({ 'formData.description': e.detail.value });
  },
  // 确认地址
  confirmAddress() {
    const { currentTag, formData, isEdit, currentEditId } = this.data;
    
    if (!currentTag) {
      wx.showToast({
        title: '请选择标签',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.name) {
      wx.showToast({
        title: '请输入地址名称',
        icon: 'none'
      });
      return;
    }
    
    const tagIndex = this.data.tags.indexOf(currentTag);
    const newAddress = {
      id: isEdit ? currentEditId : Date.now(),
      tag: this.data.tagValues[tagIndex],
      tagText: currentTag,
      name: formData.name,
      building: formData.building,
      room: formData.room,
      description: formData.description,
      isDefault: isEdit ? 
        (this.data.addressList.find(item => item.id === currentEditId)?.isDefault || false) : 
        (this.data.addressList.length === 0)
    };
    
    let addressList = [...this.data.addressList];
    
    if (isEdit) {
      // 编辑模式
      const index = addressList.findIndex(item => item.id === currentEditId);
      if (index !== -1) {
        addressList[index] = newAddress;
      }
    } else {
      // 添加模式
      addressList.push(newAddress);
    }
    
    wx.setStorageSync('addressList', addressList);
    this.setData({ addressList, showAddressModal: false });
    
    wx.showToast({
      title: isEdit ? '修改成功' : '添加成功',
      icon: 'success'
    });
  },
  // 设为默认
  setDefault(e) {
    const id = e.currentTarget.dataset.id;
    let addressList = this.data.addressList.map(item => ({
      ...item,
      isDefault: item.id === id
    }));
    
    wx.setStorageSync('addressList', addressList);
    this.setData({ addressList });
    
    wx.showToast({
      title: '设置成功',
      icon: 'success'
    });
  },
  // 删除地址
  deleteAddress(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          let addressList = this.data.addressList.filter(item => item.id !== id);
          
          // 如果删除的是默认地址，将第一个设为默认
          if (addressList.length > 0 && !addressList.some(item => item.isDefault)) {
            addressList[0].isDefault = true;
          }
          
          wx.setStorageSync('addressList', addressList);
          this.setData({ addressList });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }
})