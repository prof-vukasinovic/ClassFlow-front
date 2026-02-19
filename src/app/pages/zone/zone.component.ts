import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-zone',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zone.component.html',
  styleUrls: ['./zone.component.css']
})
export class ZoneComponent implements OnInit {

  classId!: string;
  currentZone: 'red' | 'orange' | 'green' = 'green';

  minutesInput = 5;
  remainingSeconds = 0;
  interval: any = null;
  isRunning = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.classId = this.route.snapshot.paramMap.get('id')!;

    const saved = localStorage.getItem(`zone_${this.classId}`);
    if (saved === 'red' || saved === 'orange' || saved === 'green') {
      this.currentZone = saved;
    }
  }

  setZone(zone: 'red' | 'orange' | 'green') {
    this.currentZone = zone;
    localStorage.setItem(`zone_${this.classId}`, zone);
  }

  startTimer() {
    if (this.isRunning) return;

    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = this.minutesInput * 60;
    }

    this.isRunning = true;

    this.interval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.cdr.detectChanges();
      } else {
        this.stopTimer();
      }
    }, 1000);
  }

  pauseTimer() {
    if (!this.isRunning) return;
    clearInterval(this.interval);
    this.isRunning = false;
  }

  resetTimer() {
    clearInterval(this.interval);
    this.isRunning = false;
    this.remainingSeconds = 0;
  }

  stopTimer() {
    clearInterval(this.interval);
    this.isRunning = false;
  }

  formatTime(): string {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    return `${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : n.toString();
  }

  goBack() {
    this.router.navigate(['/classrooms', this.classId]);
  }
}