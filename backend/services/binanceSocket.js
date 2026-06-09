import WebSocket from "ws";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Tick from "../models/Tick.js";
import { getActiveSentiment } from "./newsService.js";

/**
 * Binance & Stock WebSocket Service (v3 — MongoDB Time Series + 200 Assets)
 *
 * - Stores all ticks in MongoDB `Tick` collection in batches every 5s.
 * - Keeps `latestPrices` in RAM for fast socket emits.
 */

const SYMBOLS_CONFIG = {
  "BTCUSDT": { "basePrice": 67500, "source": "binance" },
  "ETHUSDT": { "basePrice": 3450, "source": "binance" },
  "BNBUSDT": { "basePrice": 600, "source": "binance" },
  "SOLUSDT": { "basePrice": 150, "source": "binance" },
  "XRPUSDT": { "basePrice": 0.5, "source": "binance" },
  "ADAUSDT": { "basePrice": 0.4, "source": "binance" },
  "DOGEUSDT": { "basePrice": 0.1, "source": "binance" },
  "DOTUSDT": { "basePrice": 6, "source": "binance" },
  "MATICUSDT": { "basePrice": 0.7, "source": "binance" },
  "LINKUSDT": { "basePrice": 14, "source": "binance" },
  "SHIBUSDT": { "basePrice": 0.00002, "source": "binance" },
  "LTCUSDT": { "basePrice": 80, "source": "binance" },
  "TRXUSDT": { "basePrice": 0.12, "source": "binance" },
  "AVAXUSDT": { "basePrice": 35, "source": "binance" },
  "UNIUSDT": { "basePrice": 7, "source": "binance" },
  "ATOMUSDT": { "basePrice": 8, "source": "binance" },
  "XMRUSDT": { "basePrice": 120, "source": "binance" },
  "XLMUSDT": { "basePrice": 0.1, "source": "binance" },
  "BCHUSDT": { "basePrice": 450, "source": "binance" },
  "ALGOUSDT": { "basePrice": 0.2, "source": "binance" },
  "DVN": { "basePrice": 50, "source": "finnhub" },
  "PEP": { "basePrice": 170, "source": "finnhub" },
  "PLTR": { "basePrice": 22, "source": "finnhub" },
  "C": { "basePrice": 60, "source": "finnhub" },
  "BA": { "basePrice": 190, "source": "finnhub" },
  "CSCO": { "basePrice": 48, "source": "finnhub" },
  "FCX": { "basePrice": 45, "source": "finnhub" },
  "MCD": { "basePrice": 280, "source": "finnhub" },
  "NEE": { "basePrice": 65, "source": "finnhub" },
  "MRO": { "basePrice": 28, "source": "finnhub" },
  "CTRA": { "basePrice": 28, "source": "finnhub" },
  "ABBV": { "basePrice": 160, "source": "finnhub" },
  "EL": { "basePrice": 140, "source": "finnhub" },
  "BKNG": { "basePrice": 3800, "source": "finnhub" },
  "BDX": { "basePrice": 240, "source": "finnhub" },
  "TGT": { "basePrice": 160, "source": "finnhub" },
  "EOG": { "basePrice": 130, "source": "finnhub" },
  "GOOGL": { "basePrice": 170, "source": "finnhub" },
  "APD": { "basePrice": 250, "source": "finnhub" },
  "DG": { "basePrice": 150, "source": "finnhub" },
  "GD": { "basePrice": 280, "source": "finnhub" },
  "FIS": { "basePrice": 75, "source": "finnhub" },
  "JPM": { "basePrice": 190, "source": "finnhub" },
  "TJX": { "basePrice": 105, "source": "finnhub" },
  "AON": { "basePrice": 310, "source": "finnhub" },
  "DHR": { "basePrice": 250, "source": "finnhub" },
  "HUM": { "basePrice": 320, "source": "finnhub" },
  "ADI": { "basePrice": 220, "source": "finnhub" },
  "VRTX": { "basePrice": 450, "source": "finnhub" },
  "ORCL": { "basePrice": 120, "source": "finnhub" },
  "ICE": { "basePrice": 130, "source": "finnhub" },
  "EMR": { "basePrice": 110, "source": "finnhub" },
  "ABT": { "basePrice": 105, "source": "finnhub" },
  "UNH": { "basePrice": 500, "source": "finnhub" },
  "HAL": { "basePrice": 38, "source": "finnhub" },
  "PGR": { "basePrice": 200, "source": "finnhub" },
  "VLO": { "basePrice": 160, "source": "finnhub" },
  "AMZN": { "basePrice": 180, "source": "finnhub" },
  "QCOM": { "basePrice": 200, "source": "finnhub" },
  "WMB": { "basePrice": 40, "source": "finnhub" },
  "COP": { "basePrice": 120, "source": "finnhub" },
  "HES": { "basePrice": 150, "source": "finnhub" },
  "BSX": { "basePrice": 70, "source": "finnhub" },
  "TMO": { "basePrice": 580, "source": "finnhub" },
  "MPC": { "basePrice": 180, "source": "finnhub" },
  "ITW": { "basePrice": 250, "source": "finnhub" },
  "AXP": { "basePrice": 230, "source": "finnhub" },
  "SLB": { "basePrice": 50, "source": "finnhub" },
  "META": { "basePrice": 490, "source": "finnhub" },
  "CVS": { "basePrice": 60, "source": "finnhub" },
  "MSFT": { "basePrice": 415, "source": "finnhub" },
  "KO": { "basePrice": 60, "source": "finnhub" },
  "MDLZ": { "basePrice": 70, "source": "finnhub" },
  "TXN": { "basePrice": 190, "source": "finnhub" },
  "BLK": { "basePrice": 800, "source": "finnhub" },
  "SO": { "basePrice": 75, "source": "finnhub" },
  "PFE": { "basePrice": 28, "source": "finnhub" },
  "CSX": { "basePrice": 35, "source": "finnhub" },
  "NOC": { "basePrice": 460, "source": "finnhub" },
  "LMT": { "basePrice": 460, "source": "finnhub" },
  "HD": { "basePrice": 340, "source": "finnhub" },
  "AMD": { "basePrice": 160, "source": "finnhub" },
  "ISRG": { "basePrice": 400, "source": "finnhub" },
  "AMAT": { "basePrice": 210, "source": "finnhub" },
  "REGN": { "basePrice": 980, "source": "finnhub" },
  "FANG": { "basePrice": 190, "source": "finnhub" },
  "LOW": { "basePrice": 230, "source": "finnhub" },
  "KMI": { "basePrice": 20, "source": "finnhub" },
  "INTC": { "basePrice": 30, "source": "finnhub" },
  "NOW": { "basePrice": 750, "source": "finnhub" },
  "HON": { "basePrice": 200, "source": "finnhub" },
  "VZ": { "basePrice": 40, "source": "finnhub" },
  "FISV": { "basePrice": 150, "source": "finnhub" },
  "NKE": { "basePrice": 95, "source": "finnhub" },
  "WM": { "basePrice": 210, "source": "finnhub" },
  "PM": { "basePrice": 100, "source": "finnhub" },
  "NEM": { "basePrice": 42, "source": "finnhub" },
  "MRK": { "basePrice": 130, "source": "finnhub" },
  "ZTS": { "basePrice": 170, "source": "finnhub" },
  "SYK": { "basePrice": 340, "source": "finnhub" },
  "NVDA": { "basePrice": 900, "source": "finnhub" },
  "NFLX": { "basePrice": 600, "source": "finnhub" },
  "SPGI": { "basePrice": 420, "source": "finnhub" },
  "T": { "basePrice": 18, "source": "finnhub" },
  "GE": { "basePrice": 160, "source": "finnhub" },
  "MA": { "basePrice": 460, "source": "finnhub" },
  "MCO": { "basePrice": 400, "source": "finnhub" },
  "OXY": { "basePrice": 62, "source": "finnhub" },
  "AVGO": { "basePrice": 1300, "source": "finnhub" },
  "MMC": { "basePrice": 205, "source": "finnhub" },
  "UPS": { "basePrice": 140, "source": "finnhub" },
  "GS": { "basePrice": 440, "source": "finnhub" },
  "AAPL": { "basePrice": 185, "source": "finnhub" },
  "CRM": { "basePrice": 270, "source": "finnhub" },
  "CMCSA": { "basePrice": 40, "source": "finnhub" },
  "ECL": { "basePrice": 230, "source": "finnhub" },
  "PXD": { "basePrice": 260, "source": "finnhub" },
  "COST": { "basePrice": 780, "source": "finnhub" },
  "ACN": { "basePrice": 300, "source": "finnhub" },
  "WMT": { "basePrice": 60, "source": "finnhub" },
  "BAC": { "basePrice": 38, "source": "finnhub" },
  "PG": { "basePrice": 165, "source": "finnhub" },
  "COIN": { "basePrice": 200, "source": "finnhub" },
  "JNJ": { "basePrice": 150, "source": "finnhub" },
  "LIN": { "basePrice": 430, "source": "finnhub" },
  "CB": { "basePrice": 250, "source": "finnhub" },
  "CVX": { "basePrice": 160, "source": "finnhub" },
  "GILD": { "basePrice": 65, "source": "finnhub" },
  "V": { "basePrice": 270, "source": "finnhub" },
  "ADBE": { "basePrice": 480, "source": "finnhub" },
  "KLAC": { "basePrice": 750, "source": "finnhub" },
  "TSLA": { "basePrice": 175, "source": "finnhub" },
  "MDT": { "basePrice": 80, "source": "finnhub" },
  "CAT": { "basePrice": 350, "source": "finnhub" },
  "DE": { "basePrice": 400, "source": "finnhub" },
  "IBM": { "basePrice": 170, "source": "finnhub" },
  "ASIANPAINT": { "basePrice": 2800, "source": "simulator" },
  "APOLLOHOSP": { "basePrice": 6000, "source": "simulator" },
  "BEL": { "basePrice": 200, "source": "simulator" },
  "MARUTI": { "basePrice": 12000, "source": "simulator" },
  "CIPLA": { "basePrice": 1400, "source": "simulator" },
  "TATA MOTORS": { "basePrice": 1000, "source": "simulator" },
  "HINDALCO": { "basePrice": 600, "source": "simulator" },
  "RELIANCE": { "basePrice": 2900, "source": "simulator" },
  "JSWSTEEL": { "basePrice": 850, "source": "simulator" },
  "TECHM": { "basePrice": 1250, "source": "simulator" },
  "SBIN": { "basePrice": 800, "source": "simulator" },
  "ICICIBANK": { "basePrice": 1100, "source": "simulator" },
  "KOTAKBANK": { "basePrice": 1700, "source": "simulator" },
  "ULTRACEMCO": { "basePrice": 9800, "source": "simulator" },
  "POWERGRID": { "basePrice": 300, "source": "simulator" },
  "NTPC": { "basePrice": 350, "source": "simulator" },
  "EICHERMOT": { "basePrice": 4500, "source": "simulator" },
  "CHOLAFIN": { "basePrice": 1200, "source": "simulator" },
  "HDFCBANK": { "basePrice": 1500, "source": "simulator" },
  "BRITANNIA": { "basePrice": 4800, "source": "simulator" },
  "BAJAJ-AUTO": { "basePrice": 9000, "source": "simulator" },
  "SHREECEM": { "basePrice": 25000, "source": "simulator" },
  "UPL": { "basePrice": 500, "source": "simulator" },
  "BHARTIARTL": { "basePrice": 1300, "source": "simulator" },
  "AXISBANK": { "basePrice": 1150, "source": "simulator" },
  "TITAN": { "basePrice": 3500, "source": "simulator" },
  "NESTLEIND": { "basePrice": 2500, "source": "simulator" },
  "HEROMOTOCO": { "basePrice": 4600, "source": "simulator" },
  "ITC": { "basePrice": 430, "source": "simulator" },
  "LT": { "basePrice": 3600, "source": "simulator" },
  "TRENT": { "basePrice": 4000, "source": "simulator" },
  "TATASTEEL": { "basePrice": 160, "source": "simulator" },
  "SUNPHARMA": { "basePrice": 1500, "source": "simulator" },
  "TATACONSUM": { "basePrice": 1100, "source": "simulator" },
  "INDUSINDBK": { "basePrice": 1400, "source": "simulator" },
  "HDFCLIFE": { "basePrice": 600, "source": "simulator" },
  "ADANIPORTS": { "basePrice": 1350, "source": "simulator" },
  "GRASIM": { "basePrice": 2300, "source": "simulator" },
  "BPCL": { "basePrice": 600, "source": "simulator" },
  "DIVISLAB": { "basePrice": 3800, "source": "simulator" },
  "WIPRO": { "basePrice": 450, "source": "simulator" },
  "DRREDDY": { "basePrice": 6000, "source": "simulator" },
  "TCS": { "basePrice": 3800, "source": "simulator" },
  "ADANIENT": { "basePrice": 3200, "source": "simulator" },
  "HINDUNILVR": { "basePrice": 2300, "source": "simulator" },
  "BAJAJFINSV": { "basePrice": 1600, "source": "simulator" },
  "COALINDIA": { "basePrice": 450, "source": "simulator" },
  "ONGC": { "basePrice": 270, "source": "simulator" },
  "M&M": { "basePrice": 2000, "source": "simulator" },
  "SBILIFE": { "basePrice": 1400, "source": "simulator" },
  "BAJFINANCE": { "basePrice": 7000, "source": "simulator" },
  "INFY": { "basePrice": 1400, "source": "simulator" },
  "HCLTECH": { "basePrice": 1350, "source": "simulator" },
  "SNOW": { "basePrice": 150, "source": "simulator" },
  "PLTR": { "basePrice": 25, "source": "simulator" },
  "CRWD": { "basePrice": 300, "source": "simulator" },
  "DDOG": { "basePrice": 120, "source": "simulator" },
  "NET": { "basePrice": 80, "source": "simulator" },
  "RBLX": { "basePrice": 40, "source": "simulator" },
  "ROKU": { "basePrice": 60, "source": "simulator" },
  "U": { "basePrice": 30, "source": "simulator" },
  "ZM": { "basePrice": 60, "source": "simulator" },
  "DOCU": { "basePrice": 55, "source": "simulator" },
  "TWLO": { "basePrice": 60, "source": "simulator" },
  "ZS": { "basePrice": 200, "source": "simulator" },
  "FSLY": { "basePrice": 15, "source": "simulator" },
  "OKTA": { "basePrice": 100, "source": "simulator" },
  "MNDY": { "basePrice": 220, "source": "simulator" },
  "ASAN": { "basePrice": 15, "source": "simulator" },
  "TEAM": { "basePrice": 200, "source": "simulator" },
  "PATH": { "basePrice": 20, "source": "simulator" },
  "APP": { "basePrice": 70, "source": "simulator" },
  "BSY": { "basePrice": 50, "source": "simulator" },
  "SHOP": { "basePrice": 70, "source": "simulator" },
  "EBAY": { "basePrice": 50, "source": "simulator" },
  "ETSY": { "basePrice": 70, "source": "simulator" },
  "W": { "basePrice": 55, "source": "simulator" },
  "CHWY": { "basePrice": 20, "source": "simulator" },
  "MELI": { "basePrice": 1500, "source": "simulator" },
  "SE": { "basePrice": 50, "source": "simulator" },
  "PINS": { "basePrice": 35, "source": "simulator" },
  "SNAP": { "basePrice": 15, "source": "simulator" },
  "MATCH": { "basePrice": 35, "source": "simulator" },
  "BMBL": { "basePrice": 12, "source": "simulator" },
  "RIVN": { "basePrice": 15, "source": "simulator" },
  "LCID": { "basePrice": 3, "source": "simulator" },
  "F": { "basePrice": 12, "source": "simulator" },
  "GM": { "basePrice": 45, "source": "simulator" },
  "STLA": { "basePrice": 25, "source": "simulator" },
  "TM": { "basePrice": 230, "source": "simulator" },
  "HMC": { "basePrice": 35, "source": "simulator" },
  "AMD": { "basePrice": 160, "source": "simulator" },
  "QCOM": { "basePrice": 170, "source": "simulator" },
  "TXN": { "basePrice": 170, "source": "simulator" },
  "AMAT": { "basePrice": 200, "source": "simulator" },
  "LRCX": { "basePrice": 900, "source": "simulator" },
  "KLAC": { "basePrice": 680, "source": "simulator" },
  "NXPI": { "basePrice": 240, "source": "simulator" },
  "MCHP": { "basePrice": 90, "source": "simulator" },
  "ADI": { "basePrice": 190, "source": "simulator" },
  "ON": { "basePrice": 75, "source": "simulator" },
  "SWKS": { "basePrice": 100, "source": "simulator" },
  "QRVO": { "basePrice": 110, "source": "simulator" },
  "STX": { "basePrice": 90, "source": "simulator" },
  "WDC": { "basePrice": 70, "source": "simulator" },
  "ABNB": { "basePrice": 160, "source": "simulator" },
  "BKNG": { "basePrice": 3500, "source": "simulator" },
  "EXPE": { "basePrice": 130, "source": "simulator" },
  "MAR": { "basePrice": 250, "source": "simulator" },
  "HLT": { "basePrice": 200, "source": "simulator" },
  "CCL": { "basePrice": 16, "source": "simulator" },
  "RCL": { "basePrice": 140, "source": "simulator" },
  "NCLH": { "basePrice": 20, "source": "simulator" },
  "DAL": { "basePrice": 50, "source": "simulator" },
  "UAL": { "basePrice": 50, "source": "simulator" },
  "AAL": { "basePrice": 15, "source": "simulator" },
  "LUV": { "basePrice": 30, "source": "simulator" },
  "SQ": { "basePrice": 80, "source": "simulator" },
  "PYPL": { "basePrice": 65, "source": "simulator" },
  "HOHO": { "basePrice": 20, "source": "simulator" },
  "SOFI": { "basePrice": 8, "source": "simulator" },
  "AFRM": { "basePrice": 40, "source": "simulator" },
  "UPST": { "basePrice": 30, "source": "simulator" },
  "TOST": { "basePrice": 25, "source": "simulator" },
  "BILL": { "basePrice": 70, "source": "simulator" },
  "ADYEN": { "basePrice": 15, "source": "simulator" },
  "MRNA": { "basePrice": 100, "source": "simulator" },
  "BNTX": { "basePrice": 90, "source": "simulator" },
  "VRTX": { "basePrice": 420, "source": "simulator" },
  "REGN": { "basePrice": 950, "source": "simulator" },
  "GILD": { "basePrice": 75, "source": "simulator" },
  "BIIB": { "basePrice": 220, "source": "simulator" },
  "ISRG": { "basePrice": 400, "source": "simulator" },
  "DXCM": { "basePrice": 130, "source": "simulator" },
  "ALGN": { "basePrice": 300, "source": "simulator" },
  "TDOC": { "basePrice": 15, "source": "simulator" },
  "DIS": { "basePrice": 110, "source": "simulator" },
  "WBD": { "basePrice": 8, "source": "simulator" },
  "PARA": { "basePrice": 12, "source": "simulator" },
  "SPOT": { "basePrice": 300, "source": "simulator" },
  "LYV": { "basePrice": 100, "source": "simulator" },
  "TMUS": { "basePrice": 160, "source": "simulator" },
  "PLD": { "basePrice": 130, "source": "simulator" },
  "AMT": { "basePrice": 190, "source": "simulator" },
  "CCI": { "basePrice": 110, "source": "simulator" },
  "EQIX": { "basePrice": 800, "source": "simulator" },
  "SPG": { "basePrice": 150, "source": "simulator" },
  "O": { "basePrice": 55, "source": "simulator" },
  "SBUX": { "basePrice": 90, "source": "simulator" },
  "MCD": { "basePrice": 280, "source": "simulator" },
  "CMG": { "basePrice": 2900, "source": "simulator" },
  "DPZ": { "basePrice": 500, "source": "simulator" },
  "YUM": { "basePrice": 140, "source": "simulator" },
  "KO": { "basePrice": 60, "source": "simulator" },
  "PEP": { "basePrice": 170, "source": "simulator" },
  "KDP": { "basePrice": 30, "source": "simulator" },
  "MNST": { "basePrice": 55, "source": "simulator" },
  "LVMUY": { "basePrice": 170, "source": "simulator" },
  "NSRGY": { "basePrice": 105, "source": "simulator" },
  "ASML": { "basePrice": 950, "source": "simulator" },
  "SAP": { "basePrice": 190, "source": "simulator" },
  "TTE": { "basePrice": 70, "source": "simulator" },
  "SNY": { "basePrice": 50, "source": "simulator" },
  "SIEGY": { "basePrice": 95, "source": "simulator" },
  "BCE": { "basePrice": 35, "source": "simulator" },
  "RY": { "basePrice": 100, "source": "simulator" },
  "TD": { "basePrice": 60, "source": "simulator" },
  "BNS": { "basePrice": 50, "source": "simulator" },
  "BMO": { "basePrice": 95, "source": "simulator" },
  "CNI": { "basePrice": 130, "source": "simulator" },
  "CP": { "basePrice": 85, "source": "simulator" },
  "TGT": { "basePrice": 170, "source": "simulator" },
  "HD": { "basePrice": 350, "source": "simulator" },
  "LOW": { "basePrice": 240, "source": "simulator" },
  "DG": { "basePrice": 150, "source": "simulator" },
  "DLTR": { "basePrice": 130, "source": "simulator" },
  "TSCO": { "basePrice": 260, "source": "simulator" },
  "ORLY": { "basePrice": 1100, "source": "simulator" },
  "AZO": { "basePrice": 3000, "source": "simulator" },
  "LMT": { "basePrice": 450, "source": "simulator" },
  "RTX": { "basePrice": 100, "source": "simulator" },
  "NOC": { "basePrice": 460, "source": "simulator" },
  "GD": { "basePrice": 280, "source": "simulator" },
  "BA": { "basePrice": 200, "source": "simulator" },
  "HON": { "basePrice": 200, "source": "simulator" },
  "CAT": { "basePrice": 350, "source": "simulator" },
  "DE": { "basePrice": 400, "source": "simulator" },
  "UNP": { "basePrice": 240, "source": "simulator" },
  "CSX": { "basePrice": 35, "source": "simulator" },
  "NSC": { "basePrice": 250, "source": "simulator" },
  "FDX": { "basePrice": 260, "source": "simulator" },
  "XOM": { "basePrice": 115, "source": "simulator" },
  "CVX": { "basePrice": 160, "source": "simulator" },
  "COP": { "basePrice": 120, "source": "simulator" },
  "EOG": { "basePrice": 130, "source": "simulator" },
  "SLB": { "basePrice": 50, "source": "simulator" },
  "HAL": { "basePrice": 35, "source": "simulator" },
  "NUE": { "basePrice": 190, "source": "simulator" },
  "FCX": { "basePrice": 45, "source": "simulator" },
  "NEM": { "basePrice": 42, "source": "simulator" },
  "APD": { "basePrice": 240, "source": "simulator" },
  "ECL": { "basePrice": 230, "source": "simulator" },
  "NOW": { "basePrice": 750, "source": "simulator" },
  "SNPS": { "basePrice": 550, "source": "simulator" },
  "CDNS": { "basePrice": 300, "source": "simulator" },
  "FTNT": { "basePrice": 65, "source": "simulator" },
  "PANW": { "basePrice": 300, "source": "simulator" },
  "WDAY": { "basePrice": 280, "source": "simulator" },
  "VRSK": { "basePrice": 240, "source": "simulator" },
  "CTSH": { "basePrice": 75, "source": "simulator" },
  "IT": { "basePrice": 460, "source": "simulator" },
  "TCS": { "basePrice": 4000, "source": "simulator" },
  "RELIANCE": { "basePrice": 2900, "source": "simulator" },
  "HDFCBANK": { "basePrice": 1500, "source": "simulator" },
  "ICICIBANK": { "basePrice": 1100, "source": "simulator" },
  "SBIN": { "basePrice": 800, "source": "simulator" },
  "BHARTIARTL": { "basePrice": 1300, "source": "simulator" },
  "ITC": { "basePrice": 430, "source": "simulator" },
  "L&T": { "basePrice": 3500, "source": "simulator" },
  "ASIANPAINT": { "basePrice": 2900, "source": "simulator" },
  "MARUTI": { "basePrice": 12000, "source": "simulator" },
  "SUNPHARMA": { "basePrice": 1500, "source": "simulator" },
  "TITAN": { "basePrice": 3300, "source": "simulator" },
  "ULTRACEMCO": { "basePrice": 9800, "source": "simulator" },
  "NTPC": { "basePrice": 350, "source": "simulator" },
  "TATAMOTORS": { "basePrice": 1000, "source": "simulator" },
  "POWERGRID": { "basePrice": 300, "source": "simulator" },
  "WIPRO": { "basePrice": 450, "source": "simulator" },
  "M&M": { "basePrice": 2500, "source": "simulator" },
  "ADANIENT": { "basePrice": 3200, "source": "simulator" },
  "ADANIPORTS": { "basePrice": 1300, "source": "simulator" },
  "BAJAJFINSV": { "basePrice": 1600, "source": "simulator" },
  "HCLTECH": { "basePrice": 1350, "source": "simulator" },
  "M": { "basePrice": 20, "source": "simulator" },
  "JWN": { "basePrice": 20, "source": "simulator" },
  "KSS": { "basePrice": 25, "source": "simulator" },
  "GPS": { "basePrice": 22, "source": "simulator" },
  "URBN": { "basePrice": 40, "source": "simulator" },
  "AEO": { "basePrice": 22, "source": "simulator" },
  "ANF": { "basePrice": 130, "source": "simulator" },
  "CROX": { "basePrice": 140, "source": "simulator" },
  "SKX": { "basePrice": 60, "source": "simulator" },
  "UAA": { "basePrice": 7, "source": "simulator" },
  "LULU": { "basePrice": 380, "source": "simulator" },
  "VFC": { "basePrice": 15, "source": "simulator" },
  "LEVI": { "basePrice": 20, "source": "simulator" },
  "RACE": { "basePrice": 430, "source": "simulator" },
  "PFE": { "basePrice": 28, "source": "simulator" },
  "BMY": { "basePrice": 50, "source": "simulator" },
  "ABBV": { "basePrice": 160, "source": "simulator" },
  "LLY": { "basePrice": 750, "source": "simulator" },
  "JNJ": { "basePrice": 150, "source": "simulator" },
  "UNH": { "basePrice": 500, "source": "simulator" },
  "CVS": { "basePrice": 75, "source": "simulator" },
  "CI": { "basePrice": 340, "source": "simulator" },
  "ELV": { "basePrice": 500, "source": "simulator" },
  "HUM": { "basePrice": 340, "source": "simulator" },
  "CNC": { "basePrice": 75, "source": "simulator" },
  "ZBH": { "basePrice": 120, "source": "simulator" },
  "BSX": { "basePrice": 65, "source": "simulator" },
  "SYK": { "basePrice": 340, "source": "simulator" },
  "MDT": { "basePrice": 85, "source": "simulator" },
  "BAX": { "basePrice": 40, "source": "simulator" },
  "A": { "basePrice": 140, "source": "simulator" },
  "TMO": { "basePrice": 580, "source": "simulator" },
  "DHR": { "basePrice": 250, "source": "simulator" },
  "IQV": { "basePrice": 240, "source": "simulator" },
  "ILMN": { "basePrice": 130, "source": "simulator" },
  "BWA": { "basePrice": 35, "source": "simulator" },
  "APTV": { "basePrice": 80, "source": "simulator" },
  "ALV": { "basePrice": 110, "source": "simulator" },
  "MGA": { "basePrice": 50, "source": "simulator" },
  "HAS": { "basePrice": 50, "source": "simulator" },
  "MAT": { "basePrice": 20, "source": "simulator" },
  "EA": { "basePrice": 130, "source": "simulator" },
  "TTWO": { "basePrice": 150, "source": "simulator" },
  "LYA": { "basePrice": 100, "source": "simulator" },
  "SIRI": { "basePrice": 4, "source": "simulator" },
  "CHTR": { "basePrice": 290, "source": "simulator" },
  "CMCSA": { "basePrice": 42, "source": "simulator" },
};

