import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ReactiveFormsModule } from '@angular/forms';
import { ConfigComponent } from './config.component';
import { ConfigRoutingModule } from './config-routing.module';

@NgModule({
    imports: [CommonModule, ConfigRoutingModule, ReactiveFormsModule,  NgbModule.forRoot()],
    declarations: [ConfigComponent]
})
export class ConfigModule {}
