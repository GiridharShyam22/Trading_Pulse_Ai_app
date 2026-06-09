import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import socket from './services/socket';
import MarketChart from './components/MarketChart';
import SidebarPanel from './components/SidebarPanel';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import { Zap, Wifi, WifiOff, Wallet, TrendingUp, Search, LogOut, User, Shield, LayoutDashboard } from 'lucide-react';

const BACKEND = "https://trading-pulse-backend.onrender.com";
const AI_URL = 'https://trading-pulse-ai-app.onrender.com';
const MAX_HIST = 50;
const AI_INTERVAL = 10;

export const ASSETS = {
  "BTCUSDT": { symbol: 'BTCUSDT', name: 'BTCUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "ETHUSDT": { symbol: 'ETHUSDT', name: 'ETHUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "BNBUSDT": { symbol: 'BNBUSDT', name: 'BNBUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "SOLUSDT": { symbol: 'SOLUSDT', name: 'SOLUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "XRPUSDT": { symbol: 'XRPUSDT', name: 'XRPUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "ADAUSDT": { symbol: 'ADAUSDT', name: 'ADAUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "DOGEUSDT": { symbol: 'DOGEUSDT', name: 'DOGEUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "DOTUSDT": { symbol: 'DOTUSDT', name: 'DOTUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "MATICUSDT": { symbol: 'MATICUSDT', name: 'MATICUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "LINKUSDT": { symbol: 'LINKUSDT', name: 'LINKUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "SHIBUSDT": { symbol: 'SHIBUSDT', name: 'SHIBUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "LTCUSDT": { symbol: 'LTCUSDT', name: 'LTCUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "TRXUSDT": { symbol: 'TRXUSDT', name: 'TRXUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "AVAXUSDT": { symbol: 'AVAXUSDT', name: 'AVAXUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "UNIUSDT": { symbol: 'UNIUSDT', name: 'UNIUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "ATOMUSDT": { symbol: 'ATOMUSDT', name: 'ATOMUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "XMRUSDT": { symbol: 'XMRUSDT', name: 'XMRUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "XLMUSDT": { symbol: 'XLMUSDT', name: 'XLMUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "BCHUSDT": { symbol: 'BCHUSDT', name: 'BCHUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "ALGOUSDT": { symbol: 'ALGOUSDT', name: 'ALGOUSDT', prefix: '₿', type: 'Crypto', color: '#f59e0b', base: 'USDT' }, 
  "CRM": { symbol: 'CRM', name: 'CRM', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "BDX": { symbol: 'BDX', name: 'BDX', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "DHR": { symbol: 'DHR', name: 'DHR', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MDT": { symbol: 'MDT', name: 'MDT', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "HUM": { symbol: 'HUM', name: 'HUM', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "QCOM": { symbol: 'QCOM', name: 'QCOM', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "PM": { symbol: 'PM', name: 'PM', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "NOC": { symbol: 'NOC', name: 'NOC', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "LIN": { symbol: 'LIN', name: 'LIN', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ICE": { symbol: 'ICE', name: 'ICE', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ITW": { symbol: 'ITW', name: 'ITW', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MA": { symbol: 'MA', name: 'MA', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ECL": { symbol: 'ECL', name: 'ECL', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "TXN": { symbol: 'TXN', name: 'TXN', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "FIS": { symbol: 'FIS', name: 'FIS', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MPC": { symbol: 'MPC', name: 'MPC', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "PFE": { symbol: 'PFE', name: 'PFE', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "GILD": { symbol: 'GILD', name: 'GILD', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "DG": { symbol: 'DG', name: 'DG', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "UNH": { symbol: 'UNH', name: 'UNH', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "COP": { symbol: 'COP', name: 'COP', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "APD": { symbol: 'APD', name: 'APD', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "TJX": { symbol: 'TJX', name: 'TJX', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "KO": { symbol: 'KO', name: 'KO', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "AMD": { symbol: 'AMD', name: 'AMD', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "TSLA": { symbol: 'TSLA', name: 'TSLA', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "BSX": { symbol: 'BSX', name: 'BSX', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "REGN": { symbol: 'REGN', name: 'REGN', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "T": { symbol: 'T', name: 'T', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "VRTX": { symbol: 'VRTX', name: 'VRTX', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "NVDA": { symbol: 'NVDA', name: 'NVDA', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "VLO": { symbol: 'VLO', name: 'VLO', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ADI": { symbol: 'ADI', name: 'ADI', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "GS": { symbol: 'GS', name: 'GS', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "BLK": { symbol: 'BLK', name: 'BLK', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "SO": { symbol: 'SO', name: 'SO', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "PXD": { symbol: 'PXD', name: 'PXD', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "WMT": { symbol: 'WMT', name: 'WMT', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ISRG": { symbol: 'ISRG', name: 'ISRG', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "HES": { symbol: 'HES', name: 'HES', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "EL": { symbol: 'EL', name: 'EL', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "PLTR": { symbol: 'PLTR', name: 'PLTR', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "JNJ": { symbol: 'JNJ', name: 'JNJ', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MRK": { symbol: 'MRK', name: 'MRK', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "NEM": { symbol: 'NEM', name: 'NEM', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "WMB": { symbol: 'WMB', name: 'WMB', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "BA": { symbol: 'BA', name: 'BA', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "AAPL": { symbol: 'AAPL', name: 'AAPL', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "NEE": { symbol: 'NEE', name: 'NEE', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "NOW": { symbol: 'NOW', name: 'NOW', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "OXY": { symbol: 'OXY', name: 'OXY', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "AVGO": { symbol: 'AVGO', name: 'AVGO', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "DVN": { symbol: 'DVN', name: 'DVN', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "TMO": { symbol: 'TMO', name: 'TMO', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "KMI": { symbol: 'KMI', name: 'KMI', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "CSCO": { symbol: 'CSCO', name: 'CSCO', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "PG": { symbol: 'PG', name: 'PG', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "LMT": { symbol: 'LMT', name: 'LMT', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "CAT": { symbol: 'CAT', name: 'CAT', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "NFLX": { symbol: 'NFLX', name: 'NFLX', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "IBM": { symbol: 'IBM', name: 'IBM', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "CSX": { symbol: 'CSX', name: 'CSX', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "AXP": { symbol: 'AXP', name: 'AXP', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "SYK": { symbol: 'SYK', name: 'SYK', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "INTC": { symbol: 'INTC', name: 'INTC', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "GE": { symbol: 'GE', name: 'GE', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MDLZ": { symbol: 'MDLZ', name: 'MDLZ', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "NKE": { symbol: 'NKE', name: 'NKE', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "FANG": { symbol: 'FANG', name: 'FANG', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "BKNG": { symbol: 'BKNG', name: 'BKNG', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "AMZN": { symbol: 'AMZN', name: 'AMZN', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MSFT": { symbol: 'MSFT', name: 'MSFT', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ACN": { symbol: 'ACN', name: 'ACN', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "CMCSA": { symbol: 'CMCSA', name: 'CMCSA', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "AON": { symbol: 'AON', name: 'AON', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "COST": { symbol: 'COST', name: 'COST', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MCO": { symbol: 'MCO', name: 'MCO', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "C": { symbol: 'C', name: 'C', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "UPS": { symbol: 'UPS', name: 'UPS', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "CVS": { symbol: 'CVS', name: 'CVS', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MRO": { symbol: 'MRO', name: 'MRO', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "FISV": { symbol: 'FISV', name: 'FISV', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "SLB": { symbol: 'SLB', name: 'SLB', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "LOW": { symbol: 'LOW', name: 'LOW', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "GOOGL": { symbol: 'GOOGL', name: 'GOOGL', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "PEP": { symbol: 'PEP', name: 'PEP', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MMC": { symbol: 'MMC', name: 'MMC', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "KLAC": { symbol: 'KLAC', name: 'KLAC', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "CB": { symbol: 'CB', name: 'CB', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "JPM": { symbol: 'JPM', name: 'JPM', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "WM": { symbol: 'WM', name: 'WM', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "SPGI": { symbol: 'SPGI', name: 'SPGI', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ORCL": { symbol: 'ORCL', name: 'ORCL', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "HAL": { symbol: 'HAL', name: 'HAL', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "EOG": { symbol: 'EOG', name: 'EOG', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "EMR": { symbol: 'EMR', name: 'EMR', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ADBE": { symbol: 'ADBE', name: 'ADBE', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "CTRA": { symbol: 'CTRA', name: 'CTRA', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "BAC": { symbol: 'BAC', name: 'BAC', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "PGR": { symbol: 'PGR', name: 'PGR', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "HON": { symbol: 'HON', name: 'HON', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "AMAT": { symbol: 'AMAT', name: 'AMAT', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "VZ": { symbol: 'VZ', name: 'VZ', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ABT": { symbol: 'ABT', name: 'ABT', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "TGT": { symbol: 'TGT', name: 'TGT', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "CVX": { symbol: 'CVX', name: 'CVX', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ABBV": { symbol: 'ABBV', name: 'ABBV', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "META": { symbol: 'META', name: 'META', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "GD": { symbol: 'GD', name: 'GD', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "V": { symbol: 'V', name: 'V', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "FCX": { symbol: 'FCX', name: 'FCX', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "HD": { symbol: 'HD', name: 'HD', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "ZTS": { symbol: 'ZTS', name: 'ZTS', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "MCD": { symbol: 'MCD', name: 'MCD', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "DE": { symbol: 'DE', name: 'DE', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "COIN": { symbol: 'COIN', name: 'COIN', prefix: '$', type: 'US Stock', color: '#0ea5e9', base: 'USD' }, 
  "SBIN": { symbol: 'SBIN', name: 'SBIN', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "BEL": { symbol: 'BEL', name: 'BEL', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "HDFCBANK": { symbol: 'HDFCBANK', name: 'HDFCBANK', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "ITC": { symbol: 'ITC', name: 'ITC', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "DIVISLAB": { symbol: 'DIVISLAB', name: 'DIVISLAB', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "HAL": { symbol: 'HAL', name: 'HAL', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "INDUSINDBK": { symbol: 'INDUSINDBK', name: 'INDUSINDBK', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "BPCL": { symbol: 'BPCL', name: 'BPCL', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "HINDUNILVR": { symbol: 'HINDUNILVR', name: 'HINDUNILVR', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "TATACONSUM": { symbol: 'TATACONSUM', name: 'TATACONSUM', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "TATASTEEL": { symbol: 'TATASTEEL', name: 'TATASTEEL', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "BHARTIARTL": { symbol: 'BHARTIARTL', name: 'BHARTIARTL', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "ASIANPAINT": { symbol: 'ASIANPAINT', name: 'ASIANPAINT', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "TECHM": { symbol: 'TECHM', name: 'TECHM', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "HCLTECH": { symbol: 'HCLTECH', name: 'HCLTECH', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "TITAN": { symbol: 'TITAN', name: 'TITAN', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "LT": { symbol: 'LT', name: 'LT', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "DRREDDY": { symbol: 'DRREDDY', name: 'DRREDDY', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "NESTLEIND": { symbol: 'NESTLEIND', name: 'NESTLEIND', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "KOTAKBANK": { symbol: 'KOTAKBANK', name: 'KOTAKBANK', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "UPL": { symbol: 'UPL', name: 'UPL', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "ICICIBANK": { symbol: 'ICICIBANK', name: 'ICICIBANK', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "ADANIPORTS": { symbol: 'ADANIPORTS', name: 'ADANIPORTS', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "ULTRACEMCO": { symbol: 'ULTRACEMCO', name: 'ULTRACEMCO', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "SBILIFE": { symbol: 'SBILIFE', name: 'SBILIFE', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "RELIANCE": { symbol: 'RELIANCE', name: 'RELIANCE', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "TATAMOTORS": { symbol: 'TATA MOTORS', name: 'TATA MOTORS', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "EICHERMOT": { symbol: 'EICHERMOT', name: 'EICHERMOT', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "NTPC": { symbol: 'NTPC', name: 'NTPC', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "BAJFINANCE": { symbol: 'BAJFINANCE', name: 'BAJFINANCE', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "BRITANNIA": { symbol: 'BRITANNIA', name: 'BRITANNIA', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "ONGC": { symbol: 'ONGC', name: 'ONGC', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "HDFCLIFE": { symbol: 'HDFCLIFE', name: 'HDFCLIFE', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "GRASIM": { symbol: 'GRASIM', name: 'GRASIM', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "COALINDIA": { symbol: 'COALINDIA', name: 'COALINDIA', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "M&M": { symbol: 'M&M', name: 'M&M', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "TCS": { symbol: 'TCS', name: 'TCS', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "JSWSTEEL": { symbol: 'JSWSTEEL', name: 'JSWSTEEL', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "INFY": { symbol: 'INFY', name: 'INFY', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "ADANIENT": { symbol: 'ADANIENT', name: 'ADANIENT', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "HINDALCO": { symbol: 'HINDALCO', name: 'HINDALCO', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "WIPRO": { symbol: 'WIPRO', name: 'WIPRO', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "HEROMOTOCO": { symbol: 'HEROMOTOCO', name: 'HEROMOTOCO', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "AXISBANK": { symbol: 'AXISBANK', name: 'AXISBANK', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "CIPLA": { symbol: 'CIPLA', name: 'CIPLA', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "TRENT": { symbol: 'TRENT', name: 'TRENT', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "MARUTI": { symbol: 'MARUTI', name: 'MARUTI', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "CHOLAFIN": { symbol: 'CHOLAFIN', name: 'CHOLAFIN', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "SHREECEM": { symbol: 'SHREECEM', name: 'SHREECEM', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "BAJAJFINSV": { symbol: 'BAJAJFINSV', name: 'BAJAJFINSV', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "BAJAJ-AUTO": { symbol: 'BAJAJ-AUTO', name: 'BAJAJ-AUTO', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "APOLLOHOSP": { symbol: 'APOLLOHOSP', name: 'APOLLOHOSP', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "SUNPHARMA": { symbol: 'SUNPHARMA', name: 'SUNPHARMA', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
  "POWERGRID": { symbol: 'POWERGRID', name: 'POWERGRID', prefix: '₹', type: 'Indian Stock', color: '#dc2626', base: 'INR' }, 
};

export default function App() {
  /* ── Auth State ─────────────────────────────────────────── */
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('tradingpulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('tradingpulse_token') || null;
  });

  const isAuthenticated = !!authUser && !!authToken;

  const handleAuthSuccess = (user, token) => {
    setAuthUser(user);
    setAuthToken(token);
  };

  const handleLogout = () => {
    setAuthUser(null);
    setAuthToken(null);
    localStorage.removeItem('tradingpulse_token');
    localStorage.removeItem('tradingpulse_user');
    setUserId(null);
    setBalance(100000);
    setPortfolio({});
    setTransactions([]);
    setEquityHistory([]);
  };

  /* ── If not authenticated, show auth screen ─────────────── */
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  /* ── Render the main trading dashboard ──────────────────── */
  return (
    <TradingDashboard
      authUser={authUser}
      setAuthUser={setAuthUser}
      authToken={authToken}
      onLogout={handleLogout}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   Trading Dashboard (extracted so auth gating is clean)
   ═══════════════════════════════════════════════════════════════ */
function TradingDashboard({ authUser, setAuthUser, authToken, onLogout }) {
  const [live, setLive] = useState(socket.connected);
  const [asset, setAsset] = useState('BTCUSDT');
  const [history, setHistory] = useState(() => {
    const init = {};
    Object.keys(ASSETS).forEach(sym => init[sym] = []);
    return init;
  });
  const [latest, setLatest] = useState(() => {
    const init = {};
    Object.keys(ASSETS).forEach(sym => init[sym] = { price: 0 });
    return init;
  });
  const [userId, setUserId] = useState(authUser?.id || null);
  const [balance, setBalance] = useState(authUser?.balance || 100000);
  const [portfolio, setPortfolio] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [equityHistory, setEquityHistory] = useState([]);
  const [fundRequested, setFundRequested] = useState(false);
  const [news, setNews] = useState([]);
  const [liquidationAlert, setLiquidationAlert] = useState(null);
  const [balOk, setBalOk] = useState(true);
  const [pred, setPred] = useState(null);
  const [aiLoad, setAiLoad] = useState(false);
  const [aiUp, setAiUp] = useState(false);
  const [aiTs, setAiTs] = useState(null);
  const [viewMode, setViewMode] = useState('trading'); // 'trading' | 'admin'

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const countRef = useRef(0);
  const histRef = useRef(history);
  histRef.current = history;

  const userRef = useRef(userId);
  userRef.current = userId;

  /* ── Outside click for search dropdown ───────────────────── */
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  /* ── Bootstrap user from auth ────────────────────────────── */
  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        const r = await axios.get(`${BACKEND}/api/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (r.data.success) {
          setUserId(r.data.data.id);
          setBalance(r.data.data.balance);
          setPortfolio(r.data.data.portfolio || {});
          setEquityHistory(r.data.data.equityHistory || []);
          setFundRequested(r.data.data.fundRequested || false);
          setBalOk(true);

          // Sync role and other details back to parent and localStorage
          if (r.data.data.role !== authUser?.role) {
            const updatedUser = { ...authUser, ...r.data.data };
            setAuthUser(updatedUser);
            localStorage.setItem('tradingpulse_user', JSON.stringify(updatedUser));
          }
        }
      } catch (e) {
        console.error("Failed to bootstrap user:", e);
        // Token may be expired — log out
        if (e.response?.status === 401) {
          onLogout();
        }
      }
    };
    bootstrapUser();
  }, [authToken]);

  /* ── Fetch news history on mount ─────────────────────────── */
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const r = await axios.get(`${BACKEND}/api/news`);
        if (r.data.success) {
          setNews(r.data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch news history:", e);
      }
    };
    fetchNews();
  }, []);

  /* ── Fetch balance ───────────────────────────────────────── */
  const refreshBal = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await axios.get(`${BACKEND}/api/trade/balance/${userId}`);
      if (r.data.success) {
        setBalance(r.data.data.balance);
        setPortfolio(r.data.data.portfolio || {});
        setTransactions(r.data.data.recentTransactions || []);
        setEquityHistory(r.data.data.equityHistory || []);
        setBalOk(true);
      }
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => { refreshBal(); }, [refreshBal]);

  /* ── AI health loop ──────────────────────────────────────── */
  useEffect(() => {
    const ping = async () => {
      try {
        const r = await axios.get(`${AI_URL}/health`, { timeout: 3000 });
        setAiUp(r.data.status === 'ok');
      } catch { setAiUp(false); }
    };
    ping();
    const iv = setInterval(ping, 30000);
    return () => clearInterval(iv);
  }, []);

  /* ── AI prediction ───────────────────────────────────────── */
  const runAIForPrices = useCallback(async (sym, p) => {
    if (p.length < 10) return;
    setAiLoad(true);
    try {
      const r = await axios.post(`${BACKEND}/api/ai/predict`, { symbol: sym, prices: p });
      setPred(r.data);
      setAiUp(true);
      setAiTs(Date.now());
    } catch (e) {
      console.warn('AI offline');
      setAiUp(false);
    } finally {
      setAiLoad(false);
    }
  }, []);

  /* ── Fetch price history on asset change ─────────────────── */
  const fetchHistory = useCallback(async (symbol) => {
    try {
      const r = await axios.get(`${BACKEND}/api/prices/${symbol}?count=${MAX_HIST}`);
      if (r.data.success && r.data.data.prices.length > 0) {
        const prices = r.data.data.prices;
        const historyData = prices.map((price, idx) => ({
          price,
          timestamp: r.data.data.timestamps[idx]
        }));
        setHistory((prev) => ({
          ...prev,
          [symbol]: historyData
        }));
        runAIForPrices(symbol, prices);
      }
    } catch (e) {
      console.error(`Failed to fetch history for ${symbol}:`, e);
    }
  }, [runAIForPrices]);

  useEffect(() => {
    fetchHistory(asset);
  }, [asset, fetchHistory]);

  /* ── Socket.io ───────────────────────────────────────────── */
  useEffect(() => {
    const onC = () => {
      setLive(true);
      // Subscribe to the currently active asset on connect
      socket.emit("subscribe_asset", asset);
    };
    const onD = () => setLive(false);

    // market_update is now just a lightweight ticker tape (prices only, no history)
    const onMarketUpdate = (data) => {
      if (!data?.prices) return;
      setLatest((prev) => ({ ...prev, ...data.prices }));
    };

    // asset_update is the room-based detailed feed for the watched asset
    const onAssetUpdate = (data) => {
      if (!data?.symbol) return;
      
      setLatest((prev) => ({
        ...prev,
        [data.symbol]: { price: data.price, timestamp: data.timestamp, volume24h: data.volume24h }
      }));

      setHistory((prev) => {
        const next = { ...prev };
        next[data.symbol] = [...(prev[data.symbol] || []), {
          price: data.price,
          timestamp: data.timestamp,
        }].slice(-MAX_HIST);
        return next;
      });

      countRef.current += 1;
      if (countRef.current >= AI_INTERVAL) {
        countRef.current = 0;
        const currentHist = histRef.current[asset] || [];
        if (currentHist.length >= 10) {
          runAIForPrices(asset, currentHist.map((p) => p.price));
        }
      }
    };

    const onNewsFlash = (item) => {
      setNews((prev) => [item, ...prev].slice(0, 50));
    };

    const onPortfolioUpdate = (data) => {
      if (data.userId === userRef.current) {
        setBalance(data.balance);
        setPortfolio(data.portfolio || {});
      }
    };

    const onOrderLiquidated = (data) => {
      if (data.userId === userRef.current) {
        if (data.transaction) {
          setTransactions((prev) => [data.transaction, ...prev].slice(0, 20));
        }
        refreshBal();
        setLiquidationAlert({
          symbol: data.symbol,
          type: data.type,
          price: data.price,
          quantity: data.quantity,
          total: data.total,
        });
      }
    };

    socket.on('connect', onC);
    socket.on('disconnect', onD);
    socket.on('market_update', onMarketUpdate);
    socket.on('asset_update', onAssetUpdate);
    socket.on('news_flash', onNewsFlash);
    socket.on('portfolio_update', onPortfolioUpdate);
    socket.on('order_liquidated', onOrderLiquidated);

    // Subscribe to new asset when `asset` state changes
    if (socket.connected) {
      socket.emit("subscribe_asset", asset);
    }

    return () => {
      // Unsubscribe from old asset on cleanup
      socket.emit("unsubscribe_asset", asset);
      
      socket.off('connect', onC);
      socket.off('disconnect', onD);
      socket.off('market_update', onMarketUpdate);
      socket.off('asset_update', onAssetUpdate);
      socket.off('news_flash', onNewsFlash);
      socket.off('portfolio_update', onPortfolioUpdate);
      socket.off('order_liquidated', onOrderLiquidated);
    };
  }, [asset, runAIForPrices, refreshBal]);

  /* ── Trade callback ──────────────────────────────────────── */
  const onTrade = (d) => {
    setBalance(d.balance);
    setPortfolio(d.portfolio || {});
    setEquityHistory(d.equityHistory || []);
    if (d.transaction) {
      setTransactions((prev) => [d.transaction, ...prev].slice(0, 20));
    }
    if (d.transaction?.userId || d.userId) setUserId(d.transaction?.userId || d.userId);
  };

  /* ── Filter dropdown assets ──────────────────────────────── */
  const filteredAssets = Object.values(ASSETS).filter(a =>
    a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAssetInfo = ASSETS[asset] || ASSETS.BTCUSDT;
  const activePrice = latest[asset]?.price || 0;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', color: 'var(--text-primary)', overflow: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════
          TOP NAVIGATION BAR
          ══════════════════════════════════════════════════════════ */}
      <header className="nav-glow" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '64px',
        flexShrink: 0,
        background: 'rgba(8,12,20,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 50,
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59,130,246,0.4)',
          }}>
            <Zap size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>
              TradingPulse<span style={{ color: '#3b82f6' }}>AI</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>
              Paper Terminal
            </div>
          </div>
        </div>

        {/* Center — Asset Dropdown Search Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: menuOpen ? '0 0 15px rgba(59,130,246,0.15)' : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = menuOpen ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'; }}
            >
              <div style={{
                width: '26px', height: '26px', borderRadius: '6px',
                background: `${activeAssetInfo.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 800, color: activeAssetInfo.color,
              }}>
                {activeAssetInfo.prefix}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>
                  {activeAssetInfo.symbol.replace('USDT', '')} / {activeAssetInfo.base}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {activeAssetInfo.name}
                </span>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                {activePrice > 0 ? `₹${activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
              </span>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)', marginLeft: '4px' }}>▼</span>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                width: '340px', maxHeight: '420px',
                background: 'rgba(8,12,20,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', overflow: 'hidden',
                boxShadow: '0 15px 35px -5px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)',
                zIndex: 100, display: 'flex', flexDirection: 'column',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
              }}>
                {/* Search Header */}
                <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search shares or crypto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%', padding: '6px 4px',
                      borderRadius: '6px', background: 'transparent',
                      border: 'none',
                      color: 'white', fontSize: '13px', outline: 'none',
                    }}
                  />
                </div>

                {/* Assets List */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px', padding: '6px' }}>
                  {filteredAssets.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No assets found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredAssets.map((item) => {
                      const sym = item.symbol;
                      const curPrice = latest[sym]?.price || 0;
                      const isActive = asset === sym;
                      return (
                        <button
                          key={sym}
                          onClick={() => {
                            setAsset(sym);
                            setPred(null);
                            setMenuOpen(false);
                            setSearchQuery('');
                          }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', border: 'none', borderRadius: '8px',
                            background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                            marginBottom: '2px',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(59,130,246,0.08)' : 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '6px',
                              background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: 800, color: item.color,
                            }}>
                              {item.prefix}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                                {sym.replace('USDT', '')}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {item.name}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                              {curPrice > 0 ? `₹${curPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </div>
                            <span style={{
                              fontSize: '8px', fontWeight: 700,
                              color: item.type === 'Crypto' ? '#f59e0b' : '#3b82f6',
                              background: item.type === 'Crypto' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)',
                              padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>
                              {item.type}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — User Info + Balance + Status + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Balance */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'rgba(5,150,105,0.07)',
            border: '1px solid rgba(5,150,105,0.15)',
          }}>
            <Wallet size={15} color="var(--accent-green)" />
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Paper Balance
              </div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '1px' }}>
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Live badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 14px',
            borderRadius: '99px',
            border: live ? '1px solid rgba(5,150,105,0.25)' : '1px solid rgba(190,18,60,0.25)',
            background: live ? 'rgba(5,150,105,0.06)' : 'rgba(190,18,60,0.06)',
            fontSize: '12px', fontWeight: 700,
            color: live ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            <span
              className={live ? 'beacon' : ''}
              style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: live ? 'var(--accent-green)' : 'var(--accent-red)',
                display: 'inline-block',
              }}
            />
            {live ? 'Live' : 'Offline'}
          </div>

          {/* User badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {authUser?.role === 'admin' ? (
              <Shield size={14} color="#f59e0b" />
            ) : (
              <User size={14} color="#64748b" />
            )}
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
              {authUser?.username}
            </span>
            {authUser?.role === 'admin' && (
              <span style={{
                fontSize: '8px', fontWeight: 800,
                color: '#f59e0b',
                background: 'rgba(245,158,11,0.1)',
                padding: '1px 5px', borderRadius: '4px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Admin
              </span>
            )}
          </div>

          {/* Admin Toggle Button */}
          {authUser?.role === 'admin' && (
            <button
              onClick={() => setViewMode(prev => prev === 'trading' ? 'admin' : 'trading')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(245,158,11,0.2)',
                background: viewMode === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.05)',
                color: '#f59e0b',
                fontSize: '12px', fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = viewMode === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.05)'; }}
            >
              {viewMode === 'trading' ? <Shield size={14} /> : <LayoutDashboard size={14} />}
              {viewMode === 'trading' ? 'Admin Portal' : 'Terminal'}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(190,18,60,0.15)',
              background: 'rgba(190,18,60,0.05)',
              color: 'var(--accent-red)',
              fontSize: '12px', fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(190,18,60,0.1)'; e.currentTarget.style.borderColor = 'rgba(190,18,60,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(190,18,60,0.05)'; e.currentTarget.style.borderColor = 'rgba(190,18,60,0.15)'; }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MAIN LAYOUT
          ══════════════════════════════════════════════════════════ */}
      {viewMode === 'admin' ? (
        <AdminDashboard authToken={authToken} />
      ) : (
        <main style={{ flex: 1, display: 'flex', minHeight: 0, padding: '16px', gap: '16px' }}>

          {/* ── Chart Panel ────────────────────────────────────── */}
          <section
            className="panel-shadow"
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: '16px',
              background: 'var(--bg-panel)',
              border: '1px solid rgba(255,255,255,0.07)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
            }}
          >
            <MarketChart priceData={history[asset]} symbol={asset} />
          </section>

          {/* ── Sidebar Panel ─────────────────────────────────── */}
          <aside style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <SidebarPanel
              userId={userId}
              authToken={authToken}
              activeAsset={asset}
              currentPrices={latest}
              balance={balance}
              portfolio={portfolio}
              transactions={transactions}
              equityHistory={equityHistory}
              fundRequested={fundRequested}
              setFundRequested={setFundRequested}
              news={news}
              liquidationAlert={liquidationAlert}
              setLiquidationAlert={setLiquidationAlert}
              onTradeComplete={onTrade}
              aiPrediction={pred}
              aiLoading={aiLoad}
              aiConnected={aiUp}
              aiLastUpdated={aiTs}
            />
          </aside>
        </main>
      )}
    </div>
  );
}
