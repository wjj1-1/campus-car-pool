function parseTripTime(trip) {
  if (!trip || !trip.date || !trip.time) return null;
  const value = `${trip.date} ${trip.time}.replace(/-/g, '/')`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveTrip(item) {
  if (!item || item.status === 'cancelled' || item.status === 'completed') return false;
  const departAt = parseTripTime(item);
  return !departAt || Date.now() < departAt.getTime() + 60 * 60 * 1000;
}

function enhanceOrder(item) {
  const seats = Math.min(Math.max(Number(item.seats || 4), 1), 4);
  const joined = Math.min(Math.max(Number(item.joined || 1), 1), seats);
  const availableSeats = Math.max(seats - joined, 0);
  const isReady = joined >= 2;
  const isFull = availableSeats === 0;
  const luggageSlots = Number(item.luggageSlots || 0);
  const departAt = parseTripTime(item);
  let statusText = '进行中';
  let statusClass = 'active';
  if (item.status === 'cancelled') { statusText = '已取消'; statusClass = 'cancelled'; }
  else if (item.status === 'completed' || (departAt && Date.now() >= departAt.getTime() + 60 * 60 * 1000)) {
    statusText = '已完成'; statusClass = 'completed';
  }
  else if (isFull) { statusText = '已满员'; statusClass = 'full'; }
  else if (isReady) { statusText = '已成行'; statusClass = 'ready'; }

  return Object.assign({}, item, {
    seats,
    joined,
    availableSeats,
    capacityText: isFull ? '已满员' : `剩余${availableSeats}位`,
    statusText,
    statusClass,
    priceText: item.priceText || 'AA后结算',
    modeText: luggageSlots > 2 || item.mode === 'charter' || item.modeText === '包车' ? '大件行李约伴' : '拼车'
  });
}

Page({
  data: {
    loading: true,
    orders: [],
    displayOrders: [],
    activeTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'active', label: '进行中' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ],
    emptyText: ''
  },

  onLoad() {
    this.loadMyOrders();
  },

  onShow() {
    this.loadMyOrders();
  },

  loadMyOrders() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...', mask: true });

    wx.cloud.callFunction({
      name: 'myOrders',
      success: (res) => {
        wx.hideLoading();
        console.log('myOrders 调用成功：', res.result);

        if (res.result && res.result.errCode === 0) {
          const rawOrders = res.result.data || [];
          const orders = rawOrders.map(enhanceOrder);
          this.setData({
            orders,
            loading: false,
            emptyText: orders.length === 0 ? '暂无订单记录' : ''
          }, () => this.filterOrders());
        } else {
          const msg = (res.result && res.result.msg) || '获取订单失败';
          this.setData({ loading: false, emptyText: msg });
          wx.showToast({ title: msg, icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('myOrders 调用失败：', err);
        this.setData({ loading: false, emptyText: '加载失败，请重试' });
        wx.showToast({ title: err.errMsg || '网络异常', icon: 'none' });
      }
    });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.key }, () => this.filterOrders());
  },

  filterOrders() {
    const { activeTab, orders } = this.data;
    let filtered = orders;
    if (activeTab !== 'all') {
      filtered = orders.filter(item => item.statusClass === activeTab);
    }
    this.setData({ displayOrders: filtered });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onPullDownRefresh() {
    this.loadMyOrders();
    wx.stopPullDownRefresh();
  }
});
