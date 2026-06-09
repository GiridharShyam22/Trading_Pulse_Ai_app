const fs = require('fs');
const path = require('path');

const companies = [
  // Big Tech & Cloud
  ["SNOW", "Snowflake Inc.", "Software", 150],
  ["PLTR", "Palantir Technologies", "Software", 25],
  ["CRWD", "CrowdStrike Holdings", "Cybersecurity", 300],
  ["DDOG", "Datadog, Inc.", "Software", 120],
  ["NET", "Cloudflare, Inc.", "IT Services", 80],
  ["RBLX", "Roblox Corporation", "Entertainment", 40],
  ["ROKU", "Roku, Inc.", "Entertainment", 60],
  ["U", "Unity Software", "Software", 30],
  ["ZM", "Zoom Video", "Software", 60],
  ["DOCU", "DocuSign, Inc.", "Software", 55],
  ["TWLO", "Twilio Inc.", "Software", 60],
  ["ZS", "Zscaler, Inc.", "Cybersecurity", 200],
  ["FSLY", "Fastly, Inc.", "IT Services", 15],
  ["OKTA", "Okta, Inc.", "Software", 100],
  ["MNDY", "monday.com", "Software", 220],
  ["ASAN", "Asana, Inc.", "Software", 15],
  ["TEAM", "Atlassian", "Software", 200],
  ["PATH", "UiPath Inc.", "Software", 20],
  ["APP", "AppLovin", "Software", 70],
  ["BSY", "Bentley Systems", "Software", 50],
  
  // E-commerce & Retail
  ["SHOP", "Shopify Inc.", "E-commerce", 70],
  ["EBAY", "eBay Inc.", "E-commerce", 50],
  ["ETSY", "Etsy, Inc.", "E-commerce", 70],
  ["W", "Wayfair Inc.", "E-commerce", 55],
  ["CHWY", "Chewy, Inc.", "E-commerce", 20],
  ["MELI", "MercadoLibre", "E-commerce", 1500],
  ["SE", "Sea Limited", "E-commerce", 50],
  ["PINS", "Pinterest, Inc.", "Social Media", 35],
  ["SNAP", "Snap Inc.", "Social Media", 15],
  ["MATCH", "Match Group", "Social Media", 35],
  ["BMBL", "Bumble Inc.", "Social Media", 12],
  
  // EVs & Auto
  ["RIVN", "Rivian Automotive", "Auto Mfr", 15],
  ["LCID", "Lucid Group", "Auto Mfr", 3],
  ["F", "Ford Motor", "Auto Mfr", 12],
  ["GM", "General Motors", "Auto Mfr", 45],
  ["STLA", "Stellantis N.V.", "Auto Mfr", 25],
  ["TM", "Toyota Motor", "Auto Mfr", 230],
  ["HMC", "Honda Motor", "Auto Mfr", 35],
  
  // Semiconductors & Hardware
  ["AMD", "Advanced Micro Devices", "Semiconductors", 160],
  ["QCOM", "QUALCOMM", "Semiconductors", 170],
  ["TXN", "Texas Instruments", "Semiconductors", 170],
  ["AMAT", "Applied Materials", "Semiconductors", 200],
  ["LRCX", "Lam Research", "Semiconductors", 900],
  ["KLAC", "KLA Corp.", "Semiconductors", 680],
  ["NXPI", "NXP Semiconductors", "Semiconductors", 240],
  ["MCHP", "Microchip Technology", "Semiconductors", 90],
  ["ADI", "Analog Devices", "Semiconductors", 190],
  ["ON", "ON Semiconductor", "Semiconductors", 75],
  ["SWKS", "Skyworks Solutions", "Semiconductors", 100],
  ["QRVO", "Qorvo, Inc.", "Semiconductors", 110],
  ["STX", "Seagate Technology", "Hardware", 90],
  ["WDC", "Western Digital", "Hardware", 70],
  
  // Travel & Leisure
  ["ABNB", "Airbnb, Inc.", "Travel", 160],
  ["BKNG", "Booking Holdings", "Travel", 3500],
  ["EXPE", "Expedia Group", "Travel", 130],
  ["MAR", "Marriott Int.", "Travel", 250],
  ["HLT", "Hilton Worldwide", "Travel", 200],
  ["CCL", "Carnival Corp.", "Leisure", 16],
  ["RCL", "Royal Caribbean", "Leisure", 140],
  ["NCLH", "Norwegian Cruise", "Leisure", 20],
  ["DAL", "Delta Air Lines", "Airlines", 50],
  ["UAL", "United Airlines", "Airlines", 50],
  ["AAL", "American Airlines", "Airlines", 15],
  ["LUV", "Southwest Airlines", "Airlines", 30],
  
  // Payments & Fintech
  ["SQ", "Block, Inc.", "Fintech", 80],
  ["PYPL", "PayPal Holdings", "Fintech", 65],
  ["HOHO", "Robinhood Markets", "Fintech", 20], // Actually HOOD, but using HOHO
  ["SOFI", "SoFi Technologies", "Fintech", 8],
  ["AFRM", "Affirm Holdings", "Fintech", 40],
  ["UPST", "Upstart Holdings", "Fintech", 30],
  ["TOST", "Toast, Inc.", "Fintech", 25],
  ["BILL", "BILL Holdings", "Software", 70],
  ["ADYEN", "Adyen N.V.", "Fintech", 15], // ADYEN.AS normally, keep simple
  
  // Health & Biotech
  ["MRNA", "Moderna, Inc.", "Biotech", 100],
  ["BNTX", "BioNTech SE", "Biotech", 90],
  ["VRTX", "Vertex Pharma", "Biotech", 420],
  ["REGN", "Regeneron", "Biotech", 950],
  ["GILD", "Gilead Sciences", "Biotech", 75],
  ["BIIB", "Biogen Inc.", "Biotech", 220],
  ["ISRG", "Intuitive Surgical", "Medical Dev", 400],
  ["DXCM", "DexCom, Inc.", "Medical Dev", 130],
  ["ALGN", "Align Technology", "Medical Dev", 300],
  ["TDOC", "Teladoc Health", "Health", 15],
  
  // Media & Telecom
  ["DIS", "Walt Disney", "Entertainment", 110],
  ["WBD", "Warner Bros", "Entertainment", 8],
  ["PARA", "Paramount Global", "Entertainment", 12],
  ["SPOT", "Spotify Tech", "Entertainment", 300],
  ["LYV", "Live Nation", "Entertainment", 100],
  ["TMUS", "T-Mobile US", "Telecom", 160],
  
  // Real Estate & REITs
  ["PLD", "Prologis", "Real Estate", 130],
  ["AMT", "American Tower", "Real Estate", 190],
  ["CCI", "Crown Castle", "Real Estate", 110],
  ["EQIX", "Equinix", "Real Estate", 800],
  ["SPG", "Simon Property", "Real Estate", 150],
  ["O", "Realty Income", "Real Estate", 55],
  
  // Food & Beverage
  ["SBUX", "Starbucks", "Restaurants", 90],
  ["MCD", "McDonald's", "Restaurants", 280],
  ["CMG", "Chipotle", "Restaurants", 2900],
  ["DPZ", "Domino's Pizza", "Restaurants", 500],
  ["YUM", "Yum! Brands", "Restaurants", 140],
  ["KO", "Coca-Cola", "Beverages", 60],
  ["PEP", "PepsiCo", "Beverages", 170],
  ["KDP", "Keurig Dr Pepper", "Beverages", 30],
  ["MNST", "Monster Beverage", "Beverages", 55],
  
  // European & Global
  ["LVMUY", "LVMH", "Luxury", 170],
  ["NSRGY", "Nestlé S.A.", "Consumer", 105],
  ["ASML", "ASML Holding", "Semiconductors", 950],
  ["SAP", "SAP SE", "Software", 190],
  ["TTE", "TotalEnergies", "Energy", 70],
  ["SNY", "Sanofi", "Healthcare", 50],
  ["SIEGY", "Siemens AG", "Industrials", 95],
  ["BCE", "BCE Inc.", "Telecom", 35],
  ["RY", "Royal Bank CA", "Banking", 100],
  ["TD", "Toronto-Dominion", "Banking", 60],
  ["BNS", "Bank of Nova Scotia", "Banking", 50],
  ["BMO", "Bank of Montreal", "Banking", 95],
  ["CNI", "Canadian National", "Transport", 130],
  ["CP", "Canadian Pacific", "Transport", 85],
  
  // Retail & Consumer
  ["TGT", "Target", "Retail", 170],
  ["HD", "Home Depot", "Retail", 350],
  ["LOW", "Lowe's", "Retail", 240], // Might already exist, will check
  ["DG", "Dollar General", "Retail", 150],
  ["DLTR", "Dollar Tree", "Retail", 130],
  ["TSCO", "Tractor Supply", "Retail", 260],
  ["ORLY", "O'Reilly Auto", "Retail", 1100],
  ["AZO", "AutoZone", "Retail", 3000],
  
  // Industrials & Defense
  ["LMT", "Lockheed Martin", "Defense", 450],
  ["RTX", "RTX Corp", "Defense", 100],
  ["NOC", "Northrop Grumman", "Defense", 460],
  ["GD", "General Dynamics", "Defense", 280],
  ["BA", "Boeing", "Aerospace", 200],
  ["HON", "Honeywell", "Industrials", 200], // Check
  ["CAT", "Caterpillar", "Industrials", 350],
  ["DE", "Deere & Co", "Industrials", 400],
  ["UNP", "Union Pacific", "Transport", 240],
  ["CSX", "CSX Corp", "Transport", 35],
  ["NSC", "Norfolk Southern", "Transport", 250],
  ["FDX", "FedEx", "Transport", 260],
  
  // Energy & Materials
  ["XOM", "Exxon Mobil", "Energy", 115],
  ["CVX", "Chevron", "Energy", 160],
  ["COP", "ConocoPhillips", "Energy", 120],
  ["EOG", "EOG Resources", "Energy", 130],
  ["SLB", "Schlumberger", "Energy", 50],
  ["HAL", "Halliburton", "Energy", 35],
  ["NUE", "Nucor", "Materials", 190],
  ["FCX", "Freeport-McMoRan", "Materials", 45],
  ["NEM", "Newmont", "Materials", 42],
  ["APD", "Air Products", "Materials", 240],
  ["ECL", "Ecolab", "Materials", 230], // Check
  
  // Additional Tech & SaaS
  ["NOW", "ServiceNow", "Software", 750], // Check
  ["SNPS", "Synopsys", "Software", 550],
  ["CDNS", "Cadence Design", "Software", 300],
  ["FTNT", "Fortinet", "Cybersecurity", 65],
  ["PANW", "Palo Alto Net", "Cybersecurity", 300],
  ["WDAY", "Workday", "Software", 280],
  ["VRSK", "Verisk Analytics", "Software", 240],
  ["CTSH", "Cognizant", "IT Services", 75],
  ["IT", "Gartner", "IT Services", 460],
  
  // Additional India
  ["TCS", "Tata Consultancy", "IT Services", 4000],
  ["RELIANCE", "Reliance Ind.", "Conglomerate", 2900],
  ["HDFCBANK", "HDFC Bank", "Banking", 1500],
  ["ICICIBANK", "ICICI Bank", "Banking", 1100],
  ["SBIN", "State Bank India", "Banking", 800],
  ["BHARTIARTL", "Bharti Airtel", "Telecom", 1300],
  ["ITC", "ITC Limited", "Consumer", 430],
  ["L&T", "Larsen & Toubro", "Industrials", 3500],
  ["ASIANPAINT", "Asian Paints", "Materials", 2900],
  ["MARUTI", "Maruti Suzuki", "Auto Mfr", 12000],
  ["SUNPHARMA", "Sun Pharma", "Healthcare", 1500],
  ["TITAN", "Titan Company", "Consumer", 3300],
  ["ULTRACEMCO", "UltraTech", "Materials", 9800],
  ["NTPC", "NTPC Limited", "Utilities", 350],
  ["TATAMOTORS", "Tata Motors", "Auto Mfr", 1000],
  ["POWERGRID", "Power Grid", "Utilities", 300],
  ["WIPRO", "Wipro Limited", "IT Services", 450],
  ["M&M", "Mahindra", "Auto Mfr", 2500], // Check
  ["ADANIENT", "Adani Ent.", "Conglomerate", 3200],
  ["ADANIPORTS", "Adani Ports", "Transport", 1300],
  ["BAJAJFINSV", "Bajaj Finserv", "Financials", 1600], // Check
  ["HCLTECH", "HCL Tech", "IT Services", 1350], // Check
  
  // Fillers to hit 200 roughly
  ["M", "Macy's", "Retail", 20],
  ["JWN", "Nordstrom", "Retail", 20],
  ["KSS", "Kohl's", "Retail", 25],
  ["GPS", "Gap Inc.", "Retail", 22],
  ["URBN", "Urban Outfitters", "Retail", 40],
  ["AEO", "American Eagle", "Retail", 22],
  ["ANF", "Abercrombie", "Retail", 130],
  ["CROX", "Crocs", "Retail", 140],
  ["SKX", "Skechers", "Retail", 60],
  ["UAA", "Under Armour", "Retail", 7],
  ["LULU", "Lululemon", "Retail", 380],
  ["VFC", "VF Corp", "Retail", 15],
  ["LEVI", "Levi Strauss", "Retail", 20],
  ["RACE", "Ferrari N.V.", "Auto Mfr", 430],
  ["PFE", "Pfizer", "Healthcare", 28],
  ["BMY", "Bristol-Myers", "Healthcare", 50],
  ["ABBV", "AbbVie", "Healthcare", 160],
  ["LLY", "Eli Lilly", "Healthcare", 750],
  ["JNJ", "Johnson & Johnson", "Healthcare", 150], // Check
  ["UNH", "UnitedHealth", "Healthcare", 500],
  ["CVS", "CVS Health", "Healthcare", 75],
  ["CI", "Cigna", "Healthcare", 340],
  ["ELV", "Elevance Health", "Healthcare", 500],
  ["HUM", "Humana", "Healthcare", 340],
  ["CNC", "Centene", "Healthcare", 75],
  ["ZBH", "Zimmer Biomet", "Medical Dev", 120],
  ["BSX", "Boston Scientific", "Medical Dev", 65],
  ["SYK", "Stryker", "Medical Dev", 340], // Check
  ["MDT", "Medtronic", "Medical Dev", 85],
  ["BAX", "Baxter", "Medical Dev", 40],
  ["A", "Agilent", "Healthcare", 140],
  ["TMO", "Thermo Fisher", "Healthcare", 580],
  ["DHR", "Danaher", "Healthcare", 250],
  ["IQV", "IQVIA", "Healthcare", 240],
  ["ILMN", "Illumina", "Healthcare", 130],
  ["BWA", "BorgWarner", "Auto Parts", 35],
  ["APTV", "Aptiv PLC", "Auto Parts", 80],
  ["ALV", "Autoliv", "Auto Parts", 110],
  ["MGA", "Magna Int.", "Auto Parts", 50],
  ["HAS", "Hasbro", "Entertainment", 50],
  ["MAT", "Mattel", "Entertainment", 20],
  ["EA", "Electronic Arts", "Entertainment", 130],
  ["TTWO", "Take-Two", "Entertainment", 150],
  ["WBD", "Warner Bros", "Entertainment", 8], // Check
  ["LYA", "Live Nation", "Entertainment", 100], // Check
  ["SIRI", "SiriusXM", "Telecom", 4],
  ["CHTR", "Charter Comm", "Telecom", 290],
  ["CMCSA", "Comcast", "Telecom", 42] // Check
];

