import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-classrooms-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './classrooms-page.component.html'
})
export class ClassroomsPageComponent implements OnInit {

  classrooms: any[] = [];

  importTarget: any = null;
  importFile: File | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadClasses();
  }

  loadClasses() {
    this.http.get<any[]>('/api/classrooms').subscribe(data => {
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

    this.http.post('/api/classrooms', { nom }).subscribe(() => {
      this.loadClasses();
    });
  }

  renameClass(classroom: any) {
    const newName = prompt("Nouveau nom :", classroom.nom);
    if (!newName || !newName.trim()) return;

    this.http.put(`/api/classrooms/${classroom.id}`, { ...classroom, nom: newName })
      .subscribe(() => this.loadClasses());
  }

  deleteClass(id: number) {
    const classroom = this.classrooms.find(c => c.id === id);
    if (!classroom) return;

    const confirmed = window.confirm(`Vous êtes sûr de vouloir supprimer "${classroom.nom}" ?`);
    if (!confirmed) return;

    this.http.delete(`/api/classrooms/${id}`).subscribe(() => {
      this.classrooms = this.classrooms.filter(c => c.id !== id);
      this.cdr.detectChanges();
    });
  }

  openImport(classroom: any) {
    this.importTarget = classroom;
    this.importFile = null;
    const input = document.getElementById('csvInput') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  onCsvSelected(event: any) {
    this.importFile = event.target.files?.[0] ?? null;
  }

  async importCsvIntoClass() {
    if (!this.importTarget) return;
    if (!this.importFile) return;

    const replace = window.confirm(`Remplacer les élèves de "${this.importTarget.nom}" ?`);
    if (!replace) return;

    const classId = this.importTarget.id;

    const eleves: any[] = await firstValueFrom(this.http.get<any[]>(`/api/classrooms/${classId}/eleves`));
    for (const e of eleves) {
      await firstValueFrom(this.http.delete(`/api/classrooms/${classId}/eleves/${e.id}`));
    }

    const text = await this.importFile.text();
    const rows = this.parseCsv(text);

    for (const r of rows) {
      if (!r.nom || !r.prenom) continue;
      await this.addStudentPlaced(classId, r.nom, r.prenom, 5, 10);
    }

    this.importTarget = null;
    this.importFile = null;
    this.loadClasses();
  }

  cancelImport() {
    this.importTarget = null;
    this.importFile = null;
  }

  parseCsv(text: string): Array<{ nom: string; prenom: string }> {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const header = lines[0].split(',').map(s => s.trim().toLowerCase());
    const iNom = header.indexOf('nom');
    const iPrenom = header.indexOf('prenom');
    if (iNom === -1 || iPrenom === -1) return [];

    const res: Array<{ nom: string; prenom: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim());
      const nom = cols[iNom] ?? '';
      const prenom = cols[iPrenom] ?? '';
      if (nom && prenom) res.push({ nom, prenom });
    }
    return res;
  }

  async addStudentPlaced(classId: number, nom: string, prenom: string, rows: number, cols: number) {
    const tables: any[] = await firstValueFrom(this.http.get<any[]>(`/api/classrooms/${classId}/tables`));
    const used = tables.map(t => ({ x: t.position.x, y: t.position.y }));

    let newX = -1;
    let newY = -1;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!used.some(p => p.x === x && p.y === y)) {
          newX = x;
          newY = y;
          break;
        }
      }
      if (newX !== -1) break;
    }

    if (newX === -1) return;

    await firstValueFrom(this.http.post(`/api/classrooms/${classId}/tables`, { x: newX, y: newY }));

    const tablesAfter: any[] = await firstValueFrom(this.http.get<any[]>(`/api/classrooms/${classId}/tables`));
    const tableIndex = tablesAfter.length - 1;

    await firstValueFrom(this.http.post(`/api/classrooms/${classId}/eleves`, { nom, prenom, tableIndex }));
  }

  exportCsv(classroomId: number) {
    window.location.href = `/api/classrooms/${classroomId}/export-csv`;
  }
}