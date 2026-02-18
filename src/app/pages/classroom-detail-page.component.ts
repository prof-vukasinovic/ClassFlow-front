import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PlanComponent } from '../plan.component';
import { SidebarComponent } from '../sidebar.component';
import { StudentDetailComponent } from '../student-detail.component';

@Component({
  selector: 'app-classroom-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PlanComponent,
    SidebarComponent,
    StudentDetailComponent
  ],
  templateUrl: './classroom-detail-page.component.html',
  styleUrls: ['./classroom-detail-page.component.css']
})
export class ClassroomDetailPageComponent implements OnInit {

  @ViewChild(PlanComponent) planComponent!: PlanComponent;
  @ViewChild('sidebar') sidebar!: SidebarComponent;

  classroom: any = null;
  selectedStudent: any = null;
  classId: string | null = null;

  interactionMode: 'student' | 'table' = 'student';
  tableEditMode: 'free' | 'grid' = 'free';

  rows = 5;
  cols = 10;
  tableSize = 80;

  remarqueFilter: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.classId = this.route.snapshot.paramMap.get('id');
    this.loadSavedGrid();
    this.loadClassroom();
  }

  get filteredResults(): { eleve: any; remarques: any[] }[] {
    if (!this.classroom?.eleves?.eleves) return [];
    if (!this.remarqueFilter.trim()) return [];

    const search = this.remarqueFilter.toLowerCase();
    const results: { eleve: any; remarques: any[] }[] = [];

    for (const eleve of this.classroom.eleves.eleves) {
      const matched = (eleve.remarques || []).filter((r: any) =>
        r.intitule.toLowerCase().includes(search)
      );

      if (matched.length > 0) {
        results.push({
          eleve: eleve,
          remarques: matched
        });
      }
    }

    return results;
  }

  loadSavedGrid() {
    if (!this.classId) return;

    const saved = localStorage.getItem(`grid_${this.classId}`);
    if (saved) {
      const grid = JSON.parse(saved);
      this.cols = grid.cols;
      this.rows = grid.rows;
    }
  }

  saveGridLocally() {
    if (!this.classId) return;

    localStorage.setItem(
      `grid_${this.classId}`,
      JSON.stringify({ cols: this.cols, rows: this.rows })
    );
  }

  loadClassroom() {
    if (!this.classId) return;

    this.http
      .get(`/api/classrooms/${this.classId}/chargement`)
      .subscribe((data: any) => {

        this.classroom = data;

        this.loadRemarques();
        this.buildUITables();

        setTimeout(() => {
          this.applyGrid();
        }, 0);

        this.cdr.detectChanges();
      });
  }

  loadRemarques() {
    if (!this.classId) return;

    this.http
      .get<any[]>(`/api/classrooms/${this.classId}/eleves`)
      .subscribe((eleves) => {

        this.classroom.eleves.eleves.forEach((e: any) => {
          const full = eleves.find(x => x.id === e.id);
          if (full) e.remarques = full.remarques;
        });

        this.cdr.detectChanges();
      });
  }

  buildUITables() {
    if (!this.classroom) return;

    const uiTables: any[] = [];

    this.classroom.tables.forEach((table: any) => {

      const eleve = this.classroom.eleves.eleves.find((e: any) =>
        e.table &&
        e.table.position.x === table.position.x &&
        e.table.position.y === table.position.y
      );

      uiTables.push({
        x: table.position.x,
        y: table.position.y,
        eleve: eleve || null,
        backendRef: table
      });
    });

    this.classroom.uiTables = uiTables;
  }

  applyGrid() {
    if (!this.planComponent || !this.classroom?.uiTables) return;

    this.planComponent.updatePlanSize();

    const width = this.planComponent.planWidth;
    const height = this.planComponent.planHeight;

    if (!width || !height) return;

    const cellWidth = width / this.cols;
    const cellHeight = height / this.rows;

    this.tableSize = Math.min(cellWidth, cellHeight) - 10;

    this.planComponent.setGrid(this.cols, this.rows);

    this.classroom.uiTables.forEach((t: any) => {
      if (t.backendRef.position.x < this.cols && t.backendRef.position.y < this.rows) {
        t.x = t.backendRef.position.x * cellWidth + (cellWidth - this.tableSize) / 2;
        t.y = t.backendRef.position.y * cellHeight + (cellHeight - this.tableSize) / 2;
      }
    });

    this.planComponent.tables = this.classroom.uiTables;

    this.saveGridLocally();
    this.cdr.detectChanges();
  }

