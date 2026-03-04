import { Routes } from '@angular/router';
import { Historic } from './ts/component_historic';
import { Analyse } from './ts/component_analyse';
import { H } from '@angular/cdk/keycodes';

export const routes: Routes = [
    { path: 'analyse', component: Analyse },
    { path: 'analyse/:ticker', component: Analyse },
    { path: 'historique', component: Historic },
    { path: '', redirectTo: '/historique', pathMatch: 'full' },
];
