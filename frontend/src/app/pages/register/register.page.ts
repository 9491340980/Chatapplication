import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrls: ['register.page.scss']
})
export class RegisterPage {
  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private chat: ChatService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async register() {
    if (this.form.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Creating account...' });
    await loading.present();

    const { username, email, password } = this.form.value;
    this.auth.register(username!, email!, password!).subscribe({
      next: () => {
        loading.dismiss();
        this.chat.connect();
        this.router.navigate(['/users']);
      },
      error: async (err) => {
        loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: err.error?.message || 'Registration failed',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
      }
    });
  }
}
