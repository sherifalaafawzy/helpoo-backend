const AppError = require('../utils/AppError');
const notification = require('./FcmFunctions');

class Fcm {
  async notifyMessage(data) {
    try {
      if (!data.token || !data.title || !data.body) {
        return new AppError('Provide Us token , title and body', 400);
      }
      notification.sendNotificationWithData(
        data.token,
        data.title,
        data.body,
        data.id,
        data.type,
        data.key
      );
      return 'ok';
    } catch (err) {
      return new AppError(err.message, 500);
    }
  }
}

const fcmService = new Fcm();
module.exports = fcmService;
