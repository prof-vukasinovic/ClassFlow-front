import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

export interface Remarque {
  id: number;
  intitule: string;
  createdAt: string;
  deletedAt?: string;
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
  @Output() remarksChanged = new EventEmitter<void>();

  newRemarqueText: string = "";
  deletedHistory: Remarque[] = [];

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
      .subscribe(() => {
        this.newRemarqueText = "";
        this.remarksChanged.emit();
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
        this.remarksChanged.emit();
      });
  }

  deleteRemarque(remarque: Remarque) {
    if (!this.student) return;

    this.http.delete(`/api/remarques/${remarque.id}`)
      .subscribe(() => {

        this.deletedHistory.push({
          ...remarque,
          deletedAt: new Date().toISOString()
        });

        this.remarksChanged.emit();
      });
  }

  restore(remarque: Remarque) {
    if (!this.student) return;

    const body = {
      intitule: remarque.intitule,
      eleveId: this.student.id
    };

    this.http.post('/api/remarques', body)
      .subscribe(() => {

        this.deletedHistory =
          this.deletedHistory.filter(r => r !== remarque);

        this.remarksChanged.emit();
      });
  }

  deleteForever(remarque: Remarque) {
    this.deletedHistory =
      this.deletedHistory.filter(r => r !== remarque);
  }
}