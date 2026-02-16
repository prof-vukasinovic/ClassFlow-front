import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.css']
})
export class PlanComponent implements AfterViewInit {

  @Input() tables: any[] = [];
  @Input() interactionMode: 'student' | 'table' = 'student';
  @Input() tableEditMode: 'free' | 'grid' = 'free';
  @Input() tableSize: number = 100;

  @Output() studentClicked = new EventEmitter<any>();
  @Output() tableMoved = new EventEmitter<void>();

  @ViewChild('planContainer') planContainer!: ElementRef;

  planWidth = 0;
  planHeight = 0;

  cols = 1;
  rows = 1;

  draggedTable: any = null;
  offsetX = 0;
  offsetY = 0;

  studentDragging: any = null;
  avatarX = 0;
  avatarY = 0;
  avatarVisible = false;
  dragStartX = 0;
  dragStartY = 0;
  dragThreshold = 6;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.updatePlanSize();
  }

  updatePlanSize() {
    const rect = this.planContainer.nativeElement.getBoundingClientRect();
    this.planWidth = rect.width;
    this.planHeight = rect.height;
  }

  setGrid(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
  }

  getTableColorClass(table: any): string {
    if (!table.eleve || !table.eleve.remarques) return '';

    const bavardages = table.eleve.remarques.filter((r: any) =>
      r.intitule?.toLowerCase().includes('bavard')
    ).length;

    if (bavardages >= 3) return 'table-red';
    if (bavardages === 2) return 'table-orange';
    if (bavardages === 1) return 'table-yellow';

    return '';
  }

  getDMCount(table: any): number {
    if (!table.eleve?.remarques) return 0;

    return table.eleve.remarques.filter((r: any) =>
      r.intitule?.toLowerCase().includes('dm') &&
      r.intitule?.toLowerCase().includes('non fait')
    ).length;
  }

  getDMBarClass(table: any): string {
    const count = this.getDMCount(table);

    if (count >= 3) return 'dm-red';
    if (count === 2) return 'dm-orange';
    if (count === 1) return 'dm-yellow';

    return '';
  }

  onMouseDown(event: MouseEvent, table: any) {
    if (event.button !== 0) return;

    if (this.interactionMode === 'table') {
      this.draggedTable = table;
      this.offsetX = event.offsetX;
      this.offsetY = event.offsetY;
    }
  }

  startStudentDrag(eleve: any, event: MouseEvent) {
    if (this.interactionMode !== 'student') return;
    if (event.button !== 0) return;

    event.stopPropagation();

    this.studentDragging = eleve;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.avatarX = event.clientX;
    this.avatarY = event.clientY;
    this.avatarVisible = false;
  }

  onMouseMove(event: MouseEvent) {

    if (this.studentDragging) {

      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!this.avatarVisible && distance > this.dragThreshold) {
        this.avatarVisible = true;
      }

      if (this.avatarVisible) {
        this.avatarX = event.clientX;
        this.avatarY = event.clientY;
      }

      this.cdr.detectChanges();
      return;
    }

    if (!this.draggedTable) return;
    if (this.interactionMode !== 'table') return;

    const rect = this.planContainer.nativeElement.getBoundingClientRect();

    let newX = event.clientX - rect.left - this.offsetX;
    let newY = event.clientY - rect.top - this.offsetY;

    const maxX = rect.width - this.tableSize;
    const maxY = rect.height - this.tableSize;

    if (this.tableEditMode === 'grid') {

      const cellWidth = rect.width / this.cols;
      const cellHeight = rect.height / this.rows;

      let col = Math.round(newX / cellWidth);
      let row = Math.round(newY / cellHeight);

      col = Math.max(0, Math.min(col, this.cols - 1));
      row = Math.max(0, Math.min(row, this.rows - 1));

      if (this.isGridOccupied(col, row, this.draggedTable, cellWidth, cellHeight)) {
        return;
      }

      const snappedX = col * cellWidth + (cellWidth - this.tableSize) / 2;
      const snappedY = row * cellHeight + (cellHeight - this.tableSize) / 2;

      this.draggedTable.x = snappedX;
      this.draggedTable.y = snappedY;

    } else {

      if (this.isOverlapping(newX, newY, this.draggedTable)) return;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      this.draggedTable.x = newX;
      this.draggedTable.y = newY;
    }

    this.cdr.detectChanges();
  }

  onMouseUp(event: MouseEvent) {

    if (this.studentDragging && this.avatarVisible) {

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const tableEl = element?.closest('.table');

      if (tableEl) {
        const index = Array.from(tableEl.parentElement!.children).indexOf(tableEl);
        const targetTable = this.tables[index];

        if (targetTable) {
          const sourceTable = this.tables.find(t => t.eleve?.id === this.studentDragging.id);
          if (sourceTable) {
            const temp = targetTable.eleve;
            targetTable.eleve = sourceTable.eleve;
            sourceTable.eleve = temp;
          }
        }
      }
    }

    this.studentDragging = null;
    this.avatarVisible = false;
    this.draggedTable = null;
    this.tableMoved.emit();
  }

  isGridOccupied(col: number, row: number, current: any, cellWidth: number, cellHeight: number): boolean {
    return this.tables.some(t => {
      if (t === current) return false;
      const tCol = Math.round(t.x / cellWidth);
      const tRow = Math.round(t.y / cellHeight);
      return tCol === col && tRow === row;
    });
  }

  isOverlapping(x: number, y: number, current: any): boolean {
    return this.tables.some(t => {
      if (t === current) return false;
      return (
        x < t.x + this.tableSize &&
        x + this.tableSize > t.x &&
        y < t.y + this.tableSize &&
        y + this.tableSize > t.y
      );
    });
  }

  onTableClick(table: any) {
    if (this.interactionMode !== 'student') return;
    if (table.eleve) {
      this.studentClicked.emit(table.eleve);
    }
  }
}