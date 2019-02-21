import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { RequestsRoutingModule } from './requests-routing.module';
import { RequestsComponent } from './requests.component';
import {TableModule} from 'primeng/table';

// import { NgbAlertModule, NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
// import { DropdownModule } from 'primeng/dropdown';

@NgModule({
    imports: [CommonModule, RequestsRoutingModule, FormsModule, TableModule ],
    declarations: [RequestsComponent]
})
export class RequestsModule {}
