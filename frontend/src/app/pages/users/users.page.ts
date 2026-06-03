import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ChatService, ChatUser } from '../../services/chat.service';
import { IonRefresher } from '@ionic/angular';

@Component({
  selector: 'app-users',
  templateUrl: 'users.page.html',
  styleUrls: ['users.page.scss']
})
export class UsersPage implements OnInit, OnDestroy {
  users: ChatUser[] = [];
  loading = true;
  private subs: Subscription[] = [];

  constructor(
    public auth: AuthService,
    public chat: ChatService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ionViewWillEnter() {
    this.loadUsers();
  }

  ngOnInit() {
    this.chat.connect();
    this.loadUsers();

    // Refresh online badge when online status changes
    this.subs.push(
      this.chat.onlineUsers$.subscribe(() => {
        this.users = [...this.users];
      }),

      // When a new message arrives, update badge + last message + show toast
      this.chat.message$.subscribe(async (msg) => {
        const myId = this.auth.currentUser?.id;
        if (msg.sender._id !== myId) {
          // Update the user card in-place
          this.users = this.users.map((u) => {
            if (u._id === msg.sender._id) {
              return {
                ...u,
                unreadCount: (u.unreadCount ?? 0) + 1,
                lastMessage: { text: msg.text, createdAt: msg.createdAt, isMine: false }
              };
            }
            return u;
          });
          // Move this user to the top
          const idx = this.users.findIndex((u) => u._id === msg.sender._id);
          if (idx > 0) {
            const [user] = this.users.splice(idx, 1);
            this.users = [user, ...this.users];
          }

          // Toast notification
          const sender = this.users.find((u) => u._id === msg.sender._id);
          const toast = await this.toastCtrl.create({
            message: `${sender?.username ?? 'Someone'}: ${msg.text}`,
            duration: 3000,
            position: 'top',
            color: 'dark',
            buttons: [{ text: 'Open', handler: () => sender && this.openChat(sender) }]
          });
          toast.present();
        } else {
          // Update last message for sent messages too
          this.users = this.users.map((u) => {
            if (u._id === msg.receiver._id) {
              return {
                ...u,
                lastMessage: { text: msg.text, createdAt: msg.createdAt, isMine: true }
              };
            }
            return u;
          });
        }
      })
    );
  }

  loadUsers(refresher?: IonRefresher) {
    this.loading = !refresher;
    this.chat.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
        refresher?.complete();
      },
      error: () => {
        this.loading = false;
        refresher?.complete();
      }
    });
  }

  onRefresh(event: any) {
    this.loadUsers(event.target);
  }

  openChat(user: ChatUser) {
    // Clear unread count when opening
    this.users = this.users.map((u) =>
      u._id === user._id ? { ...u, unreadCount: 0 } : u
    );
    this.chat.clearUnread(user._id);
    this.router.navigate(['/chat', user._id], { state: { user } });
  }

  totalUnread(): number {
    return this.users.reduce((sum, u) => sum + (u.unreadCount ?? 0), 0);
  }

  logout() {
    this.chat.disconnect();
    this.auth.logout();
  }

  trackById(_: number, user: ChatUser) {
    return user._id;
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
