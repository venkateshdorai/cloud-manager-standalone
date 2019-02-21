import { Component, OnInit, OnDestroy } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { MonitoringService, ManagedRequest } from '../../shared/services/monitoring.service';
import { ResourceGroupService, ResourceGroup } from '../../shared/services/resourcegroup.service';

const REFRESH_INTERVAL = 5000;

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    animations: [routerTransition()]
})
export class DashboardComponent implements OnInit, OnDestroy {

    public stats: any = {
        availableResources: 0,
        totalRequests: 0,
        resourcesUsed: 0,
        waitingRequests: 0,
        averageWaitTimeMs: 0
    };

    private managedRequests: Array<ManagedRequest> = [];

    private resourceGroups: Array<ResourceGroup> = [];

    private intervalHandle: number;

    constructor(private monitoringService: MonitoringService, private resourceGroupService: ResourceGroupService) {
    }

    public resourcesUsageLabel(value: number): string {
        return `${Math.round(value)} / ${this['max']}`;
    }

    public resourcesUsageColor(value: number): string {
        const percent = value / this['max'];
        if (percent < 0.5) {
            return '#2ECC40';
        }
        if (percent < 0.9) {
            return '#FFDC00';
        }
        return '#FF4136';
    }

    public waitTimeColor(value: number): string {
        const percent = value / 60;
        if (percent < 0.2) {
            return '#2ECC40';
        }
        if (percent < 0.7) {
            return '#FFDC00';
        }
        return '#FF4136';
    }

    public waitCountColor(value: number): string {
        if (this.stats.availableResources === 0) {
            return value === 0 ? 'black' : '#FF4136';
        }
        const percent = value / this.stats.availableResources;
        if (percent < 0.15) {
            return '#2ECC40';
        }
        if (percent < 0.33) {
            return '#FFDC00';
        }
        return '#FF4136';
    }

    ngOnInit() {
       this.pullStats();
       this.intervalHandle = window.setInterval(() => { this.pullStats(); }, REFRESH_INTERVAL);
    }

    ngOnDestroy() {
        if (this.intervalHandle) {
            window.clearInterval(this.intervalHandle);
        }
    }

    private pullStats() {
        this.monitoringService.getStats().subscribe(stats => this.stats = stats);
    }

}
