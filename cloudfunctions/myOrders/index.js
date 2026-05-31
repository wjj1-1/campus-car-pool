const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const res = await db.collection('carpools')
      .where({ openid: OPENID })
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