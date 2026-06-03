import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ChatService, Message, ChatUser } from '../../services/chat.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat',
  templateUrl: 'chat.page.html',
  styleUrls: ['chat.page.scss']
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild('messagesList') messagesList!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  messages: Message[] = [];
  newMessage = '';
  receiver!: ChatUser;
  isTyping = false;
  loading = true;
  showEmojiPicker = false;
  uploadingImage = false;

  emojis = [
    '😀','😂','😍','🥰','😎','😭','😊','🤔','😅','🤣',
    '❤️','🔥','👍','👎','🙏','💪','🎉','🎊','😏','🤩',
    '😢','😡','😱','🤦','🤷','💯','✅','❌','👀','💀',
    '🥳','😴','🤮','😇','🤗','🫶','💔','💕','😘','🥺',
    '👋','✌️','🤞','👏','🫂','🙌','🤝','👊','✊','🤙',
    '🍕','🍔','🍟','🌮','🍜','🍣','☕','🍺','🎂','🍰'
  ];

  private subs: Subscription[] = [];
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthService,
    public chat: ChatService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.chat.connect();
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
    this.chat.sendMessage(this.receiver._id, text, 'text');
    this.newMessage = '';
    this.showEmojiPicker = false;
    this.chat.stopTyping(this.receiver._id);
  }

  addEmoji(emoji: string) {
    this.newMessage += emoji;
  }

  toggleEmoji() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  onTyping() {
    this.chat.startTyping(this.receiver._id);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.chat.stopTyping(this.receiver._id), 1500);
  }

  // Trigger file input
  pickImage() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      this.showToast('Only images and videos are supported', 'warning');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showToast('File size must be under 10MB', 'warning');
      return;
    }

    await this.uploadAndSend(file);
    input.value = '';
  }

  async uploadAndSend(file: File) {
    this.uploadingImage = true;
    try {
      const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', environment.cloudinaryUploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/${resourceType}/upload`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();
      console.log('Cloudinary response:', data);

      if (data.secure_url) {
        this.chat.sendMessage(this.receiver._id, '', resourceType, data.secure_url);
      } else {
        const errMsg = data.error?.message || 'Upload failed';
        this.showToast(errMsg, 'danger');
      }
    } catch (err) {
      console.error('Upload error:', err);
      this.showToast('Upload failed. Check internet connection.', 'danger');
    } finally {
      this.uploadingImage = false;
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color, position: 'top' });
    toast.present();
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

  openMedia(url: string) {
    window.open(url, '_blank');
  }

  goBack() {
    this.router.navigate(['/users']);
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.typingTimer) clearTimeout(this.typingTimer);
  }
}
