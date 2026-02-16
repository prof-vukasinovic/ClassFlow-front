import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

export interface Remarque {
  id: number;
  intitule: string;
  createdAt: string;
  deleted?: boolean;
}

export interface Student {
  id: number;
  prenom: string;
  nom: string;
  remarques: Remarque[];
}

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-detail.component.html',
  styleUrls: ['./student-detail.component.css']
})
export class StudentDetailComponent implements OnChanges {

  @Input() student: Student | null = null;

  newRemarqueText: string = "";

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['student']) {
      this.newRemarqueText = "";
    }
  }

  addRemarque() {
    if (!this.student || !this.newRemarqueText.trim()) return;

    const body = {
      intitule: this.newRemarqueText.trim(),
      eleveId: this.student.id
    };

    this.http.post('/api/remarques', body)
      .subscribe((created: any) => {
        this.student!.remarques.push(created);
        this.newRemarqueText = "";
      });
  }

  editRemarque(remarque: Remarque) {
    if (!this.student) return;

    const nouveauTexte = prompt("Modifier la remarque :", remarque.intitule);
    if (!nouveauTexte) return;

    const body = {
      intitule: nouveauTexte.trim(),
      eleveId: this.student.id
    };

    this.http.put(`/api/remarques/${remarque.id}`, body)
      .subscribe(() => {
        remarque.intitule = nouveauTexte.trim();
      });
  }

  deleteRemarque(remarque: Remarque) {
    remarque.deleted = true;
  }

  restore(remarque: Remarque) {
    remarque.deleted = false;
  }

  deleteForever(remarque: Remarque) {
    if (!this.student) return;

    this.http.delete(`/api/remarques/${remarque.id}`)
      .subscribe(() => {
        this.student!.remarques =
          this.student!.remarques.filter(r => r.id !== remarque.id);
      });
  }

  get activeRemarques() {
    return this.student?.remarques.filter(r => !r.deleted) || [];
  }

  get deletedRemarques() {
    return this.student?.remarques.filter(r => r.deleted) || [];
  }
}