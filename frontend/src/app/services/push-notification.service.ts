import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  constructor(private http: HttpClient, private router: Router) {}

  async init() {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not a native platform, skipping push notifications');
      return;
    }

    console.log('Initializing push notifications...');

    // Add listeners BEFORE registering
    PushNotifications.addListener('registration', (token) => {
      console.log('FCM Token received:', token.value.substring(0, 30));
      this.http.post(`${environment.apiUrl}/auth/fcm-token`, { fcmToken: token.value })
        .subscribe({
          next: () => console.log('FCM token saved to backend'),
          error: (err) => console.error('Failed to save FCM token:', err)
        });
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM registration error:', JSON.stringify(err));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notification received in foreground:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Notification tapped:', action);
      const data = action.notification.data;
      if (data?.senderId) {
        this.router.navigate(['/chat', data.senderId], {
          state: { user: { _id: data.senderId, username: data.senderName, email: '' } }
        });
      }
    });

    // Request permission
    const permission = await PushNotifications.requestPermissions();
    console.log('Push permission:', permission.receive);

    if (permission.receive === 'granted') {
      await PushNotifications.register();
      console.log('Push notifications registered');
    } else {
      console.warn('Push notification permission denied');
    }
  }
}
