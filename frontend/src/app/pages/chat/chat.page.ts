import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ChatService, Message, ChatUser } from '../../services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: 'chat.page.html',
  styleUrls: ['chat.page.scss']
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild('messagesList') messagesList!: ElementRef;

  messages: Message[] = [];
  newMessage = '';
  receiver!: ChatUser;
  isTyping = false;
  loading = true;

  private subs: Subscription[] = [];
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthService,
    public chat: ChatService
  ) {}

  ngOnInit() {
    const receiverId = this.route.snapshot.paramMap.get('userId')!;
    const nav = this.router.getCurrentNavigation();
    this.receiver = nav?.extras?.state?.['user'] || { _id: receiverId, username: 'User', email: '' };

    this.chat.getMessages(receiverId).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.loading = false;
        this.scrollToBottom();
      },
      error: () => (this.loading = false)
    });

    this.subs.push(
      this.chat.message$.subscribe((msg) => {
        const myId = this.auth.currentUser?.id;
        const isRelevant =
          (msg.sender._id === myId && msg.receiver._id === receiverId) ||
          (msg.sender._id === receiverId && msg.receiver._id === myId);
        if (isRelevant) {
          this.messages = [...this.messages, msg];
          this.scrollToBottom();
        }
      }),
      this.chat.typing.subscribe(({ userId, isTyping }) => {
        if (userId === receiverId) this.isTyping = isTyping;
      })
    );
  }

  send() {
    const text = this.newMessage.trim();
    if (!text) return;
    this.chat.sendMessage(this.receiver._id, text);
    this.newMessage = '';
    this.chat.stopTyping(this.receiver._id);
  }

  onTyping() {
    this.chat.startTyping(this.receiver._id);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.chat.stopTyping(this.receiver._id), 1500);
  }

  isMine(msg: Message): boolean {
    return msg.sender._id === this.auth.currentUser?.id;
  }

  scrollToBottom() {
    setTimeout(() => {
      const el = this.messagesList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  goBack() {
    this.router.navigate(['/users']);
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.typingTimer) clearTimeout(this.typingTimer);
  }
}