// Backend
const backendPath = path.join(__dirname, 'backend/services/binanceSocket.js');
let backendContent = fs.readFileSync(backendPath, 'utf8');

// Parse existing symbols to avoid duplicates
const existingSymbols = new Set();
const configMatch = backendContent.match(/export const SYMBOLS_CONFIG = {([\s\S]*?)};\n\nexport const ALL_SYMBOLS/);
if (configMatch) {
  const matches = configMatch[1].matchAll(/"([^"]+)":/g);
  for (const m of matches) {
    existingSymbols.add(m[1]);
  }
}

// Prepare backend injections
let backendInject = "";
let frontendInject = "";

let addedCount = 0;
for (const [sym, name, industry, price] of companies) {
  if (!existingSymbols.has(sym)) {
    backendInject += `  "${sym}": { "basePrice": ${price}, "source": "simulator" },\n`;
    frontendInject += `  "${sym}": { name: "${name}", type: "stock", region: "Global", sector: "${industry}" },\n`;
    existingSymbols.add(sym); // Prevent dupes in same run
    addedCount++;
  }
}

console.log(`Adding ${addedCount} companies...`);

// Inject Backend
backendContent = backendContent.replace(
  /(\s*)"HCLTECH": \{ "basePrice": 1350, "source": "simulator" \}\n\};/,
  `$1"HCLTECH": { "basePrice": 1350, "source": "simulator" },\n${backendInject.trimEnd()}\n};`
);
fs.writeFileSync(backendPath, backendContent);

// Inject Frontend
const frontendPath = path.join(__dirname, 'frontend/src/App.jsx');
let frontendContent = fs.readFileSync(frontendPath, 'utf8');

frontendContent = frontendContent.replace(
  /(\s*)"HCLTECH": \{ name: "HCL Technologies", type: "stock", region: "IN", sector: "IT Services" \}\n\};/,
  `$1"HCLTECH": { name: "HCL Technologies", type: "stock", region: "IN", sector: "IT Services" },\n${frontendInject.trimEnd()}\n};`
);
fs.writeFileSync(frontendPath, frontendContent);

console.log('Successfully injected.');
