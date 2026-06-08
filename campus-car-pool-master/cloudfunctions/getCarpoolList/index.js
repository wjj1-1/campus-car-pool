const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 可按出发地/目的地筛选，这里先查全部
  try {
    const res = await db.collection('carpools')
      .orderBy('createTime', 'desc')
      .get()
    return {
      errCode: 0,
      data: res.data
    }
  } catch (e) {
    return { errCode: -1, msg: e.message }
  }
}