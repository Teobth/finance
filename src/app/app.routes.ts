import { Routes } from '@angular/router';
import { Historic } from './historic/historic';
import { Analyse } from './analyse/analyse';

export const routes: Routes = [
    { path: 'analyse', component: Analyse },
    { path: 'historique', component: Historic },
    { path: '', component: Analyse },
];
