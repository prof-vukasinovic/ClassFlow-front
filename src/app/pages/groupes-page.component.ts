import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-groupes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './groupes-page.component.html',
  styleUrls: ['./groupes-page.component.css']
})
export class GroupesPageComponent implements OnInit {

  classId!: string;
  groupes: any[] = [];
  eleves: any[] = [];
  nombreGroupes = 2;

  couleurs = ['#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#e74c3c', '#1abc9c'];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.classId = this.route.snapshot.paramMap.get('id')!;
    this.loadEleves(() => {
      this.loadGroupes();
    });
  }

  loadEleves(callback?: () => void) {
    this.http
      .get<any[]>(`/api/classrooms/${this.classId}/eleves`)
      .subscribe(data => {
        this.eleves = data || [];
        if (callback) callback();
      });
  }

  loadGroupes() {
    this.http
      .get<any[]>(`/api/classrooms/${this.classId}/groupes`)
      .subscribe(data => {

        if (!Array.isArray(data) || data.length === 0) {
          this.groupes = [];
          this.cdr.detectChanges();
          return;
        }

        this.groupes = data.map((g: any, index: number) => ({
          id: g.id,
          nom: `Groupe ${index + 1}`,
          eleves: g.eleves || [],
          expanded: true
        }));

        this.nombreGroupes = this.groupes.length;

        this.cdr.detectChanges();
      });
  }

  createGroupes() {
    this.groupes = [];

    for (let i = 0; i < this.nombreGroupes; i++) {
      this.groupes.push({
        nom: `Groupe ${i + 1}`,
        eleves: [],
        expanded: true
      });
    }
  }

  repartitionAleatoire() {
    if (!this.groupes.length) return;

    const shuffled = [...this.eleves].sort(() => 0.5 - Math.random());
    this.groupes.forEach(g => g.eleves = []);

    shuffled.forEach((eleve, index) => {
      const groupeIndex = index % this.groupes.length;
      this.groupes[groupeIndex].eleves.push(eleve);
    });
  }

  getAssignedStudentIds(): number[] {
    return this.groupes.flatMap(g => g.eleves.map((e: any) => e.id));
  }

  getAvailableStudents() {
    const assigned = this.getAssignedStudentIds();
    return this.eleves.filter(e => !assigned.includes(e.id));
  }

  ajouterEleve(groupe: any, eleveId: number) {
    const eleve = this.eleves.find(e => e.id === Number(eleveId));
    if (!eleve) return;
    if (groupe.eleves.some((e: any) => e.id === eleve.id)) return;

    groupe.eleves.push(eleve);
  }

  retirerEleve(groupe: any, eleve: any) {
    groupe.eleves = groupe.eleves.filter((e: any) => e.id !== eleve.id);
  }

  toggleExpand(groupe: any) {
    groupe.expanded = !groupe.expanded;
  }

  sauvegarder() {
    if (!this.groupes || this.groupes.length === 0) return;

    this.http
      .get<any[]>(`/api/classrooms/${this.classId}/groupes`)
      .subscribe(existing => {

        if (!existing || existing.length === 0) {
          this.createNewGroups();
          return;
        }

        let remaining = existing.length;

        existing.forEach(g => {
          this.http
            .delete(`/api/classrooms/${this.classId}/groupes/${g.id}`)
            .subscribe(() => {
              remaining--;
              if (remaining === 0) {
                this.createNewGroups();
              }
            });
        });
      });
  }

  createNewGroups() {
    const payload = {
      groupes: this.groupes.map(g =>
        g.eleves.map((e: any) => e.id)
      )
    };

    this.http
      .post(`/api/classrooms/${this.classId}/groupes`, payload)
      .subscribe(() => {
        this.loadGroupes();
      });
  }
}