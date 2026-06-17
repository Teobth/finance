import { Injectable } from '@angular/core';
import {
  ApexChart, ApexPlotOptions, ApexYAxis,
  ApexDataLabels, ApexTooltip, ApexAnnotations,
  ApexXAxis, ApexAxisChartSeries, ApexLegend
} from 'ng-apexcharts';

@Injectable({ providedIn: 'root' })
export class ChartService {

  readonly defaultTooltip: ApexTooltip = {
    shared: true,
    intersect: false,
    marker: { show: false },
    y: { formatter: (val) => `${val.toFixed(2)}€` }
  };

  readonly defaultDataLabels: ApexDataLabels = { enabled: false };

  // Activé ici pour que l'utilisateur comprenne la distinction Réalisé vs Latent
  readonly defaultLegend: ApexLegend = { 
    show: true,
    position: 'top',
    horizontalAlign: 'left'
  };

  readonly zeroLineAnnotation: ApexAnnotations = {
    yaxis: [{ y: 0, borderColor: '#999', borderWidth: 1, strokeDashArray: 4 }]
  };

  barChart(options: { height?: number; width?: number; stacked?: boolean } = {}): ApexChart {
    return {
        type: 'bar',
        height: options.height ?? 350,
        width: options.width,
        stacked: options.stacked ?? true, 
        toolbar: { show: false },
        zoom: { enabled: false },
    };
  }

  barPlotOptions(options: { columnWidth?: string; minBarHeight?: number } = {}): ApexPlotOptions {
    return {
      bar: {
        distributed: false, 
        columnWidth: options.columnWidth ?? '70%',
        borderRadius: 3,
      }
    };
  }

  currencyYAxis(options: { decimals?: number } = {}): ApexYAxis {
    return {
      labels: {
        formatter: (val) => `${val.toFixed(options.decimals ?? 0)}€`
      }
    };
  }

  monthlyXAxis(categories: string[]): ApexXAxis {
    return {
      categories,
      labels: { rotate: -45, style: { fontSize: '11px' } }
    };
  }

  /**
   * Génère les couleurs des séries. 
   * Pour différencier le réalisé du latent, on utilise des couleurs pleines vs des couleurs plus claires/pastels (ou bleutées).
   */
  getChartColors(): string[] {
    return [
      '#2e7d32', // Réalisé Positif (Vente gain) - Vert opaque
      '#d32f2f', // Réalisé Négatif (Vente perte) - Rouge opaque
      '#66bb6a', // Latent Positif - Vert clair / Pastel
      '#ef5350'  // Latent Négatif - Rouge clair / Pastel
    ];
  }

  /**
   * Sépare proprement le Réalisé (ventes) et le Latent en deux séries distinctes
   * pour que le graphique affiche la distinction de couleur.
   */
  realizedVsLatentSeries(realizedValues: number[], latentValues: number[]): ApexAxisChartSeries {
    return [
      {
        name: 'Performance Réalisée (Ventes)',
        data: realizedValues
      },
      {
        name: 'Plus/Moins-values Latentes',
        data: latentValues
      }
    ];
  }

  barSeries(name: string, values: number[]): ApexAxisChartSeries {
    return [{ name, data: values }];
  }

  mixedSeries(
    barName: string, barValues: number[], 
    lineName: string, lineValues: number[]
  ): ApexAxisChartSeries {
    return [
      {
        name: barName,
        type: 'column',
        data: barValues
      },
      {
        name: lineName,
        type: 'line',
        data: lineValues
      }
    ];
  }

  dualCurrencyYAxis(): ApexYAxis[] {
    return [
      {
        seriesName: 'Gain / Perte',
        labels: { formatter: (val) => `${val.toFixed(0)}€` }
      },
      {
        opposite: true,
        seriesName: 'Valorisation',
        labels: { formatter: (val) => `${val.toFixed(0)}€` }
      }
    ];
  }

