import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import * as JWT from 'jsonwebtoken';

export interface User {
    name: string;
    isAdmin: boolean;
    customAttributes: any;
}

export interface ResourceAuthorization {
    type: string;
    maxResources: number;
    niceLevel: number;
}

@Injectable()
export class UserService {

    constructor(private http: HttpClient) {
    }

    public createJwtHeader(): HttpHeaders {
        const jwt = sessionStorage.getItem('jwt');
        if (!jwt) {
            return new HttpHeaders();
        }

        return new HttpHeaders().set('Authorization', 'Bearer ' + jwt);
    }

    login(user: string, password: string): Observable<string> {
        // build Authorization header
        const basicData = btoa(user + ':' + password);
        const headers = new HttpHeaders().set('Authorization', 'Basic ' + basicData );

        return this.http.post('/api/login', '',
            { headers: headers, responseType: 'text' })
            .map(data => data.toString());
    }

    renewJwt(callback: (jwt: string) => void) {
        return this.http.post('/api/refreshLogin', '', { headers: this.createJwtHeader(), responseType: 'text' }).subscribe(data => {
            callback(data.toString());
        });
    }

    getUserName(): string {
        const jwt = sessionStorage.getItem('jwt');
        if (!jwt) {
            return '(not logged in)';
        }

        const payload: any = JWT.decode(jwt);
        if (!payload || !payload.username) {
            return '(not logged in)';
        }

        return payload.username;
    }

    getAllUsers(): Observable<Array<User>> {
        return this.http.get('/api/users',
            { headers: this.createJwtHeader() }).map((data: any) => <Array<User>>data.result.users);
    }

    getUserResourceAuthorizations(userName: string): Observable<Array<ResourceAuthorization>> {
        return this.http.get('/api/users/' + userName + '/authorizations',
            { headers: this.createJwtHeader() }).map((data: any) => Object.keys(data.result).map(k =>
                ({ type: k, maxResources: data.result[k].maxResources, niceLevel: data.result[k].niceLevel })));
    }

    setUserResourceAuthorizations(userName: string, authorizations: Array<ResourceAuthorization>):
        Observable<Array<ResourceAuthorization>> {
        // map array to object
        const authObj = { };
        authorizations.forEach(a => authObj[a.type] = { maxResources: a.maxResources, niceLevel: a.niceLevel });

        return this.http.post('/api/users/' + userName + '/authorizations', authObj,
            { headers: this.createJwtHeader() }).map((data: any) => Object.keys(data.result).map(k =>
                ({ type: k, maxResources: data.result[k].maxResources, niceLevel: data.result[k].niceLevel })));
    }

    setUserAdminFlag(userName: string, isAdmin: boolean): Observable<User> {
        let headers = this.createJwtHeader();
        headers = headers.set('Content-Type', 'application/x-www-form-urlencoded');
        return this.http.post('/api/users/' + userName + '/isAdmin', 'isAdmin=' + isAdmin, { headers: headers }).map(
            d => (<any>d).result.user);
    }

    createUser(userName: string): Observable<User> {
        let headers = this.createJwtHeader();
        headers = headers.set('Content-Type', 'application/x-www-form-urlencoded');
        return this.http.put('/api/users', 'name=' + encodeURIComponent(userName), { headers: headers }).map(d => (<any>d).result.user);
    }

    deleteUser(userName: string): Observable<any> {
        return this.http.delete('/api/users/' + userName, { headers: this.createJwtHeader() });
    }

    changeUserPassword(userName: string, newPassword: string): Observable<any> {
        return this.http.post('/api/users/' + userName + '/password', 'password=' + encodeURIComponent(newPassword),
            { headers: this.createJwtHeader().set('Content-Type', 'application/x-www-form-urlencoded') });
    }
}
