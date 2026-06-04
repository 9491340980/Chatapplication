import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Message {
  _id: string;
  sender: { _id: string; username: string };
  receiver: { _id: string; username: string };
  text: string;
  type: 'text' | 'image' | 'video';
  fileUrl: string;
  read: boolean;
  createdAt: string;
}

export interface LastMessage {
  text: string;
  createdAt: string;
  isMine: boolean;
}

export interface ChatUser {
  _id: string;
  username: string;
  email: string;
  isOnline: boolean;
  lastMessage: LastMessage | null;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private socket!: Socket;

  private onlineUsers = new BehaviorSubject<string[]>([]);
  onlineUsers$ = this.onlineUsers.asObservable();

  private newMessage$ = new Subject<Message>();
  message$ = this.newMessage$.asObservable();

  private typing$ = new Subject<{ userId: string; isTyping: boolean }>();
  typing = this.typing$.asObservable();

  // userId -> unread count (for real-time updates after page load)
  private unreadCounts = new BehaviorSubject<Map<string, number>>(new Map());
  unreadCounts$ = this.unreadCounts.asObservable();

  // userId -> last message (real-time updates)
  private lastMessages = new BehaviorSubject<Map<string, LastMessage>>(new Map());
  lastMessages$ = this.lastMessages.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  connect() {
    const token = this.auth.getToken();
    if (!token || this.socket?.connected) return;

    this.socket = io(environment.socketUrl, { auth: { token } });

    this.socket.on('users:online', (ids: string[]) => this.onlineUsers.next(ids));

    this.socket.on('user:online', (id: string) => {
      const current = this.onlineUsers.value;
      if (!current.includes(id)) this.onlineUsers.next([...current, id]);
    });

    this.socket.on('user:offline', (id: string) => {
      this.onlineUsers.next(this.onlineUsers.value.filter((u) => u !== id));
    });

    this.socket.on('message:receive', (msg: Message) => {
      this.newMessage$.next(msg);
      this.incrementUnread(msg.sender._id);
      this.setLastMessage(msg.sender._id, { text: msg.text, createdAt: msg.createdAt, isMine: false });
    });

    this.socket.on('message:sent', (msg: Message) => {
      console.log('message:sent received', msg);
      this.newMessage$.next(msg);
      this.setLastMessage(msg.receiver._id, { text: msg.text, createdAt: msg.createdAt, isMine: true });
    });

    this.socket.on('typing:start', ({ userId }: { userId: string }) =>
      this.typing$.next({ userId, isTyping: true })
    );
    this.socket.on('typing:stop', ({ userId }: { userId: string }) =>
      this.typing$.next({ userId, isTyping: false })
    );
  }

  private incrementUnread(userId: string) {
    const map = new Map(this.unreadCounts.value);
    map.set(userId, (map.get(userId) ?? 0) + 1);
    this.unreadCounts.next(map);
  }

  private setLastMessage(userId: string, msg: LastMessage) {
    const map = new Map(this.lastMessages.value);
    map.set(userId, msg);
    this.lastMessages.next(map);
  }

  clearUnread(userId: string) {
    const map = new Map(this.unreadCounts.value);
    map.set(userId, 0);
    this.unreadCounts.next(map);
  }

  getUnread(userId: string): number {
    return this.unreadCounts.value.get(userId) ?? 0;
  }

  getLastMessage(userId: string): LastMessage | null {
    return this.lastMessages.value.get(userId) ?? null;
  }

  disconnect() {
    this.socket?.disconnect();
  }

  getUsers(): Observable<ChatUser[]> {
    return this.http.get<ChatUser[]>(`${environment.apiUrl}/messages/users`);
  }

  getMessages(userId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiUrl}/messages/${userId}`);
  }

  sendMessage(receiverId: string, text: string, type: 'text' | 'image' | 'video' = 'text', fileUrl: string = '') {
    if (!this.socket?.connected) {
      this.connect();
      // Wait for socket to connect then emit
      this.socket?.once('connect', () => {
        console.log('Socket connected, sending message');
        this.socket?.emit('message:send', { receiverId, text, type, fileUrl });
      });
    } else {
      console.log('Socket already connected, sending message', { type, fileUrl });
      this.socket.emit('message:send', { receiverId, text, type, fileUrl });
    }
  }

  saveFcmToken(fcmToken: string) {
    if (this.socket?.connected) {
      this.socket.emit('fcm:token', { fcmToken });
    } else {
      this.connect();
      setTimeout(() => this.socket?.emit('fcm:token', { fcmToken }), 2000);
    }
  }

  startTyping(receiverId: string) {
    this.socket.emit('typing:start', { receiverId });
  }

  stopTyping(receiverId: string) {
    this.socket.emit('typing:stop', { receiverId });
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.value.includes(userId);
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
