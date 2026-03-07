import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

/**
 * Service responsable de la gestion de l'authentification.
 * 
 * Rôles :
 * - communiquer avec l'API d'authentification
 * - stocker l'état de connexion de l'utilisateur
 * - exposer cet état aux composants de l'application
 */

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = '/api';

  private loggedInSubject = new BehaviorSubject<boolean | null>(null);

  loggedIn$ = this.loggedInSubject.asObservable();

  constructor(private http: HttpClient) {}

  setLoggedIn() {
    this.loggedInSubject.next(true);
  }

  setLoggedOut() {
    this.loggedInSubject.next(false);
  }

  get loggedInValue() {
    return this.loggedInSubject.value;
  }

  me(): Observable<any> {
    return this.http.get(`${this.API}/me`);
  }

  refreshAuthState(): Observable<boolean> {
    return this.me().pipe(
      tap(() => this.setLoggedIn()),
      map(() => true),
      catchError(() => {
        this.setLoggedOut();
        return of(false);
      })
    );
  }

  login(username: string, password: string): Observable<boolean> {

    const body = new HttpParams()
      .set('username', username)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http
      .post(`${this.API}/login`, body.toString(), {
        headers,
        responseType: 'text'
      })
      .pipe(
        tap(() => this.setLoggedIn()),
        map(() => true),
        catchError(() => {
          this.setLoggedOut();
          return of(false);
        })
      );
  }

  logout(): Observable<boolean> {
    return this.http
      .post(`${this.API}/logout`, null, { responseType: 'text' })
      .pipe(
        tap(() => this.setLoggedOut()),
        map(() => true),
        catchError(() => {
          this.setLoggedOut();
          return of(false);
        })
      );
  }
}