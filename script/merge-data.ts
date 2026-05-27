import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ────────────────────────────────────────────────────────────────────

type Source = 'FORTUNEO' | 'TRADE_REPUBLIC';
type TransactionType = 'ACHAT' | 'VENTE' | 'DIVIDENDE' | 'VIR' | 'TAXE' | 'LIQUIDATION' | 'CRD' | 'PAI.ITTCPN' | 'DEB' | 'CRE';

interface UnifiedTransaction {
  id: string;
  date: string;
  type: TransactionType;
  ticker: string;
  quantite: number;
  prixUnitaire: number;
  frais: number;
  total: number;
  source: Source;
}

// ── Mapping ──────────────────────────────────────────────────────────────────

const TICKER_MAPPING: Record<string, string> = {
  'AMUNDI NYS.AR.GOLD':                          'GOLD MINERS',
  'AM.MSCI KOREA ETF':                           'MSCI KOREA',
  'AM.S&P500 SW.UCETF':                          'S&P 500',
  'CRD':                                         'FRAIS SRD',
  'ETC AMUNDI PHYS':                             'PHYS GOLD',
  'Rare Earth & Strategic Metals USD (Acc)':     'REMX',
  'VanEck Rare Earth and Strategic Metals UCITS ETF': 'REMX',
  'VAN.CR.BL.IN.USD-A':                         'DAPP',
  'VAN.DEF.USD-A-ACC':                           'DFNS',
  'VAN.GOLD MIN.USD-A':                          'GDX',
  'VAN.OIL SERV.USD-A':                         'OIHV',
  'VAN.R.EAR.ST.USD-A':                         'REMX',
  'VAN.SEM.USD-A-ACC':                           'SMH',
  'VAN.SPACE IN.USD-A':                          'JEDI',
  'VAN.UR.N.TEC.USD-A':                         'NUCL',
  'WIS PERP. BLMBRG N':                         'NATGAZ',
  'WISD.COMM.SILVER':                            'SILVER',
  'WISD.PERP.BRENT':                             'BRENT',
};