export const ALL_SYMBOLS = Object.keys(SYMBOLS_CONFIG);
const BINANCE_SYMBOLS = ALL_SYMBOLS.filter(s => SYMBOLS_CONFIG[s].source === "binance");
const SIMULATOR_SYMBOLS = ALL_SYMBOLS.filter(s => SYMBOLS_CONFIG[s].source === "simulator");
export const FINNHUB_SYMBOLS = ALL_SYMBOLS.filter(s => SYMBOLS_CONFIG[s].source === "finnhub");

const BINANCE_WS_URL =
  "wss://stream.binance.com:9443/ws/" +
  BINANCE_SYMBOLS.map(s => s.toLowerCase() + "@trade").join("/");

// ── Memory states ────────────────────────────────────────────────
const latestPrices = {};
let tickBuffer = [];

for (const symbol of ALL_SYMBOLS) {
  latestPrices[symbol] = { price: 0, timestamp: 0, volume24h: 0 };
}

const TICKER_INTERVAL_MS = 2000;
const ROOM_INTERVAL_MS = 1000;
const BATCH_INSERT_INTERVAL_MS = 5000; // Save to DB every 5s

// Track which symbols have active watchers (rooms with clients)
const activeRooms = new Set();
let ws = null;
let reconnectTimer = null;
let tickerTimer = null;
let roomTimer = null;
let batchInsertTimer = null;
let pendingTicker = false;
const finnhubActive = new Set();

