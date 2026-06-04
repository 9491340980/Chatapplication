import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  constructor(private router: Router) {}

  async init() {
    if (!Capacitor.isNativePlatform()) return;

    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM token received, saving...');
      await this.saveToken(token.value);
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

  private async saveToken(fcmToken: string, retryCount = 0) {
    const jwtToken = localStorage.getItem('token');

    if (!jwtToken) {
      if (retryCount < 5) {
        setTimeout(() => this.saveToken(fcmToken, retryCount + 1), 2000);
      }
      return;
    }

    try {
      const res = await fetch(`${environment.apiUrl}/auth/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ fcmToken })
      });
      const data = await res.json();
      console.log('FCM token save response:', JSON.stringify(data));
    } catch (err) {
      console.error('FCM token save failed:', err);
      if (retryCount < 3) {
        setTimeout(() => this.saveToken(fcmToken, retryCount + 1), 3000);
      }
    }
  }
}
