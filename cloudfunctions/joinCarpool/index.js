const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { tripId } = event

  if (!tripId) return { errCode: -1, msg: '缺少行程ID' }

  try {
    const tripRes = await db.collection('carpools').doc(tripId).get()
    if (!tripRes.data) return { errCode: -1, msg: '行程不存在' }

    const trip = tripRes.data
    if (trip.status !== 'open') return { errCode: -1, msg: '该行程当前不可加入' }
    if ((trip.joined || 1) >= (trip.seats || 4)) return { errCode: -1, msg: '已满员' }
    if (trip.openid === OPENID) return { errCode: -1, msg: '不能加入自己发布的拼车' }

    const memberIds = trip.memberIds || []
    if (memberIds.indexOf(OPENID) > -1) return { errCode: -1, msg: '已经加入过' }

    await db.collection('carpools').doc(tripId).update({
      data: {
        joined: _.inc(1),
        memberIds: _.push([OPENID])
      }
    })

    return { errCode: 0, msg: '加入成功' }
  } catch (e) {
    return { errCode: -1, msg: e.message || '加入失败' }
  }
}
