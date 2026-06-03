import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss']
})
export class LoginPage {
  form = this.fb.group({
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

  async login() {
    if (this.form.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Logging in...' });
    await loading.present();

    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        loading.dismiss();
        this.chat.connect();
        this.router.navigate(['/users']);
      },
      error: async (err) => {
        loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: err.error?.message || 'Login failed',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
      }
    });
  }
}
