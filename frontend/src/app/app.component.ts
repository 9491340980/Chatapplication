import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private auth: AuthService,
    private chat: ChatService,
    private pushService: PushNotificationService
  ) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      if (this.auth.isLoggedIn()) {
        this.chat.connect();
        this.pushService.init();
      }
    });
  }
}
