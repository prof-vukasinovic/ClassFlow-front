import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-remark-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './remark-filter.component.html',
  styleUrls: ['./remark-filter.component.css']
})
export class RemarkFilterComponent {

  @Input() eleves: any[] = [];

  filterText: string = '';

  get filtered() {
    if (!this.filterText.trim()) return [];

    const lower = this.filterText.toLowerCase();

    return this.eleves
      .map(eleve => {
        const matchedRemarques = eleve.remarques?.filter((r: any) =>
          r.intitule.toLowerCase().includes(lower)
        );

        if (matchedRemarques?.length > 0) {
          return {
            eleve,
            remarques: matchedRemarques
          };
        }

        return null;
      })
      .filter(x => x !== null);
  }
}