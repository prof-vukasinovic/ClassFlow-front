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
  @Input() tableSize: number = 100;
  @Input() cols: number = 5;
  @Input() rows: number = 5;

  @Output() studentClicked = new EventEmitter<any>();
  @Output() tableMoved = new EventEmitter<void>();

  @ViewChild('planContainer') planContainer!: ElementRef;

  planWidth = 0;
  planHeight = 0;

  draggedTable: any = null;

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

  getRemarqueCategory(remarque: any): string {
    const match = remarque.intitule?.match(/^\[(.*?)\]/);
    return match ? match[1] : 'AUTRE';
  }

  getBavardageCount(eleve: any): number {
    if (!eleve?.remarques) return 0;
    return eleve.remarques.filter((r: any) =>
      this.getRemarqueCategory(r) === 'BAVARDAGE'
    ).length;
  }

  getTableColorClass(table: any): string {
    if (!table.eleve) return '';
    const count = this.getBavardageCount(table.eleve);
    if (count >= 3) return 'table-red';
    if (count === 2) return 'table-orange';
    if (count === 1) return 'table-yellow';
    return '';
  }

  getDMCount(table: any): number {
    if (!table.eleve?.remarques) return 0;
    return table.eleve.remarques.filter((r: any) =>
      this.getRemarqueCategory(r) === 'DEVOIR_NON_FAIT'
    ).length;
  }

  getDMBarClass(table: any): string {
    const count = this.getDMCount(table);
    if (count >= 3) return 'dm-red';
    if (count === 2) return 'dm-orange';
    if (count === 1) return 'dm-yellow';
    return '';
  }

  getRealTableHeight(table: any): number {
    const hasDM = this.getDMCount(table) > 0;
    if (!hasDM) return this.tableSize;
    return this.tableSize + 18;
  }

  onMouseDown(event: MouseEvent, table: any) {
    if (event.button !== 0) return;
    if (this.interactionMode === 'table') {
      this.draggedTable = table;
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

    const cellWidth = rect.width / this.cols;
    const cellHeight = rect.height / this.rows;

    let col = Math.floor((event.clientX - rect.left) / cellWidth);
    let row = Math.floor((event.clientY - rect.top) / cellHeight);

    col = Math.max(0, Math.min(col, this.cols - 1));
    row = Math.max(0, Math.min(row, this.rows - 1));

    const occupied = this.tables.some(t => {
      if (t === this.draggedTable) return false;
      const tCol = Math.floor(t.x / cellWidth);
      const tRow = Math.floor(t.y / cellHeight);
      return tCol === col && tRow === row;
    });

    if (occupied) return;

    const realHeight = this.getRealTableHeight(this.draggedTable);

    this.draggedTable.x =
      col * cellWidth + (cellWidth - this.tableSize) / 2;

    this.draggedTable.y =
      row * cellHeight + (cellHeight - realHeight) / 2;

    this.cdr.detectChanges();
  }

  onMouseUp(event: MouseEvent) {

    if (this.studentDragging && this.avatarVisible) {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const tableEl = element?.closest('.table');

      if (tableEl) {
        const wrapper = tableEl.closest('.table-wrapper');
        const index = Array.from(wrapper!.parentElement!.children).indexOf(wrapper!);
        const targetTable = this.tables[index];

        if (targetTable) {
          const sourceTable = this.tables.find(t =>
            t.eleve && t.eleve.id === this.studentDragging.id
          );
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

  onTableClick(table: any) {
    if (this.interactionMode !== 'student') return;
    if (table.eleve) {
      this.studentClicked.emit(table.eleve);
    }
  }
}