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
    if (!Capacitor.isNativePlatform()) return; // only works on mobile

    // Request permission
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    // Register with FCM
    await PushNotifications.register();

    // Save token to backend
    PushNotifications.addListener('registration', (token) => {
      console.log('FCM Token:', token.value);
      this.http.post(`${environment.apiUrl}/auth/fcm-token`, { fcmToken: token.value }).subscribe();
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM registration error:', err);
    });

    // Handle notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification tap — open the chat
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data;
      if (data?.senderId) {
        this.router.navigate(['/chat', data.senderId], {
          state: { user: { _id: data.senderId, username: data.senderName, email: '' } }
        });
      }
    });
  }
}
