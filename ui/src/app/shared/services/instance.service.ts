import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { UserService } from './user.service';

@Injectable()
export class InstanceService {

    constructor(private http: HttpClient, private userService: UserService) {
    }

    getInstanceProperties(): Observable<any> {
        return this.http.get('/api/instance', { headers: this.userService.createJwtHeader() }).map((d: any) => d.result);
    }

}
