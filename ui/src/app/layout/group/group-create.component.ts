import { Component } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { ResourceGroupService, ResourceGroup } from '../../shared/services/resourcegroup.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-group-create',
    templateUrl: './group-create.component.html',
    styleUrls: ['./group-create.component.scss']
})
export class GroupCreateComponent {

    public alerts: Array<any> = [];

    public groupForm = new FormGroup({
        groupName: new FormControl(),
        groupType: new FormControl()
    });

    constructor (public groupService: ResourceGroupService, private router: Router) {
    }

    public createGroup(event: any) {
        this.groupService.createResourceGroup(this.groupForm.get('groupName').value,
            this.groupForm.get('groupType').value).subscribe(g => this.redirectToGroup(g),
            e => this.showSaveError('Could not create group: ' + e.error.error));
    }

    closeAlert(alert) {
        if (this.alerts.indexOf(alert) > -1) {
            this.alerts = this.alerts.filter(a => a !== alert);
        }
    }

    private showSaveError(msg?: any) {
        if (!msg) {
            msg = 'Error creating group.';
        }
        this.alerts.push({
            type: 'danger',
            message: msg
        });
    }

    private redirectToGroup(g: ResourceGroup) {
        this.router.navigate(['/group/config/' + g.id]);
    }
}
