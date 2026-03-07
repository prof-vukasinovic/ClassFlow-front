import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { App } from './app/app';
import { routes } from './app/app.routes';

/**
 * Point d'entrée de l'application.
 * 
 * Angular démarre ici et charge le composant
 * racine App avec le système de routing.
 */

bootstrapApplication(App, {
  providers: [
    provideRouter(routes)
  ]
});