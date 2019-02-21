import { Component, OnInit, OnDestroy } from '@angular/core';
import { MonitoringService, ManagedRequest } from '../../shared/services/monitoring.service';
import { ActivatedRoute } from '@angular/router';

const REFRESH_INTERVAL = 5000;

@Component({
    selector: 'app-requests',
    templateUrl: './requests.component.html',
    styleUrls: ['./requests.component.scss']
})
export class RequestsComponent implements OnInit, OnDestroy {

    requests: Array<ManagedRequest>;

    private intervalHandle: number;

    constructor(private requestsService: MonitoringService) {
    }

    public getBadgeClass(state: string): string {
        switch (state) {
            case 'WAITING': return 'badge badge-warning';
            case 'READY': return 'badge badge-primary';
            case 'WORKING': return 'badge badge-success';
            case 'FINISHED': return 'badge badge-info';
            case 'ORPHANED': return 'badge badge-danger';
        }
        return 'badge badge-default';
    }

    private updateData() {
        this.requestsService.getManagedRequests().subscribe(requests => this.requests = requests);
    }

    ngOnInit() {
        this.updateData();

        this.intervalHandle = window.setInterval(() => { this.updateData(); }, REFRESH_INTERVAL);
    }

    ngOnDestroy() {
        if (this.intervalHandle) {
            window.clearInterval(this.intervalHandle);
        }
    }
}
