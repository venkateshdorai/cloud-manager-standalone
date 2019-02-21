import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { UsersRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.component';
import { NgbAlertModule, NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { DropdownModule } from 'primeng/dropdown';

@NgModule({
    imports: [CommonModule, UsersRoutingModule, FormsModule, DropdownModule, NgbAlertModule.forRoot(), NgbModalModule.forRoot()],
    declarations: [UsersComponent]
})
export class UsersModule {}