saveClassroom() {
  if (!this.planComponent || !this.classroom?.uiTables) return;

  const width = this.planComponent.planWidth;
  const height = this.planComponent.planHeight;

  if (!width || !height) return;

  const cellWidth = width / this.cols;
  const cellHeight = height / this.rows;

  this.classroom.uiTables.forEach((uiTable: any) => {

    if (this.tableEditMode === 'grid') {

      uiTable.backendRef.position.x =
        Math.round(uiTable.x / cellWidth);

      uiTable.backendRef.position.y =
        Math.round(uiTable.y / cellHeight);

    } else {

      uiTable.backendRef.position.x = uiTable.x / width;
      uiTable.backendRef.position.y = uiTable.y / height;

    }

    if (uiTable.eleve) {
      uiTable.eleve.table = uiTable.backendRef;
    }

  });

  this.http
    .post('/api/classrooms/sauvegarde', this.classroom)
    .subscribe();
}

  toggleLock() {
    this.interactionMode =
      this.interactionMode === 'student' ? 'table' : 'student';

    if (this.sidebar) {
      this.sidebar.showStudents = false;
    }

    this.selectedStudent = null;
  }

  setTableMode(mode: 'free' | 'grid') {
    this.tableEditMode = mode;
  }

  selectStudent(student: any) {
    if (this.interactionMode !== 'student') return;

    if (this.selectedStudent?.id === student?.id) {
      this.selectedStudent = null;
    } else {
      this.selectedStudent = student;
    }
  }

  onRemarksChanged() {
    this.loadRemarques();
    setTimeout(() => {
      this.buildUITables();
      this.cdr.detectChanges();
    }, 0);
  }

  onStudentDeleted(studentId: number) {
    this.selectedStudent = null;
    this.loadClassroom();
  }

  deleteTable(index: number) {
    if (!this.classroom) return;
    if (!this.classroom.uiTables || !this.classroom.uiTables[index]) return;

    const uiTable = this.classroom.uiTables[index];

    let message = "Vous êtes sûr de vouloir supprimer cette table ?";

    if (uiTable.eleve) {
      message = `Cette table contient ${uiTable.eleve.prenom} ${uiTable.eleve.nom}.
  Supprimer la table supprimera aussi l'élève.
  Continuer ?`;
    }

    const confirmed = confirm(message);
    if (!confirmed) return;

    if (uiTable.eleve) {
      this.http.delete(
        `/api/classrooms/${this.classroom.id}/eleves/${uiTable.eleve.id}`
      ).subscribe(() => {
        this.deleteTableOnly(index);
      });
    } else {
      this.deleteTableOnly(index);
    }
  }

  deleteTableOnly(index: number) {
    if (!this.classroom) return;

    this.http.delete(
      `/api/classrooms/${this.classroom.id}/tables/${index}`
    ).subscribe(() => {
      this.loadClassroom();
    });
  }

  startAddingTable() {
    if (!this.classroom) return;

    const usedPositions = this.classroom.tables.map((t: any) => ({
      x: t.position.x,
      y: t.position.y
    }));

    let newX = 0;
    let newY = 0;

    outerLoop:
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const occupied = usedPositions.some(
          (pos: any) => pos.x === x && pos.y === y
        );
        if (!occupied) {
          newX = x;
          newY = y;
          break outerLoop;
        }
      }
    }

    this.http.post(
      `/api/classrooms/${this.classroom.id}/tables`,
      { x: newX, y: newY }
    ).subscribe(() => {
      this.loadClassroom();
    });
  }

  addStudent(nom: string, prenom: string, tableIndex: number) {
    if (!this.classroom) return;

    const body = {
      nom,
      prenom,
      tableIndex
    };

    this.http.post(
      `/api/classrooms/${this.classroom.id}/eleves`,
      body
    ).subscribe(() => {
      this.loadClassroom();
    });
  }

  openAddStudent(data: { nom: string; prenom: string }) {
    if (!this.classroom) return;

    const freeTableIndex = this.classroom.uiTables.findIndex(
      (t: any) => !t.eleve
    );

    if (freeTableIndex !== -1) {
      this.http.post(
        `/api/classrooms/${this.classroom.id}/eleves`,
        {
          nom: data.nom,
          prenom: data.prenom,
          tableIndex: freeTableIndex
        }
      ).subscribe(() => {
        this.loadClassroom();
      });

      return;
    }

    const usedPositions = this.classroom.tables.map((t: any) => ({
      x: t.position.x,
      y: t.position.y
    }));

    let newX = 0;
    let newY = 0;

    outerLoop:
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const occupied = usedPositions.some(
          (pos: any) => pos.x === x && pos.y === y
        );
        if (!occupied) {
          newX = x;
          newY = y;
          break outerLoop;
        }
      }
    }

    this.http.post(
      `/api/classrooms/${this.classroom.id}/tables`,
      { x: newX, y: newY }
    ).subscribe(() => {

      this.loadClassroom();

      setTimeout(() => {

        const tableIndex = this.classroom.tables.length - 1;

        this.http.post(
          `/api/classrooms/${this.classroom.id}/eleves`,
          {
            nom: data.nom,
            prenom: data.prenom,
            tableIndex
          }
        ).subscribe(() => {
          this.loadClassroom();
        });

      }, 300);
    });
  }
}