  customTooltip(
    monthlyData: { month: string; value: number; latentPnL: number; details: { ticker: string; value: number }[] }[],
    showLatent: boolean = true
  ): ApexTooltip {
    return {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }) => {
        const data = monthlyData[dataPointIndex];
        if (!data) return '';

        const [currentYearStr, currentMonthStr] = data.month.split('-');
        const currentYear = parseInt(currentYearStr, 10);
        const currentMonth = parseInt(currentMonthStr, 10);

        // Calcul du cumul réalisé (YTD)
        const realizedYTD = monthlyData.reduce((acc, d) => {
          const [dYear, dMonth] = d.month.split('-').map(Number);
          if (dYear === currentYear && dMonth <= currentMonth) {
            return acc + d.value;
          }
          return acc;
        }, 0);

        const displayedTotal = showLatent ? (data.value + data.latentPnL) : data.value;
        const totalPositive = displayedTotal >= 0;
        const totalColor = totalPositive ? '#2e7d32' : '#d32f2f';
        const totalBg = totalPositive ? '#f1f8f1' : '#fdf3f3';
        const totalSign = totalPositive ? '+' : '';

        // En-tête des transactions effectuées (Réalisé)
        let rows = `
          <div style="padding: 4px 12px; background: #f8fafc; font-size: 0.75em; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
            💰 Opérations Réalisées (Ventes)
          </div>
        `;

        // Liste des lignes de transactions effectives
        if (data.details.length > 0) {
          rows += data.details.map(d => {
            const pos = d.value >= 0;
            const bg = pos ? 'rgba(46,125,50,0.04)' : 'rgba(211,47,47,0.04)';
            const color = pos ? '#2e7d32' : '#d32f2f';
            const sign = pos ? '+' : '';
            const icon = pos ? '▲' : '▼';
            const barWidth = data.value !== 0 ? Math.min(100, Math.abs(d.value / data.value) * 100) : 0;

            return `
            <div style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0; background: ${bg};">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 3px;">
                <span style="color:#444; font-weight:600; font-size:0.9em;">${d.ticker}</span>
                <span style="color:${color}; font-weight:700;">
                  ${icon} ${sign}${d.value.toFixed(2)}€
                </span>
              </div>
              <div style="height:3px; background:#eee; border-radius:2px;">
                <div style="width:${barWidth}%; height:100%; background:${color}; border-radius:2px;"></div>
              </div>
            </div>`;
          }).join('');
        } else {
          rows += `<div style="padding: 10px 12px; color:#999; font-style:italic; text-align:center; font-size:0.85em; background: #fff;">Aucune vente ce mois</div>`;
        }

        // Bloc Latent avec distinction visuelle claire
        if (showLatent) {
          const latentApplique = data.latentPnL + realizedYTD;
          const latentPositive = latentApplique >= 0;
          
          // Changement de couleur : Bleu/Orange ou Vert/Rouge soft pour le distinguer du réalisé strict
          const latentBg = latentPositive ? 'rgba(33,150,243,0.06)' : 'rgba(255,152,0,0.06)';
          const latentColor = latentPositive ? '#1e88e5' : '#f57c00'; 
          const latentSign = latentPositive ? '+' : '';
          const latentIcon = latentPositive ? '📈 ▲' : '📉 ▼';

          rows += `
            <div style="padding: 4px 12px; background: #f8fafc; font-size: 0.75em; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; border-top: 1px dashed #cbd5e1; text-transform: uppercase; margin-top: 5px;">
              ✨ Estimation Portefeuille (Latent)
            </div>
            <div style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; background: ${latentBg};">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2px;">
                <span style="color:#1e293b; font-weight:700; font-size:0.9em;">Plus-value Latente</span>
                <span style="color:${latentColor}; font-weight:800;">
                  ${latentIcon} ${latentSign}${latentApplique.toFixed(2)}€
                </span>
              </div>
              <div style="font-size: 0.75em; color: #64748b; text-align: right;">
                (Dont ${realizedYTD >= 0 ? '+' : ''}${realizedYTD.toFixed(2)}€ réalisés YTD)
              </div>
            </div>`;
        }

        return `
          <div style="background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); min-width: 270px; overflow: hidden; font-family: inherit;">
            <div style="padding: 10px 14px; background: #1976d2; color: white; font-weight: 700; font-size: 0.95em; letter-spacing: 0.05em;">
              ${data.month}
            </div>

            <div>
              ${rows}
            </div>

            <div style="padding: 10px 14px; background: ${totalBg}; border-top: 2px solid ${totalColor}; display: flex; justify-content: space-between; align-items: center;">
              <span style="color:#555; font-weight:600; font-size:0.85em; text-transform:uppercase; letter-spacing:0.05em;">
                ${showLatent ? 'Total Net' : 'Total Réalisé'}
              </span>
              <span style="color:${totalColor}; font-weight:800; font-size:1.1em;">
                ${totalSign}${displayedTotal.toFixed(2)}€
              </span>
            </div>
          </div>`;
      }
    };
  }
}