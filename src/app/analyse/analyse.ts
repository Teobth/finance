import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Transaction } from '../models/transaction';
import { ExcelParserService } from '../services/excel-parser';
import { FinanceService } from '/home/teo/programme/stock-tracker/src/app/services/finance';

@Component({
  selector: 'app-analyse',
  templateUrl: './analyse.html',
  styleUrl: './analyse.scss',
  imports: [
    CommonModule, 
    MatSelectModule, 
    MatFormFieldModule, 
    RouterModule
  ],
})

export class Analyse {
  allTransactions: Transaction[] = [];
  groupedTransactions: { [key: string]: Transaction[] } = {};
  tickers: string[] = [];
  selectedTicker: string | null = null;
  selectedStats: import("/home/teo/programme/stock-tracker/src/app/services/finance").TickerStats | undefined;

  constructor(
    private excelService: ExcelParserService,
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
    ) {}

  async ngOnInit() {
    console.log("Démarrage du chargement...");
    try {
      this.allTransactions = await this.excelService.parseExcel();
      console.log("Transactions reçues :", this.allTransactions);
      
      this.groupData();
      console.log("Titres trouvés (tickers) :", this.tickers);

      this.route.paramMap.subscribe(params => {
        const tickerFromUrl = params.get('ticker');
        if(tickerFromUrl && this.groupedTransactions[tickerFromUrl]) {
          this.applySelection(tickerFromUrl);
        }
      });

      this.cdr.detectChanges();

      this.excelService.transactions = await this.excelService.parseExcel();
    } catch (error) {
      console.error("Erreur lors du chargement de l'Excel :", error);
    }
  }

  groupData() {
    this.groupedTransactions = this.allTransactions.reduce((groups: any, item) => {
      const group = (groups[item.ticker] || []);
      group.push(item);
      groups[item.ticker] = group;
      return groups;
    }, {});

    this.tickers = Object.keys(this.groupedTransactions);
  }

  onTickerChange(ticker: string) {
    this.router.navigate(['/analyse', ticker]);
  }

  private applySelection(ticker: string) {
    this.selectedTicker = ticker;
    const transactions = this.groupedTransactions[ticker] || [];
    this.selectedStats = this.financeService.calculateStats(transactions);
  }

  readonly typeColors: Record<string, string> = {
    'ACHAT': '#2e7d32',
    'VENTE': '#d32f2f',
    'DIVIDENDE': '#1976d2',
    'TAXE': '#757575'
  };
}