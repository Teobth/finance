import { Routes } from '@angular/router';
import { Historic } from './historic/historic';
import { Analyse } from './analyse/analyse';
import { H } from '@angular/cdk/keycodes';

export const routes: Routes = [
    { path: 'analyse', component: Analyse },
    { path: 'analyse/:ticker', component: Analyse },
    { path: 'historique', component: Historic },
    { path: '', redirectTo: '/historique', pathMatch: 'full' },
];
