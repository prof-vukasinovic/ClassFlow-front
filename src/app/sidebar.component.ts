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

  showStudents = false;
  searchTerm = '';

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
      .filter(e => e);
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
}