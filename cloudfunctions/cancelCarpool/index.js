const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { tripId, action } = event

  if (!tripId) return { errCode: -1, msg: '缺少行程ID' }
  if (!action || !['cancelPublish', 'leave'].includes(action)) return { errCode: -1, msg: '操作类型无效' }

  try {
    const tripRes = await db.collection('carpools').doc(tripId).get()
    if (!tripRes.data) return { errCode: -1, msg: '行程不存在' }

    const trip = tripRes.data

    if (action === 'cancelPublish') {
      // 取消发布（仅发布者可操作）
      if (trip.openid !== OPENID) return { errCode: -1, msg: '只有发布者才能取消' }
      if (trip.status !== 'open') return { errCode: -1, msg: '当前状态不可取消' }

      await db.collection('carpools').doc(tripId).update({
        data: {
          status: 'cancelled',
          cancelReason: 'user_cancelled',
          cancelledAt: new Date()
        }
      })
      return { errCode: 0, msg: '已取消' }
    }

    if (action === 'leave') {
      // 退出已加入的拼车
      if (trip.openid === OPENID) return { errCode: -1, msg: '发布者不能退出，请使用取消功能' }
      if (trip.status !== 'open') return { errCode: -1, msg: '当前状态不可退出' }

      const memberIds = trip.memberIds || []
      if (memberIds.indexOf(OPENID) === -1) return { errCode: -1, msg: '你未加入此拼车' }

      const newJoined = Math.max((trip.joined || 1) - 1, 1)
      await db.collection('carpools').doc(tripId).update({
        data: {
          joined: Math.max(newJoined, 1),
          memberIds: db.command.pull([OPENID])
        }
      })
      return { errCode: 0, msg: '已退出' }
    }

    return { errCode: -1, msg: '未知操作' }
  } catch (e) {
    return { errCode: -1, msg: e.message || '操作失败' }
  }
}
