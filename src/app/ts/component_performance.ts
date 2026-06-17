import { Component, computed, inject, ElementRef, viewChild, signal } from '@angular/core'; // 👈 Ajout de signal
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FinanceService } from './service_finance';
import { ChartService } from './service_chart';

@Component({
  selector: 'app-component-performance',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: '../html/performance.html',
  styleUrl: '../scss/performance.scss',
})

export class Performance {
  private chartWrapper = viewChild<ElementRef>('chartWrapper');

  private financeService = inject(FinanceService);
  private chartService = inject(ChartService);

  globalYearlyStats = computed(() => this.financeService.calculateGlobalYearlyStats());
  private monthlyData = this.financeService.monthlyPnL;

  // Signal pour piloter l'affichage (true = avec latent, false = réalisé uniquement)
  showLatent = signal<boolean>(false);

  // 1. Vos séries se mettent à jour si showLatent change
  chartSeries = computed(() => {
    const series = [
      {
        name: 'Performance Réalisée (Ventes)',
        data: this.monthlyData().map(d => d.value)
      }
    ];

    if (this.showLatent()) {
      series.push({
        name: 'Plus/Moins-values Latentes',
        data: this.monthlyData().map(d => d.latentPnL)
      });
    }

    return series;
  });

  // 2. Gestion dynamique des couleurs de barres (Réalisé vs Latent)
  colors = computed(() => {
    const allColors = this.chartService.getChartColors();
    // Si latent masqué : on ne garde que la couleur du Réalisé (index 0)
    // Si latent affiché : on prend la couleur Réalisé + couleur Latent (index 0 et index 2)
    return this.showLatent() ? [allColors[0], allColors[2]] : [allColors[0]];
  });

  xaxis = computed(() =>
    this.chartService.monthlyXAxis(this.monthlyData().map(d => d.month))
  );

  yaxis = this.chartService.currencyYAxis();

  // On force le stacked: true pour que le latent s'empile proprement sur le réalisé
  chart = computed(() => this.chartService.barChart({ 
    height: 500,
    width: Math.max(900, this.monthlyData().length * 50),
    stacked: true 
  }));
  
  plotOptions = this.chartService.barPlotOptions();
  
  tooltip = computed(() => 
    this.chartService.customTooltip(this.monthlyData(), this.showLatent())
  );

  dataLabels = this.chartService.defaultDataLabels;
  
  // Utilise la légende du service (affichée uniquement si plusieurs séries)
  legend = this.chartService.defaultLegend;

  toggleLatent() {
    this.showLatent.update(value => !value);
  }
}