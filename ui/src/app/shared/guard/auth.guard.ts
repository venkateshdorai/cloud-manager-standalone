import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Router } from '@angular/router';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';

import { UserService } from '../services/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private router: Router, private loginService: UserService) {}

    canActivate() {
        let valid = false;

        // TODO ask User Service for this
        if (sessionStorage.getItem('jwt')) {
            // check JWT for validity
            const payload: any = jwt.decode(sessionStorage.getItem('jwt'));
            if (payload && payload.exp) {
                const then = moment(payload.exp * 1000);
                const now = moment();

                // less than five minutes valid? Renew async
                if (now.add(5, 'minutes').isAfter(then)) {
                    this.loginService.renewJwt((newJwt) => { localStorage.setItem('jwt', newJwt); });
                }

                // check if ROLE_ADMIN is present
                if (payload.authorization && payload.authorization.includes('ROLE_ADMIN')) {
                    valid = true;
                }
            }
        }

        if (!valid) {
            this.router.navigate(['/login']);
        }

        return valid;
    }
}
