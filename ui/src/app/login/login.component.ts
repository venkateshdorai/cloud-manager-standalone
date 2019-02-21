import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { routerTransition } from '../router.animations';
import { UserService } from '../shared/services/user.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    animations: [routerTransition()]
})
export class LoginComponent implements OnInit {

    errorMessage: string;

    constructor(public router: Router, private loginService: UserService) {}

    ngOnInit() {}

    performLogin(name: string, password: string) {
        console.log('Performing login for ' + name);
        this.errorMessage = null;

        if (!name || !password) {
            this.errorMessage = 'Please specify both user name and password.';
            return;
        }

        // login via REST to receive JWT
        this.loginService.login(name, password).subscribe(data => this.loggedIn(data), err => this.loginError(err));
    }

    private loggedIn(data) {
        // TODO delegate to user service
        sessionStorage.setItem('jwt', data);
        this.router.navigate(['/dashboard']);
    }

    private loginError(err) {
        this.errorMessage = 'User / password combination is invalid.';
    }

}
