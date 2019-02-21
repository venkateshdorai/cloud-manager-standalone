import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { UserService } from './user.service';

export interface ManagedRequest {

    creationTimestamp: string;

    state: string;

    idleTimeMs: number;

    request: ResourceRequest;

}

export interface ResourceRequest {

    resourceType: string;

    userName: string;

    jobName?: string;

    niceLevel?: number;

    customAttributes?: any;

}

@Injectable()
export class MonitoringService {

    constructor(private http: HttpClient, private userService: UserService) {
    }

    getManagedRequests(): Observable<Array<ManagedRequest>> {
        return this.http.get('/api/monitoring/requests', { headers: this.userService.createJwtHeader() }).map((d: any) => d.result);
    }

    getStats(): Observable<Array<any>> {
        return this.http.get('/api/monitoring/stats', { headers: this.userService.createJwtHeader() }).map((d: any) => d.result);
    }

}
