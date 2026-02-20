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

type Category = 'BAVARDAGE' | 'DEVOIR_NON_FAIT';

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
  @Input() courseDate: Date | null = null;

  @Output() studentDeleted = new EventEmitter<number>();
  @Output() remarksChanged = new EventEmitter<void>();

  newRemarqueText: string = "";

  categories: { label: string; value: Category }[] = [
    { label: "Bavardage", value: "BAVARDAGE" },
    { label: "Devoir non fait", value: "DEVOIR_NON_FAIT" },
  ];

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['student']) {
      this.newRemarqueText = "";
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

  addCategoryRemarque(category: Category) {
    const sameLocalDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (this.courseDate && !sameLocalDay(this.courseDate, new Date())) {
      alert("Cette remarque ne peut pas être ajoutée car la date ne correspond pas.");
      return;
    }

    if (!this.student) return;

    const label = category === 'BAVARDAGE' ? 'Bavardage' : 'Devoir non fait';

    const body = {
      intitule: `[${category}] ${label}`,
      eleveId: this.student.id,
      classRoomId: this.classRoomId
    };

    this.http.post('/api/remarques', body)
      .subscribe((created: any) => {
        this.student!.remarques.push(created);
        this.remarksChanged.emit();
      });
  }

  addRemarque() {
    const sameLocalDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (this.courseDate && !sameLocalDay(this.courseDate, new Date())) {
      alert("Cette remarque ne peut pas être ajoutée car la date ne correspond pas.");
      return;
    }

    if (!this.student) return;

    const text = this.newRemarqueText.trim();
    if (!text) return;

    const body = {
      intitule: text,
      eleveId: this.student.id,
      classRoomId: this.classRoomId
    };

    this.http.post('/api/remarques', body)
      .subscribe((created: any) => {
        this.student!.remarques.push(created);
        this.newRemarqueText = "";
        this.remarksChanged.emit();
      });
  }

  editRemarque(remarque: Remarque) {
    const sameLocalDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (this.courseDate && !sameLocalDay(this.courseDate, new Date())) {
      alert("Cette remarque ne peut pas être modifiée car la date ne correspond pas.");
      return;
    }

    if (!this.student) return;

    const cleaned = remarque.intitule.replace(/^\[.*?\]\s*/, '');
    const nouveauTexte = prompt("Modifier la remarque :", cleaned);
    if (!nouveauTexte) return;

    const categoryMatch = remarque.intitule.match(/^\[(.*?)\]/);
    const category = categoryMatch ? categoryMatch[1] : "";

    const formattedText = category
      ? `[${category}] ${nouveauTexte.trim()}`
      : nouveauTexte.trim();

    const body = {
      intitule: formattedText,
      eleveId: this.student.id
    };

    this.http.put(`/api/remarques/${remarque.id}`, body)
      .subscribe(() => {
        remarque.intitule = formattedText;
        this.remarksChanged.emit();
      });
  }

  deleteRemarque(remarque: Remarque) {
    remarque.deleted = true;
  }

  restore(remarque: Remarque) {
    remarque.deleted = false;
  }

  deleteForever(remarque: Remarque) {
    const sameLocalDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (this.courseDate && !sameLocalDay(this.courseDate, new Date())) {
      alert("Cette remarque ne peut pas être supprimée car la date ne correspond pas.");
      return;
    }

    if (!this.student) return;

    this.http.delete(`/api/remarques/${remarque.id}`)
      .subscribe(() => {
        this.student!.remarques =
          this.student!.remarques.filter(r => r.id !== remarque.id);
        this.remarksChanged.emit();
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