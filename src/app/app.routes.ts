import { Routes } from '@angular/router';
import { Historic } from './ts/component_historic';
import { Analyse } from './ts/component_analyse';
import { Performance } from './ts/component_performance';

export const routes: Routes = [
    { path: 'analyse', component: Analyse },
    { path: 'analyse/:ticker', component: Analyse },
    { path: 'historique', component: Historic },
    { path: 'performance', component: Performance },
    { path: '', redirectTo: '/historique', pathMatch: 'full' },
];
