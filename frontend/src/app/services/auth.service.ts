import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  username: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private loadUser(): User | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  register(username: string, email: string, password: string) {
    return this.http
      .post<{ token: string; user: User }>(`${environment.apiUrl}/auth/register`, { username, email, password })
      .pipe(tap((res) => this.saveSession(res)));
  }

  login(email: string, password: string) {
    return this.http
      .post<{ token: string; user: User }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.saveSession(res)));
  }

  private saveSession(res: { token: string; user: User }) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
