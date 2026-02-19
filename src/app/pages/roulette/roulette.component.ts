import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roulette.component.html',
  styleUrls: ['./roulette.component.css']
})
export class RouletteComponent implements OnInit {

  students: any[] = [];
  selectedStudent: any = null;
  spinning = false;
  classId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.classId = this.route.snapshot.paramMap.get('id')!;

    this.http
      .get<any[]>(`/api/classrooms/${this.classId}/eleves`)
      .subscribe(data => {
        this.students = data;
        this.cdr.detectChanges();
      });
  }

  spin() {
    if (this.students.length === 0 || this.spinning) return;

    this.spinning = true;
    this.selectedStudent = null;
    this.cdr.detectChanges();

    let counter = 0;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * this.students.length);
      this.selectedStudent = this.students[randomIndex];
      counter++;
      this.cdr.detectChanges();

      if (counter > 25) {
        clearInterval(interval);
        this.spinning = false;
        this.cdr.detectChanges();
        this.launchConfetti();
      }
    }, 100);
  }

  launchConfetti() {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 70,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 70,
        origin: { x: 1 }
      });
    }, 300);
  }

  goBack() {
    this.router.navigate(['/classrooms', this.classId]);
  }
}