// ── Startup DB Seed ─────────────────────────────────────────────
async function prefillMissingHistory() {
  try {
    console.log("[DB] Checking for missing history across all symbols...");
    const symbolsWithNoData = [];
    
    // Quick check to see which symbols have no data, and load latest price for those that do
    const checks = ALL_SYMBOLS.map(async (symbol) => {
      const existing = await Tick.findOne({ symbol, price: { $gt: 0 } }).sort({ timestamp: -1 }).lean();
      if (!existing) {
        // Clean up any corrupted zero-price ticks silently
        Tick.deleteMany({ symbol, price: { $lte: 0 } }).catch(() => {});
        return { symbol, hasData: false };
      }
      return { symbol, hasData: true, existing };
    });

    const results = await Promise.all(checks);

    for (const result of results) {
      if (!result.hasData) {
        symbolsWithNoData.push(result.symbol);
      } else {
        // Essential! If the DB has data, we MUST load the last known price into memory,
        // otherwise the simulator multiplies 0 by random factors and gets 0 forever!
        latestPrices[result.symbol].price = result.existing.price;
        latestPrices[result.symbol].timestamp = new Date(result.existing.timestamp).getTime();
      }
    }

    if (symbolsWithNoData.length > 0) {
      console.log(`[DB] Found ${symbolsWithNoData.length} symbols with no history. Pre-filling...`);
      const bulkOps = [];
      const now = Date.now();
      
      for (const symbol of symbolsWithNoData) {
        let currentPrice = SYMBOLS_CONFIG[symbol].basePrice;
        let timestamp = now - 150 * 1000;
        for (let i = 0; i < 150; i++) {
          const change = (Math.random() - 0.5) * 0.005;
          currentPrice = currentPrice * (1 + change);
          bulkOps.push({
            symbol,
            price: parseFloat(currentPrice.toFixed(2)),
            timestamp: new Date(timestamp + i * 1000),
            volume: Math.floor(Math.random() * 10) + 1
          });
        }
        latestPrices[symbol].price = parseFloat(currentPrice.toFixed(2));
        latestPrices[symbol].timestamp = now;
      }
      
      // Insert in chunks to avoid memory spike
      const chunkSize = 5000;
      for (let i = 0; i < bulkOps.length; i += chunkSize) {
        await Tick.insertMany(bulkOps.slice(i, i + chunkSize));
      }
      console.log(`[DB] Pre-fill complete. Inserted ${bulkOps.length} ticks.`);
    } else {
      console.log("[DB] All symbols have historical data.");
    }
  } catch (err) {
    console.error("[DB] Pre-fill failed:", err.message);
  }
}

