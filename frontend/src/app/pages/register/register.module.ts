import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RegisterPage } from './register.page';

@NgModule({
  declarations: [RegisterPage],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild([{ path: '', component: RegisterPage }])
  ]
})
export class RegisterModule {}
