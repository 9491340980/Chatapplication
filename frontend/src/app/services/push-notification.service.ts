import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { ChatService } from './chat.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  constructor(private router: Router, private chat: ChatService) {}

  async init() {
    if (!Capacitor.isNativePlatform()) return;

    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM token received:', token.value.substring(0, 20));
      // Save via socket — more reliable than HTTP on mobile
      this.chat.saveFcmToken(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM error:', JSON.stringify(err));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data;
      if (data?.senderId) {
        this.router.navigate(['/chat', data.senderId], {
          state: { user: { _id: data.senderId, username: data.senderName, email: '' } }
        });
      }
    });

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }
  }
}
