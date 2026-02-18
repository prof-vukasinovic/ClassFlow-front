import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-classrooms-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './classrooms-page.component.html'
})
export class ClassroomsPageComponent implements OnInit {

  classrooms: any[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadClasses();
  }

  loadClasses() {
    this.http
      .get<any[]>('/api/classrooms')
      .subscribe(data => {
        this.classrooms = data;
        this.cdr.detectChanges();
      });
  }

  goToClass(event: any) {
    const id = event.target.value;
    if (id) {
      this.router.navigate(['/classrooms', id]);
    }
  }

  createClass() {
    const nom = prompt("Nom de la nouvelle classe ?");
    if (!nom || !nom.trim()) return;

    this.http.post('/api/classrooms', { nom })
      .subscribe(() => {
        this.loadClasses();
      });
  }

  renameClass(classroom: any) {
    const newName = prompt("Nouveau nom :", classroom.nom);
    if (!newName || !newName.trim()) return;

    this.http.put(
      `/api/classrooms/${classroom.id}`,
      { ...classroom, nom: newName }
    ).subscribe(() => {
      this.loadClasses();
    });
  }

  deleteClass(id: number) {
    const classroom = this.classrooms.find(c => c.id === id);
    if (!classroom) return;

    const confirmed = window.confirm(
      `Vous êtes sûr de vouloir supprimer "${classroom.nom}" ?`
    );

    if (!confirmed) return;

    this.http.delete(`/api/classrooms/${id}`)
      .subscribe(() => {
        this.classrooms = this.classrooms.filter(c => c.id !== id);
        this.cdr.detectChanges();
      });
  }
}