import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  @Input() tables: any[] = [];
  @Input() disabled: boolean = false;

  @Output() studentSelected = new EventEmitter<any>();
  @Output() addStudent = new EventEmitter<{ nom: string; prenom: string }>();

  showStudents = false;
  searchTerm = '';

  showAddForm = false;
  newNom = '';
  newPrenom = '';

  toggleStudents() {
    if (this.disabled) return;

    this.showStudents = !this.showStudents;

    if (!this.showStudents) {
      this.studentSelected.emit(null);
    }
  }

  getStudents() {
    return this.tables
      .map(t => t.eleve)
      .filter(e => e)
      .sort((a: any, b: any) =>
        a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
      );
  }

  filteredStudents() {
    return this.getStudents().filter((e: any) =>
      (e.prenom + ' ' + e.nom)
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase())
    );
  }

  selectStudent(eleve: any) {
    if (this.disabled) return;
    this.studentSelected.emit(eleve);
  }

  submitNewStudent() {
    if (!this.newNom.trim() || !this.newPrenom.trim()) return;

    this.addStudent.emit({
      nom: this.newNom.trim(),
      prenom: this.newPrenom.trim()
    });

    this.newNom = '';
    this.newPrenom = '';
    this.showAddForm = false;
  }
}