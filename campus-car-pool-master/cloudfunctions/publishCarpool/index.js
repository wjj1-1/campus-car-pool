const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const {
    start, end, date, time, meetPoint,
    contact, seats, remark,
    genderPreference, genderPreferenceText,
    tripScene, tripSceneText,
    luggageLevel, luggageText, luggageSlots,
    mode, modeText,
    publisher, publisherGender, publisherGenderText,
    publisherIdentity, publisherIdentityText,
    publisherCreditScore,
    startPoint, endPoint
  } = event

  try {
    const res = await db.collection('carpools').add({
      data: {
        openid: OPENID,
        start, end, date, time, meetPoint,
        contact, seats, remark,
        genderPreference, genderPreferenceText,
        tripScene, tripSceneText,
        luggageLevel, luggageText, luggageSlots: Number(luggageSlots) || 0,
        mode: mode || 'carpool',
        modeText: modeText || '拼车',
        joined: 1,
        memberIds: [OPENID],
        status: 'open',
        publisher: publisher || '校园用户',
        publisherGender: publisherGender || '',
        publisherGenderText: publisherGenderText || '',
        publisherIdentity: publisherIdentity || '',
        publisherIdentityText: publisherIdentityText || '',
        publisherCreditScore: Number(publisherCreditScore) || 100,
        price: 0,
        priceText: 'AA后结算',
        startPoint: startPoint || null,
        endPoint: endPoint || null,
        createTime: db.serverDate(),
        createTimeStamp: Date.now()
      }
    })
    return { errCode: 0, msg: '发布成功', data: { _id: res._id } }
  } catch (e) {
    return { errCode: -1, msg: e.message || '发布失败' }
  }
}
