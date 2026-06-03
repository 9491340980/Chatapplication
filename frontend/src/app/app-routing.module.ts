import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

const routes: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginModule),
    canActivate: [GuestGuard]
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then((m) => m.RegisterModule),
    canActivate: [GuestGuard]
  },
  {
    path: 'users',
    loadChildren: () => import('./pages/users/users.module').then((m) => m.UsersModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'chat/:userId',
    loadChildren: () => import('./pages/chat/chat.module').then((m) => m.ChatModule),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: 'users' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
