import { Routes } from '@angular/router';
import { Historic } from './ts/component_historic';
import { Analyse } from './ts/component_analyse';
import { Performance } from './ts/component_performance';
import { Positions } from './ts/component_positions';

export const routes: Routes = [
    { path: 'analyse', component: Analyse },
    { path: 'analyse/:ticker', component: Analyse },
    { path: 'historique', component: Historic },
    { path: 'performance', component: Performance },
    { path: 'positions', component: Positions },
    { path: '', redirectTo: '/historique', pathMatch: 'full' },
];
