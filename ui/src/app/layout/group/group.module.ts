import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { GroupRoutingModule } from './group-routing.module';
import { GroupPageComponent } from './group-page.component';
import { GroupConfigComponent } from './group-config.component';
import { ReactiveFormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';

import {DragulaService, dragula, DragulaModule} from 'ng2-dragula/ng2-dragula';
import { GroupCreateComponent } from './group-create.component';

@NgModule({
    imports: [CommonModule, GroupRoutingModule, ReactiveFormsModule, DropdownModule, NgbModule.forRoot(), DragulaModule],
    declarations: [GroupPageComponent, GroupConfigComponent, GroupCreateComponent]
})
export class GroupModule {}
