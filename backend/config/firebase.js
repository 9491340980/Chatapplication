const admin = require('firebase-admin');
const path = require('path');

let firebaseInitialized = false;

const initFirebase = () => {
  if (firebaseInitialized) return;
  try {
    const serviceAccount = require(path.join(__dirname, '../firebase-admin.json'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
    console.log('Firebase Admin initialized');
  } catch (err) {
    console.error('Firebase Admin init failed:', err.message);
  }
};

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken || !firebaseInitialized) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      }
    });
    console.log('Push notification sent to:', fcmToken.substring(0, 20) + '...');
  } catch (err) {
    console.error('Push notification failed:', err.message);
  }
};

module.exports = { initFirebase, sendPushNotification };
