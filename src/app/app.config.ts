import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    providePrimeNG({
        theme: {
            preset: Aura,
            options: {
                colorScheme: 'light',
                primaryColor: '#007ad9',
                secondaryColor: '#6c757d',
                successColor: '#28a745',
                infoColor: '#17a2b8',
                warningColor: '#ffc107',
                errorColor: '#dc3545',
                darkModeSelector: 'none'
            }
        }
    })
  ]
};
