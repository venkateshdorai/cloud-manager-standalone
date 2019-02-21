import { Component, OnInit, OnDestroy } from '@angular/core';
import { ResourceGroup, ResourceGroupService, Resource } from '../../shared/services/resourcegroup.service';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

const REFRESH_INTERVAL = 5000;

@Component({
    selector: 'app-group-page',
    templateUrl: './group-page.component.html',
    styleUrls: ['./group-page.component.scss']
})
export class GroupPageComponent implements OnInit, OnDestroy {

    public group: ResourceGroup;

    public resourceRows: Array<any> = [];

    public isSelenium = false;

    public currentScreenshotSrc: string;

    private intervalHandle: number;

    private groupId: number;

    constructor(public groupService: ResourceGroupService, private route: ActivatedRoute, private modalService: NgbModal) {
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            if (params.has('id')) {
                this.groupId = parseInt(params.get('id'), 10);
                if (this.groupId === NaN) {
                    this.groupId = null;
                }
                this.updateStatus();
            }
        });

        this.intervalHandle = window.setInterval(() => { this.updateStatus(); }, REFRESH_INTERVAL);
    }

    ngOnDestroy() {
        if (this.intervalHandle) {
            window.clearInterval(this.intervalHandle);
        }
    }

    buildResourceRows() {
        // calculate first, switch at once, to help Angular
        const newRows = [];

        let currentRow: Array<any> = [];

        for (let i = 0; i < this.group.resourceCount; i++) {
            const res: Resource = { state: this.group.resources[i].state, label: this.group.resources[i].label };
            if (this.group.resources[i].request) {
                (<any>res).jobName = this.group.resources[i].request.jobName;
            }
            if ((<any>this.group.resources[i]).url) {
                (<any>res).url = (<any>this.group.resources[i]).url;
            }

            currentRow.push(res);
            if (currentRow.length % 4 === 0) {
                newRows.push(currentRow);
                currentRow = [];
            }
        }

        if (currentRow.length) {
            newRows.push(currentRow);
        }

        this.resourceRows = newRows;
    }

    updateStatus() {
        this.groupService.getResourceGroup(this.groupId).subscribe(group => {
            this.group = group; this.isSelenium = group.type === 'selenium'; this.buildResourceRows(); });
    }

    takeScreenshot(res, dlg) {
        if (res.url) {
            // get screenshot
            this.groupService.takeSeleniumScreenshot(this.groupId, res.url).subscribe(img => {
                this.currentScreenshotSrc = img;
                this.openScreenshotDialog(dlg);
             });
        }
    }

    toggleMaintenance(res) {
        if (res.url) {
            this.groupService.toggleSeleniumMaintenanceMode(this.groupId, res.url).subscribe(ok => { this.updateStatus(); });
        }
    }

    private openScreenshotDialog(dlg) {
        this.modalService.open(dlg).result.then((result) => { });
    }
}
