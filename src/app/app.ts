import { Component, inject } from '@angular/core';
import { RouterLinkActive, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FinanceService } from './ts/service_finance';
import { ExcelParserService } from './ts/service_excel-parser';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  imports: [CommonModule, RouterModule, RouterLinkActive],
})
export class AppComponent {

  financeService = inject(FinanceService);
  excelService = inject(ExcelParserService);
  
  constructor() {
    this.excelService.loadTransactions();
  }
}