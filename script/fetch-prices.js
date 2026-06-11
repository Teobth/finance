import YahooFinance from 'yahoo-finance2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Initialisation requise pour la version v3 de la bibliothèque
const yahooFinance = new YahooFinance();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTFOLIO_PATH = path.join(__dirname, '..', 'data', 'portfolio.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'prices.json'); 

// 2. Dictionnaire de correspondance (Libellé de ton fichier -> Ticker Yahoo Finance)
const TICKER_MAPPING = {
  // --- Actions du CAC 40 / Europe ---
  'VINCI': 'DG.PA',
  'BNP PARIBAS ACT.A': 'BNP.PA',
  'SOCIETE GENERALE': 'GLE.PA',
  'TOTALENERGIES SE': 'TTE.PA',
  'ORANGE': 'ORA.PA',
  'AIR LIQUIDE': 'AI.PA',
  'STELLANTIS': 'STLAP.PA',
  'SCHNEIDER ELECTRIC': 'SU.PA',
  'LVMH MOET VUITTON': 'MC.PA',
  'OREAL': 'OR.PA',
  'AXA': 'CS.PA',
  'PHYS GOLD': 'GOLD.PA',

  // --- Actions US ---
  'ALPHABET CL.A': 'GOOGL',
  'NVIDIA': 'NVDA',

  // --- ETFs (Noms longs ou sans suffixe) ---
  'SMH': 'SMH.PA',            // VanEck Semiconductor (Ticker US)
  'DAPP': 'DAPP.PA',          // VanEck Crypto Leaders (Ajuster .PA ou .MI selon votre ETF)
  'REMX': 'REMX.PA',          // VanEck Rare Earth
  'JEDI': 'JEDI.PA',          // VanEck Space Innovators
  'DFNS': 'DFNS.PA',          // VanEck Defense
  'NUCL': 'NUCL.PA',          // VanEck Uranium
  'GDX': 'GDX.PA',            // VanEck Gold Miners
  'OIHV': 'OIHV.PA',          // VanEck Oil Services
  
  // Redirections des libellés longs vers les bons tickers
  'Rare Earth & Strategic Metals USD (Acc)': 'REMX.PA',
  'Space Innovators USD (Acc)': 'JEDI.PA',
  // --- ETF ---
  'GOLD MINERS': 'GLDM.PA',
  'MSCI KOREA':  'KRW.PA',
  'S&P 500':     '500.PA',

  // --- Matières Premières / ETC ---
  'SILVER':      'SLVRP.PA',
  'BRENT':       'BRNT.PA',
  'NATGAZ':      'NGASP.PA'
};

// 2. Liste des lignes à ignorer complètement (Liquidités, comptes, etc.)
const IGNORED_ASSETS = [
  'BANNWARTH TEO',
];

async function generateMonthlyPrices() {
  try {
    console.log('🔄 Lecture du fichier portfolio.json...');
    
    if (!fs.existsSync(PORTFOLIO_PATH)) {
      console.error(`❌ Erreur : Le fichier ${PORTFOLIO_PATH} est introuvable.`);
      return;
    }

    const rawData = fs.readFileSync(PORTFOLIO_PATH, 'utf-8');
    const transactions = JSON.parse(rawData);
    
    // 3. Extraction et filtrage strict pour éliminer les lignes de virement (VIR) et de cash
    const rawTickers = [...new Set(transactions.map(t => t.ticker))].filter(t => t && t.trim() !== '');

    const validTickers = rawTickers.filter(t => {
      const name = t.trim().toUpperCase();
      // On ignore tout ce qui s'apparente à un flux de trésorerie ou des frais
      if (name.startsWith('VIR') || name.startsWith('FRAIS') || name === 'CASH' || name === 'CONVERSION') {
        return false;
      }
      return true;
    });

    if (validTickers.length === 0) {
      console.log('⚠️ Aucun actif boursier valide trouvé dans les transactions.');
      return;
    }

    console.log(`🔎 Actifs identifiés à requêter : ${validTickers.join(', ')}`);

    const finalPrices = {};
    const startDate = '2020-01-01'; 

    for (const rawTicker of validTickers) {
      // Récupération du ticker Yahoo correspondant (ou utilisation du nom brut si absent du dictionnaire)
      const yahooSymbol = TICKER_MAPPING[rawTicker] || rawTicker;
      
      console.log(`📥 Récupération des cours pour "${rawTicker}" via le symbole Yahoo : ${yahooSymbol}...`);
      try {
        const options = {
          period1: startDate,   // ex: new Date('2020-01-01')
          period2: new Date(),  // Remplacer 'undefined' par la date du jour
          interval: '1mo'       // On enlève 'events' s'il est vide
        };

        const history = await yahooFinance.historical(yahooSymbol, options);

        for (const record of history) {
          const date = new Date(record.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!finalPrices[monthKey]) {
            finalPrices[monthKey] = {};
          }

          const price = record.adjClose || record.close;
          
          // IMPORTANT : On stocke le prix avec la clé textuelle d'origine (ex: 'TOTALENERGIES SE')
          // pour que FinanceService Angular s'y retrouve automatiquement sans aucun recalcul.
          finalPrices[monthKey][rawTicker] = Math.round(price * 100) / 100;
        }
      } catch (tickerError) {
        console.error(`⚠️ Impossible de récupérer les données pour ${rawTicker} (${yahooSymbol}) :`, tickerError.message);
      }
    }

    const sortedPrices = {};
    Object.keys(finalPrices).sort().forEach(key => {
      sortedPrices[key] = finalPrices[key];
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sortedPrices, null, 2), 'utf-8');
    console.log(`✅ Succès ! Le fichier a été mis à jour : ${OUTPUT_PATH}`);

  } catch (globalError) {
    console.error('❌ Une erreur critique est survenue dans le script :', globalError);
  }
}

generateMonthlyPrices();