import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { UsersPage } from './users.page';

@NgModule({
  declarations: [UsersPage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([{ path: '', component: UsersPage }])
  ]
})
export class UsersModule {}
