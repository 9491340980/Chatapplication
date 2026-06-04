const admin = require('firebase-admin');

let firebaseInitialized = false;

const initFirebase = () => {
  if (firebaseInitialized) return;
  try {
    let credential;

    // Use environment variables (Railway) or local JSON file (development)
    if (process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      });
    } else {
      const serviceAccount = require('../firebase-admin.json');
      credential = admin.credential.cert(serviceAccount);
    }

    admin.initializeApp({ credential });
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
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'chat_messages'
        }
      }
    });
    console.log('Push sent successfully');
  } catch (err) {
    console.error('Push notification failed:', err.message);
  }
};

module.exports = { initFirebase, sendPushNotification };
