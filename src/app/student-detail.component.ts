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
  @Input() classRoomId!: number;
  @Output() studentDeleted = new EventEmitter<number>();

  newRemarqueText: string = "";
  selectedCategory: string = "AUTRE";

  categories = [
    { label: "Bavardage", value: "BAVARDAGE" },
    { label: "Devoir non fait", value: "DEVOIR_NON_FAIT" },
    { label: "Oubli matériel", value: "MATERIEL" },
    { label: "Autre", value: "AUTRE" }
  ];

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['student']) {
      this.newRemarqueText = "";
      this.selectedCategory = "AUTRE";
    }
  }

  deleteStudent() {
    if (!this.student) return;

    const confirmed = window.confirm(
      `Vous êtes sûr de vouloir supprimer ${this.student.prenom} ${this.student.nom} ?`
    );

    if (!confirmed) return;

    this.http.delete(`/api/classrooms/${this.classRoomId}/eleves/${this.student.id}`)
      .subscribe(() => {
        this.studentDeleted.emit(this.student!.id);
      });
  }

  renameStudent() {
    if (!this.student) return;

    const prenom = prompt("Nouveau prénom :", this.student.prenom);
    if (!prenom) return;

    const nom = prompt("Nouveau nom :", this.student.nom);
    if (!nom) return;

    const prenomTrimmed = prenom.trim();
    const nomTrimmed = nom.trim();

    if (!prenomTrimmed || !nomTrimmed) return;

    const body = {
      prenom: prenomTrimmed,
      nom: nomTrimmed
    };

    this.http.put(
      `/api/classrooms/${this.classRoomId}/eleves/${this.student.id}`,
      body
    ).subscribe(() => {
      this.student!.prenom = prenomTrimmed;
      this.student!.nom = nomTrimmed;
    });
  }

  addRemarque() {
    if (!this.student || !this.newRemarqueText.trim()) return;

    const formattedText =
      `[${this.selectedCategory}] ${this.newRemarqueText.trim()}`;

    const body = {
      intitule: formattedText,
      eleveId: this.student.id
    };

    this.http.post('/api/remarques', body)
      .subscribe((created: any) => {
        this.student!.remarques.push(created);
        this.newRemarqueText = "";
        this.selectedCategory = "AUTRE";
      });
  }

  editRemarque(remarque: Remarque) {
    if (!this.student) return;

    const cleaned = remarque.intitule.replace(/^\[.*?\]\s*/, '');
    const nouveauTexte = prompt("Modifier la remarque :", cleaned);
    if (!nouveauTexte) return;

    const categoryMatch = remarque.intitule.match(/^\[(.*?)\]/);
    const category = categoryMatch ? categoryMatch[1] : "AUTRE";

    const formattedText = `[${category}] ${nouveauTexte.trim()}`;

    const body = {
      intitule: formattedText,
      eleveId: this.student.id
    };

    this.http.put(`/api/remarques/${remarque.id}`, body)
      .subscribe(() => {
        remarque.intitule = formattedText;
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

  cleanText(text: string): string {
    return text.replace(/^\[.*?\]\s*/, '');
  }
}