import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Intercepteur HTTP utilisé pour :
 * - ajouter automatiquement les credentials aux appels API
 * - gérer les erreurs d'authentification (401)
 */

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const auth = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith('/api');

  const request = isApiRequest
    ? req.clone({
        withCredentials: true,
        setHeaders: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
    : req;

  return next(request).pipe(
    catchError(error => {

      if (error?.status === 401) {

        auth.setLoggedOut();

        if (router.url !== '/login') {
          router.navigate(
            ['/login'],
            { queryParams: { returnUrl: router.url } }
          );
        }

      }

      return throwError(() => error);
    })
  );
};