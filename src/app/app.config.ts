import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

/**
 * Configuration globale de l'application Angular.
 * 
 * Ici nous déclarons les providers disponibles
 * dans toute l'application (ex: HTTP client).
 */

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient()
  ]
};