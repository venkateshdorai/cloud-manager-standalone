import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { UserService, User } from './user.service';
import 'rxjs/add/operator/catch';

export interface ResourceGroup {

    id: number;

    type: string;

    name: string;

    resourceCount?: number;

    resources?: Array<Resource>;

    links?: Array<ResourceGroupLink>;

}

export interface Resource {

    state: string;

    label?: string;

    // TODO replace with request definition
    request?: any;

}

export interface ResourceGroupLink {
    rel: string;

    href: string;
}

export interface ResourceGroupUsersConfig {
    limitUsers: boolean;
}

export interface SeleniumResource {

    url: string;

    maxSessions: number;
}

@Injectable()
export class ResourceGroupService {

    constructor(private http: HttpClient, private userService: UserService) {
    }

    public getResourceGroups(): Observable<ResourceGroup[]> {
        return this.http.get('/api/groups', { headers: this.userService.createJwtHeader() })
        .map((data: any) => <ResourceGroup[]>data.result.groups);
    }

    public getResourceGroup(id: number): Observable<ResourceGroup> {
        return this.http.get('/api/groups/' + id, { headers: this.userService.createJwtHeader() })
        .map((data: any) => <ResourceGroup>data.result);
    }

    public createResourceGroup(name: string, groupType: string): Observable<ResourceGroup> {
        const headers = this.userService.createJwtHeader().set('Content-Type', 'application/x-www-form-urlencoded');
        const body = 'name=' + encodeURIComponent(name) + '&type=' + encodeURIComponent(groupType);
        return this.http.put('/api/groups', body, {headers: headers}).map((d: any) => d.result);
    }

    public getUsersConfig(id: number): Observable<ResourceGroupUsersConfig> {
        return this.http.get('/api/groups/' + id + '/config/users', { headers: this.userService.createJwtHeader() })
            .map((data: any) => ({ limitUsers: this.extractConfigValue(data.result.config, 'limitUsers') }));
    }
    
    public deleteGroup(id: number){
    	return this.http.delete('/api/groups/' + id, { headers: this.userService.createJwtHeader() });
    }

    public updateUsersConfig(id: number, limitUsers: boolean, allowedUsers: Array<User>): Observable<ResourceGroupUsersConfig> {
        const headers = this.userService.createJwtHeader().set('Content-Type', 'application/x-www-form-urlencoded');
        const body = 'limitUsers=' + limitUsers;
        return this.http.post('/api/groups/' + id + '/config/users', body,
            { headers: headers }).map((data: any) => ({ limitUsers: this.extractConfigValue(data.result.config, 'limitUsers') }));
    }

    public getAllowedUsers(id: number): Observable<Array<User>> {
        return this.http.get('/api/groups/' + id + '/users', { headers: this.userService.createJwtHeader() })
            .map((data: any) => <Array<User>>data.result.users);
    }

    public setAllowedUsers(id: number, users: Array<User>): Observable<Array<User>> {
        return this.http.post('/api/groups/' + id + '/users', users.map(u => u.name), { headers: this.userService.createJwtHeader() })
            .map((data: any) => <Array<User>>data.result.users);
    }

    public getSeleniumConfigResources(id: number): Observable<Array<SeleniumResource>> {
        return this.http.get('/api/groups/' + id + '/selenium/config/resources', { headers: this.userService.createJwtHeader() })
            .map((data: any) => <Array<SeleniumResource>>data.result.resources);
    }

    public updateSeleniumConfigResources(id: number, resources: Array<SeleniumResource>): Observable<Array<SeleniumResource>> {
        return this.http.post('/api/groups/' + id + '/selenium/config/resources', resources,
            { headers: this.userService.createJwtHeader() })
            .map((data: any) => <Array<SeleniumResource>>data.result.resources);
    }

    public takeSeleniumScreenshot(id: number, seleniumUrl: string): Observable<string> {
        return this.http.get('/api/groups/' + id + '/selenium/screenshot?url=' + encodeURIComponent(seleniumUrl),
            { headers: this.userService.createJwtHeader(), responseType: 'arraybuffer' })
            .map((data: ArrayBuffer) => this.toBase64Image(data));
    }

    public toggleSeleniumMaintenanceMode(id: number, seleniumUrl: string): Observable<any> {
        return this.http.post('/api/groups/' + id + '/selenium/maintenance?url=' + encodeURIComponent(seleniumUrl), '',
            { headers: this.userService.createJwtHeader() });
    }

    private extractConfigValue(values: Array<any>, key: string): any {
        const entry = values.find(value => value.key === key);
        return entry ? entry.value : null;
    }

    private toBase64Image(data: ArrayBuffer): string {
        const bytes = new Uint8Array(data);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return 'data:image/png;base64,' + window.btoa(binary);
    }

}