// ISIN → Ticker (TAXEs Fortuneo)
const ISIN_MAPPING: Record<string, string> = {
  FR0000120073: 'AIR LIQUIDE',
  FR0000120271: 'TOTALENERGIES SE',
  FR0000120321: 'OREAL',
  FR0000120628: 'AXA',
  FR0000121014: 'LVMH MOET VUITTON',
  FR0000121972: 'SCHNEIDER ELECTRIC',
  FR0000125486: 'VINCI',
  FR0000130809: 'SOCIETE GENERALE',
  FR0000131104: 'BNP PARIBAS ACT.A',
  FR0000133308: 'ORANGE',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPES_WITH_QUANTITY: TransactionType[] = ['ACHAT', 'VENTE', 'DIVIDENDE'];

function resolveTicker(raw: string): string {
  return TICKER_MAPPING[raw] ?? raw;
}

function parseAmount(value: string | undefined): number {
  if (!value) return 0;
  return Math.abs(parseFloat(value.replace(',', '.'))) || 0;
}

function formatDate(dd: string, mm: string, yyyy: string): string {
  return `${yyyy}-${mm}-${dd}`;
}

function readCsv(filePath: string): any[] {
  return parse(fs.readFileSync(filePath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseFortuneoRow(row: any, index: number): UnifiedTransaction | null {
  const libelle: string = row['libellé'];
  if (!libelle) return null;

  const parts = libelle.split(' ');
  let rawType = parts[0] as TransactionType;

  const isDebit = parseAmount(row['Débit']) > 0;
  const isCredit = parseAmount(row['Crédit']) > 0;

  if (rawType === 'VIR') {
    if (isDebit) rawType = 'DEB';
    else if (isCredit) rawType = 'CRE';
  }

  //Gestion LIQUIDATION
  if (rawType === 'LIQUIDATION') {
    const isin = parts.slice(1).join(' ');
    const ticker = ISIN_MAPPING[isin] ?? isin;
    const total = parseAmount(row['Débit']) || parseAmount(row['Crédit']);
    const [day, month, year] = row['Date valeur'].split('/');

    return {
      id: `hist_${index}_${year}${month}`,
      date: formatDate(day, month, year),
      type: 'LIQUIDATION',
      ticker,
      quantite: 0,
      prixUnitaire: 0,
      frais: 0,
      total,
      source: 'FORTUNEO'
    };
  }

  // Gestion TAXE avec ISIN
  if (rawType === 'TAXE') {
    const isin = parts[3];
    const ticker = ISIN_MAPPING[isin] ?? isin;
    const total = parseAmount(row['Débit']) || parseAmount(row['Crédit']);
    const [day, month, year] = row['Date valeur'].split('/');

    return {
      id: `hist_${index}_${year}${month}`,
      date: formatDate(day, month, year),
      type: 'TAXE',
      ticker,
      quantite: 0,
      prixUnitaire: 0,
      frais: 0,
      total,
      source: 'FORTUNEO'
    };
  }

  const hasQuantity = TYPES_WITH_QUANTITY.includes(rawType);
  const quantite = hasQuantity ? Math.abs(Number(parts[1])) || 0 : 0;
  let rawTicker: string;
  if (hasQuantity) {
    rawTicker = parts.slice(2).join(' ');
  } else if (rawType === 'PAI.ITTCPN') {
    rawTicker = parts.slice(2).join(' ');
  } else {
    rawTicker = libelle;
  }
  const ticker = resolveTicker(rawTicker);

  const total = parseAmount(row['Débit']) || parseAmount(row['Crédit']);
  const prixUnitaire = quantite > 0 ? total / quantite : 0;
  const [day, month, year] = row['Date valeur'].split('/');

  return {
    id: `hist_${index}_${year}${month}`,
    date: formatDate(day, month, year),
    type: rawType,
    ticker,
    quantite,
    prixUnitaire,
    frais: 0,
    total,
    source: 'FORTUNEO'
  };
}

const TR_TYPE_MAP: Record<string, TransactionType> = {
  BUY:                       'ACHAT',
  SELL:                      'VENTE',
  TRANSFER_INSTANT_INBOUND:  'VIR',
  DIVIDEND:                  'DIVIDENDE',
};

function parseTradeRepublicRow(row: any): UnifiedTransaction {
  let type = TR_TYPE_MAP[row['type']] ?? row['type'];
  const rawAmount = parseFloat(row['amount']) || 0;

  if (type === 'VIR') {
    type = rawAmount < 0 ? 'DEB' : 'CRE';
  }

  const total = Math.abs(parseFloat(row['amount'])) || 0;
  const quantite = Math.abs(parseFloat(row['shares'])) || 0;

  return {
    id: row['transaction_id'] || `tr_${crypto.randomUUID()}`,
    date: row['date'],
    type,
    ticker: resolveTicker(row['name'] || row['symbol'] || ''),
    quantite,
    prixUnitaire: Math.abs(parseFloat(row['price'])) || 0,
    frais: Math.abs(parseFloat(row['fee'])) || 0,
    total,
    source: 'TRADE_REPUBLIC'
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const fPath  = path.join(dataDir, 'fortuneo.csv');
  const trPath = path.join(dataDir, 'tradeRepublic.csv');

  console.log('Parsing des fichiers...');

  const fortuneoTx = readCsv(fPath)
    .map((row, i) => parseFortuneoRow(row, i))
    .filter((t): t is UnifiedTransaction => t !== null);

  const trTx = readCsv(trPath).map(parseTradeRepublicRow);

  const allTransactions = [...fortuneoTx, ...trTx]
    .map(t => ({ ...t, ticker: resolveTicker(t.ticker) }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const outputPath = path.join(__dirname, '..', 'public', 'portfolio.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allTransactions, null, 2), 'utf-8');

  console.log(`Succès ! ${allTransactions.length} transactions → ${outputPath}`);
}

main();