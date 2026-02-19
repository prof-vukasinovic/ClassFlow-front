import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page.component';
import { ClassroomsPageComponent } from './pages/classrooms-page.component';
import { ClassroomDetailPageComponent } from './pages/classroom-detail-page.component';
import { GroupesPageComponent } from './pages/groupes-page.component';
import { RouletteComponent } from './pages/roulette/roulette.component';
import { ZoneComponent } from './pages/zone/zone.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'classrooms', component: ClassroomsPageComponent },
  { path: 'classrooms/:id', component: ClassroomDetailPageComponent },
  { path: 'classrooms/:id/groupes', component: GroupesPageComponent },
  { path: 'classrooms/:id/roulette', component: RouletteComponent },
  { path: 'classrooms/:id/zone', component: ZoneComponent }
];