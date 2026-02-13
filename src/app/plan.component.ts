import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.css']
})
export class PlanComponent {

  @Input() tables: any[] = [];
  @Output() studentClicked = new EventEmitter<any>();

  draggedTable: any = null;
  offsetX = 0;
  offsetY = 0;
  hasMoved = false;

  onMouseDown(event: MouseEvent, table: any) {
    this.draggedTable = table;
    this.offsetX = event.offsetX;
    this.offsetY = event.offsetY;
    this.hasMoved = false;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.draggedTable) return;

    this.hasMoved = true;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    let newX = event.clientX - rect.left - this.offsetX;
    let newY = event.clientY - rect.top - this.offsetY;

    const tableWidth = 100;
    const tableHeight = 80;

    const maxX = rect.width - tableWidth;
    const maxY = rect.height - tableHeight;

    this.draggedTable.x = Math.max(0, Math.min(newX, maxX));
    this.draggedTable.y = Math.max(0, Math.min(newY, maxY));
  }

  onMouseUp() {
    this.draggedTable = null;
  }

  onTableClick(table: any) {
    if (this.hasMoved) return;
    if (table.eleve) {
      this.studentClicked.emit(table.eleve);
    }
  }
}