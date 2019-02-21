import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { GroupPageComponent } from './group/group-page.component';

const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard' },
            { path: 'dashboard', loadChildren: './dashboard/dashboard.module#DashboardModule' },
            { path: 'config', loadChildren: './config/config.module#ConfigModule' },
            { path: 'group', loadChildren: './group/group.module#GroupModule' },
            { path: 'users', loadChildren: './users/users.module#UsersModule' },
            { path: 'requests', loadChildren: './requests/requests.module#RequestsModule' }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LayoutRoutingModule {}
