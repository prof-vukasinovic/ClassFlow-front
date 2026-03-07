import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent {
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  submit() {
    this.error = '';
    this.loading = true;

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';

    this.auth.login(this.username, this.password).subscribe(ok => {
      this.loading = false;
      if (!ok) {
        this.error = 'Identifiants invalides';
        return;
      }
      this.router.navigateByUrl(returnUrl);
    });
  }
}