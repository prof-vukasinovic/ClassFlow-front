import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Guard de protection des routes.
 * 
 * Vérifie si l'utilisateur est authentifié avant
 * d'autoriser l'accès aux pages protégées.
 */

export const authGuard: CanMatchFn = (route, segments): Observable<boolean | UrlTree> => {

  const auth = inject(AuthService);
  const router = inject(Router);

  const url = '/' + segments.map(s => s.path).join('/');

  if (url === '/login') {
    return of(true);
  }

  if (auth.loggedInValue === true) {
    return of(true);
  }

  return auth.refreshAuthState().pipe(
    map(isAuthenticated =>
      isAuthenticated
        ? true
        : router.createUrlTree(
            ['/login'],
            { queryParams: { returnUrl: url } }
          )
    )
  );
};