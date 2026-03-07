import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

import { LoginPageComponent } from './pages/login/login-page.component';
import { HomePageComponent } from './pages/home/home-page.component';
import { ClassroomsPageComponent } from './pages/classrooms/classrooms-page.component';
import { ClassroomDetailPageComponent } from './pages/classroom-detail/classroom-detail-page.component';
import { GroupesPageComponent } from './pages/groupes/groupes-page.component';
import { RouletteComponent } from './pages/roulette/roulette.component';
import { ZoneComponent } from './pages/zone/zone.component';

/**
 * Définition des routes de l'application.
 * 
 * Le authGuard protège les pages nécessitant
 * une authentification utilisateur.
 */

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: '', component: HomePageComponent, canMatch: [authGuard] },
  { path: 'classrooms', component: ClassroomsPageComponent, canMatch: [authGuard] },
  { path: 'classrooms/:id', component: ClassroomDetailPageComponent, canMatch: [authGuard] },
  { path: 'classrooms/:id/groupes', component: GroupesPageComponent, canMatch: [authGuard] },
  { path: 'classrooms/:id/roulette', component: RouletteComponent, canMatch: [authGuard] },
  { path: 'classrooms/:id/zone', component: ZoneComponent, canMatch: [authGuard] },
  { path: '**', redirectTo: '' }
];