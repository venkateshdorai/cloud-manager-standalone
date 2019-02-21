import { Component, OnInit, Renderer } from '@angular/core';
import { ResourceGroup, ResourceGroupService, Resource } from '../../shared/services/resourcegroup.service';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserService, User, ResourceAuthorization } from '../../shared/services/user.service';
import { AjaxJoinerService } from '../../shared/services/ajaxjoiner.service';
import { SelectItem } from 'primeng/components/common/selectitem';

@Component({
    selector: 'app-users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {

    public allUsers: Array<User> = [];

    public selectedUser: User;

    public selectedUserAuthorizations: Array<ResourceAuthorization> = [];

    public alerts: Array<any> = [];

    public availableAuthorizationTypes: Array<SelectItem> = [];

    constructor(public usersService: UserService, private ajaxJoinerService: AjaxJoinerService, private modalService: NgbModal,
        private renderer: Renderer) {
    }

    ngOnInit() {
        this.usersService.getAllUsers().subscribe(users => this.allUsers = users);
    }

    selectUser(user): boolean {
        this.selectedUser = user;
        this.selectedUserAuthorizations = [];
        this.usersService.getUserResourceAuthorizations(user.name).subscribe(auths => {
            this.selectedUserAuthorizations = auths;

            // TODO calculate available authorization types by taking ALL types and subtract the ones the user already has
            this.availableAuthorizationTypes = [ { label: 'Selenium', value: 'selenium' }];
            this.availableAuthorizationTypes = this.availableAuthorizationTypes.filter(
                t => !this.selectedUserAuthorizations.find(a => a.type === t.value));
        });

        // clear alerts at this opportunity
        this.alerts = [];

        return false;
    }

    createUser(userName) {
        this.usersService.createUser(userName).subscribe(user => {
            this.addAlert('User ' + userName  + ' created successfully', 'info');
            this.ngOnInit();
        }, error => {
            this.addAlert('Could not create user: ' + error.error.message, 'danger');
        });
    }

    saveUser() {
        if (!this.selectedUser) {
            return;
        }
        const ajaxJoiner = this.ajaxJoinerService.createAjaxJoiner(() => {
            this.addAlert('User updated successfully', 'info');
        }, (e, key) => {
            if (key === 'attrs') {
                this.addAlert('Could not update user attributes', 'danger');
            }
            else if (key === 'auths') {
                this.addAlert('Could not update user authorizations', 'danger');
            }
        });

        ajaxJoiner.addObservable(this.usersService.setUserResourceAuthorizations(this.selectedUser.name, this.selectedUserAuthorizations),
            (data) => { }, 'auths');
        ajaxJoiner.addObservable(this.usersService.setUserAdminFlag(this.selectedUser.name, this.selectedUser.isAdmin),
            (data) => { }, 'attrs');
    }

    deleteUser() {
        if (!this.selectedUser) {
            return;
        }
        if (!confirm('Really delete user "' + this.selectedUser.name + '?')) {
            return;
        }
        const userName = this.selectedUser.name;
        this.usersService.deleteUser(userName).subscribe(d => {
            this.addAlert('User ' + userName + ' deleted.', 'info');
            this.ngOnInit();
        }, error => {
            this.addAlert('Could not delete user: ' + error.error.message);
            // to be safe, also refresh in this case
            this.ngOnInit();
        });
        this.allUsers = this.allUsers.filter(u => u !== this.selectedUser);
        this.selectedUser = null;
    }

    removeResourceAuthorization(authorization: ResourceAuthorization) {
        this.selectedUserAuthorizations = this.selectedUserAuthorizations.filter(a => a !== authorization);
        this.availableAuthorizationTypes.push({ label: this.capitalizeFirstLetter(authorization.type), value: authorization.type });
        this.availableAuthorizationTypes.sort();
    }

    addResourceAuthorization(authorizationType: string) {
        this.selectedUserAuthorizations.push({ type: authorizationType, niceLevel: 0, maxResources: 1 });
        this.availableAuthorizationTypes = this.availableAuthorizationTypes.filter(
            t => !this.selectedUserAuthorizations.find(a => a.type === t.value));
    }

    changeUserPassword(dlg) {
        if (!this.selectedUser) {
            return;
        }

        // in case selection changes too fast or whatever
        const userName = this.selectedUser.name;

        const ref = this.modalService.open(dlg);
        this.renderer.selectRootElement('#newPassword').focus();

        ref.result.then((result) => {
            if (result.password) {
                this.usersService.changeUserPassword(userName, result.password).subscribe((d) => {
                    this.addAlert('User password has been changed.', 'info');
                }, (error) => {
                    this.addAlert('Could not change user password: ' + error.error.message);
                });
            }
        }, (reason) => {
            // ignore, dialog dismissed
        });
    }

    capitalizeFirstLetter(s: string) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    private addAlert(msg: any, type?: string) {
        if (!type) {
            type = 'danger';
        }

        this.alerts.push({
            type: type,
            message: msg
        });
    }

    closeAlert(alert) {
        if (this.alerts.indexOf(alert) > -1) {
            this.alerts = this.alerts.filter(a => a !== alert);
        }
    }
}
