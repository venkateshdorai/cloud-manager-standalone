import { Component, OnInit } from '@angular/core';
import { ResourceGroup, ResourceGroupService, Resource, SeleniumResource } from '../../shared/services/resourcegroup.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { User, UserService } from '../../shared/services/user.service';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/observable';
import { DragulaService } from 'ng2-dragula';

interface UsersConfig {
    limitUsers: boolean;

    authorizedUsers: Array<string>;
}

@Component({
    selector: 'app-group-config',
    templateUrl: './group-config.component.html',
    viewProviders: [DragulaService],
    styleUrls: ['./group-config.component.scss']
})
export class GroupConfigComponent implements OnInit {

    private groupId: number;

    public group: ResourceGroup;

    public hasUsers = false;

    public isSelenium = false;

    public availableUsers: Array<User> = [];

    public selectedAddUser: string;

    public allowedUsers: Array<User> = [];

    public alerts: Array<any> = [];

    public seleniumResources: Array<SeleniumResource> = [];

    public groupConfigForm = this.fb.group({
        limitUsers: [false]
    });

    constructor(public fb: FormBuilder, public groupService: ResourceGroupService, public userService: UserService,
        private route: ActivatedRoute, private router:Router) {
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            if (params.has('id')) {
                this.groupId = parseInt(params.get('id'), 10);
                if (this.groupId === NaN) {
                    this.groupId = null;
                    // TODO redirect to Not Found
                }
                else {
                    this.groupService.getResourceGroup(this.groupId).subscribe(group => { this.group = group; this.buildConfig(); });
                }
            }
        });

        this.userService.getAllUsers().subscribe(users => {
            this.availableUsers = users;
            this.availableUsers.sort((a, b) => a.name.localeCompare(b.name));
            if (this.allowedUsers.length > 0) {
                this.removeUsersFromAvailable();
            }
        });
    }

    buildConfig() {
        // check if group has users
        if (this.group.links.find(link => link.rel === 'users')) {
            this.hasUsers = true;
            // init with empty structure, fetch infos async
            this.groupService.getUsersConfig(this.groupId).subscribe(config => {
                this.groupConfigForm.get('limitUsers').setValue(config.limitUsers);
            });
            this.groupService.getAllowedUsers(this.groupId).subscribe(users => {
                this.allowedUsers = users;
                this.allowedUsers.sort((a, b) => a.name.localeCompare(b.name));
                if (this.availableUsers.length > 0) {
                    this.removeUsersFromAvailable();
                }
            });
        }

        if (this.group.type === 'selenium') {
            this.isSelenium = true;
            this.groupService.getSeleniumConfigResources(this.groupId).subscribe(resources => { this.seleniumResources = resources; });
        }
    }

    addUser(user: User) {
        this.allowedUsers.push(user);
        this.removeUsersFromAvailable();
    }

    removeUser(user: User) {
        this.allowedUsers = this.allowedUsers.filter(u => u.name !== user.name);
        this.availableUsers.push(user);
        this.availableUsers.sort((a, b) => a.name.localeCompare(b.name));
        // noop to copy array for Angular Change Detection
        this.availableUsers = this.availableUsers.filter(u => true);
    }

    saveConfig(event: any) {
        this.alerts = [];
        if (this.hasUsers) {
            this.groupService.updateUsersConfig(this.groupId, this.groupConfigForm.get('limitUsers').value,
                this.allowedUsers).subscribe(ur => {
                    // save list of users
                    this.groupService.setAllowedUsers(this.groupId, this.allowedUsers).subscribe(
                        ur2 => {
                            this.alerts.push({
                                type: 'info',
                                message: 'Configuration saved successfully.'
                            });
                        },
                        error2 => this.showSaveError());
                }, error => this.showSaveError());
        }
        if (this.isSelenium) {
            this.groupService.updateSeleniumConfigResources(this.groupId, this.seleniumResources).subscribe(ur => { },
                error => this.showSaveError('Error saving Selenium Resources'));
        }
    }
    
    removeGroup(){
    	try{
    		this.groupService.deleteGroup(this.groupId).subscribe(resp => {this.router.navigate(['/dashboard']);},
    															 error => {   console.log(error)    }    );
    	}
    	catch(e){
    		console.log(e);
    	}
    }

    closeAlert(alert) {
        if (this.alerts.indexOf(alert) > -1) {
            this.alerts = this.alerts.filter(a => a !== alert);
        }
    }

    removeSeleniumResource(res) {
        this.seleniumResources = this.seleniumResources.filter(r => r.url !== res.url);
    }

    updateSeleniumResourceMaxSessions(res, event) {
        res.maxSessions = parseInt(event.target.value, 10);
        if (res.maxSessions < 1 || isNaN(res.maxSessions)) {
            res.maxSessions = 1;
        }
        console.log(this.seleniumResources);
    }

    addSeleniumUrl(url) {
        const newResources = this.seleniumResources;
        newResources.push({url: url, maxSessions: 1});
        this.seleniumResources = newResources;
    }

    private removeUsersFromAvailable() {
        // build an array with names to be removed
        const names: Array<string> = this.allowedUsers.map(u => u.name);
        this.availableUsers = this.availableUsers.filter(u => names.indexOf(u.name) === -1);
    }

    private showSaveError(msg?: any) {
        if (!msg) {
            msg = 'Error updating configuration: Could not save configuration.';
        }
        this.alerts.push({
            type: 'danger',
            message: msg
        });
    }
}
