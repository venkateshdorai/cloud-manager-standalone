import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GroupPageComponent } from './group-page.component';
import { GroupConfigComponent } from './group-config.component';
import { GroupCreateComponent } from './group-create.component';

const routes: Routes = [
    {
        path: 'create',
        component: GroupCreateComponent
    },
    {
        path: ':id',
        component: GroupPageComponent
    },
    {
        path: 'config/:id',
        component: GroupConfigComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class GroupRoutingModule {}
