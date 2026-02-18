import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page.component';
import { ClassroomsPageComponent } from './pages/classrooms-page.component';
import { ClassroomDetailPageComponent } from './pages/classroom-detail-page.component';
import { GroupesPageComponent } from './pages/groupes-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'classrooms', component: ClassroomsPageComponent },
  { path: 'classrooms/:id', component: ClassroomDetailPageComponent },
  { path: 'classrooms/:id/groupes', component: GroupesPageComponent }
];