// ── Public API ──────────────────────────────────────────────────
export function getLatestPrices() {
  return { ...latestPrices };
}

export function updatePrice(symbol, price, volume = 1) {
  if (!latestPrices[symbol]) return;

  const timestamp = Date.now();
  latestPrices[symbol] = {
    price,
    timestamp,
    volume24h: latestPrices[symbol].volume24h + volume,
  };

  tickBuffer.push({ symbol, price, timestamp: new Date(timestamp), volume });
  finnhubActive.add(symbol);
}

export function addActiveRoom(symbol) { activeRooms.add(symbol); }
export function removeActiveRoom(symbol) { activeRooms.delete(symbol); }

export function getMemoryStats() {
  const memUsage = process.memoryUsage();
  return {
    bufferedTicks: tickBuffer.length,
    activeRooms: [...activeRooms],
    heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
    rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
  };
}

// ── Main Init ───────────────────────────────────────────────────
export async function initBinanceSocket(io) {
  
  await prefillMissingHistory();

  function triggerTickerEmit() {
    if (!pendingTicker) {
      pendingTicker = true;
      tickerTimer = setTimeout(() => {
        io.emit("market_update", {
          prices: { ...latestPrices },
          timestamp: Date.now(),
        });
        pendingTicker = false;
      }, TICKER_INTERVAL_MS);
    }
  }

  // Room-based detailed emission (every 1s)
  roomTimer = setInterval(() => {
    for (const symbol of activeRooms) {
      const price = latestPrices[symbol];
      if (!price || price.price <= 0) continue;

      io.to(`room:${symbol}`).emit("asset_update", {
        symbol,
        price: price.price,
        timestamp: price.timestamp || Date.now(),
        volume24h: price.volume24h,
      });
    }
  }, ROOM_INTERVAL_MS);

  // Batch Insert to MongoDB Time Series (every 5s)
  batchInsertTimer = setInterval(async () => {
    if (tickBuffer.length > 0) {
      const toInsert = [...tickBuffer];
      tickBuffer = []; // Clear buffer immediately
      try {
        await Tick.insertMany(toInsert);
      } catch (err) {
        console.error("[DB] Bulk insert failed:", err.message);
      }
    }
  }, BATCH_INSERT_INTERVAL_MS);

  function connect() {
    console.log("[BinanceWS] Connecting to Binance trade stream...");
    ws = new WebSocket(BINANCE_WS_URL);

    ws.on("open", () => {
      console.log(`[BinanceWS] ✅ Connected. Streaming ${BINANCE_SYMBOLS.length} cryptos.`);
    });

    ws.on("message", (data) => {
      try {
        const trade = JSON.parse(data.toString());
        if (trade.e !== "trade") return;

        const symbol = trade.s;
        const price = parseFloat(trade.p);
        const quantity = parseFloat(trade.q);
        const timestamp = trade.T;

        if (!latestPrices[symbol]) return;

        latestPrices[symbol] = {
          price,
          timestamp,
          volume24h: latestPrices[symbol].volume24h + quantity,
        };

        tickBuffer.push({ symbol, price, timestamp: new Date(timestamp), volume: quantity });
        triggerTickerEmit();
      } catch (error) {}
    });

    ws.on("close", (code) => {
      console.warn(`[BinanceWS] ⚠️ Connection closed. Reconnecting...`);
      clearTimeout(tickerTimer);
      pendingTicker = false;
      reconnectTimer = setTimeout(connect, 5000);
    });
  }

  connect();

  const stockSimulatorTimer = setInterval(() => {
    const timestamp = Date.now();
    const symbolsToSimulate = [...SIMULATOR_SYMBOLS];

    for (const s of FINNHUB_SYMBOLS) {
      if (!finnhubActive.has(s)) {
        symbolsToSimulate.push(s);
      }
    }

    symbolsToSimulate.forEach((symbol) => {
      const current = latestPrices[symbol];
      if (!current) return;

      const sentiment = getActiveSentiment(symbol);
      const bias = sentiment * 0.001;
      const change = (Math.random() - 0.5) * 0.004 + bias;
      const newPrice = parseFloat((current.price * (1 + change)).toFixed(2));
      const volume = Math.floor(Math.random() * 50) + 5;

      latestPrices[symbol] = {
        price: newPrice,
        timestamp,
        volume24h: current.volume24h + volume,
      };

      tickBuffer.push({ symbol, price: newPrice, timestamp: new Date(timestamp), volume });
    });

    triggerTickerEmit();
  }, 1000);

  return function cleanup() {
    console.log("[BinanceWS] Shutting down...");
    clearTimeout(reconnectTimer);
    clearTimeout(tickerTimer);
    clearInterval(roomTimer);
    clearInterval(batchInsertTimer);
    clearInterval(stockSimulatorTimer);
    if (ws) {
      ws.removeAllListeners();
      ws.close();
    }
  };
}

export default { initBinanceSocket, getLatestPrices, updatePrice, addActiveRoom, removeActiveRoom, getMemoryStats };
