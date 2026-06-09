import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { getLatestPrices } from "../services/binanceSocket.js";

/**
 * GET /api/trade/balance/:userId
 * Returns the user's current balance, portfolio, and recent transactions.
 */
export const getBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Convert portfolio Map to plain object if needed
    const portfolio =
      user.portfolio instanceof Map
        ? Object.fromEntries(user.portfolio)
        : user.portfolio || {};

    // Fetch last 20 transactions for the user
    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        username: user.username,
        balance: user.balance,
        portfolio,
        recentTransactions,
        equityHistory: user.equityHistory || [],
      },
    });
  } catch (error) {
    console.error("[TradeController] getBalance error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch balance",
    });
  }
};

/**
 * POST /api/trade/execute
 * Execute a paper trade (buy or sell).
 * Body: { userId, symbol, type: "buy"|"sell", quantity, price }
 */
export const executeTrade = async (req, res) => {
  try {
    const { userId, symbol, type, quantity, price, stopLoss, takeProfit } = req.body;

    // ── Validation ──────────────────────────────────────────────
    if (!userId || !symbol || !type || !quantity || !price) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userId, symbol, type, quantity, price",
      });
    }

    const normalizedSymbol = symbol.toUpperCase().trim().replace('/', '');
    const validSymbols = [
      "BTCUSDT", "ETHUSDT", "ATOMUSDT",
      "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"
    ];
    if (!validSymbols.includes(normalizedSymbol)) {
      return res.status(400).json({
        success: false,
        error: `Invalid symbol. Supported: ${validSymbols.join(", ")}`,
      });
    }

    if (!["buy", "sell"].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade type. Must be "buy" or "sell".',
      });
    }

    const parsedQuantity = parseFloat(quantity);
    const parsedPrice = parseFloat(price);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        error: "Quantity must be a positive number.",
      });
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: "Price must be a positive number.",
      });
    }

    const total = parsedQuantity * parsedPrice;

    // ── Fetch user ──────────────────────────────────────────────
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // ── Execute trade ───────────────────────────────────────────
    if (type === "buy") {
      // Check sufficient balance
      if (user.balance < total) {
        return res.status(400).json({
          success: false,
          error: `Insufficient balance. Required: $${total.toFixed(2)}, Available: $${user.balance.toFixed(2)}`,
        });
      }

      // Deduct balance
      user.balance -= total;

      const parsedSL = stopLoss ? parseFloat(stopLoss) : null;
      const parsedTP = takeProfit ? parseFloat(takeProfit) : null;

      // Update portfolio position
      const existingPosition = user.portfolio.get(normalizedSymbol);
      if (existingPosition) {
        // Calculate new average price using weighted average
        const totalQuantity = existingPosition.quantity + parsedQuantity;
        const totalCost =
          existingPosition.quantity * existingPosition.avgPrice +
          parsedQuantity * parsedPrice;
        existingPosition.avgPrice = totalCost / totalQuantity;
        existingPosition.quantity = totalQuantity;
        if (parsedSL !== null) existingPosition.stopLoss = parsedSL;
        if (parsedTP !== null) existingPosition.takeProfit = parsedTP;
        user.portfolio.set(normalizedSymbol, existingPosition);
      } else {
        user.portfolio.set(normalizedSymbol, {
          quantity: parsedQuantity,
          avgPrice: parsedPrice,
          stopLoss: parsedSL,
          takeProfit: parsedTP,
        });
      }
    } else {
      // SELL
      const existingPosition = user.portfolio.get(normalizedSymbol);
      if (!existingPosition || existingPosition.quantity < parsedQuantity) {
        const available = existingPosition ? existingPosition.quantity : 0;
        return res.status(400).json({
          success: false,
          error: `Insufficient holdings. Available: ${available} ${normalizedSymbol}, Requested: ${parsedQuantity}`,
        });
      }

      // Add proceeds to balance
      user.balance += total;

      // Update portfolio position
      existingPosition.quantity -= parsedQuantity;
      if (existingPosition.quantity <= 0.00000001) {
        // Remove position if fully closed (accounting for floating-point)
        user.portfolio.delete(normalizedSymbol);
      } else {
        user.portfolio.set(normalizedSymbol, existingPosition);
      }
    }

    // ── Update Equity History ───────────────────────────────────
    const latestPrices = getLatestPrices();
    const portfolioValue = user.getPortfolioValue(latestPrices);
    const totalEquity = user.balance + (isFinite(portfolioValue) ? portfolioValue : 0);
    if (isFinite(totalEquity) && totalEquity > 0) {
      user.equityHistory.push({ equity: totalEquity, timestamp: new Date() });
      if (user.equityHistory.length > 200) {
        user.equityHistory.shift();
      }
    }

    // ── Save user & create transaction ──────────────────────────
    await user.save();

    const transaction = await Transaction.create({
      userId: user._id,
      symbol: normalizedSymbol,
      type,
      quantity: parsedQuantity,
      price: parsedPrice,
      total,
      balanceAfter: user.balance,
    });

    // Convert portfolio for response
    const portfolio =
      user.portfolio instanceof Map
        ? Object.fromEntries(user.portfolio)
        : user.portfolio;

    return res.status(200).json({
      success: true,
      data: {
        transaction: {
          id: transaction._id,
          symbol: normalizedSymbol,
          type,
          quantity: parsedQuantity,
          price: parsedPrice,
          total,
          timestamp: transaction.createdAt,
        },
        balance: user.balance,
        portfolio,
        equityHistory: user.equityHistory || [],
      },
    });
  } catch (error) {
    console.error("[TradeController] executeTrade error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to execute trade",
    });
  }
};

/**
 * GET /api/trade/history/:userId
 * Returns paginated trade history for a user.
 * Query: ?page=1&limit=50
 */
export const getTradeHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const [transactions, totalCount] = await Promise.all([
      Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({ userId }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("[TradeController] getTradeHistory error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch trade history",
    });
  }
};

/**
 * GET /api/trade/user/default
 * Returns the default 'trader' user profile or creates it if it doesn't exist.
 */
export const getDefaultUser = async (req, res) => {
  try {
    let user = await User.findOne({ username: "trader" });
    if (!user) {
      user = await User.create({
        username: "trader",
        balance: 100000,
        portfolio: new Map(),
      });
      console.log(`[TradeController] Created missing default user: trader (ID: ${user._id})`);
    }

    const portfolio =
      user.portfolio instanceof Map
        ? Object.fromEntries(user.portfolio)
        : user.portfolio || {};

    const recentTransactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        username: user.username,
        balance: user.balance,
        portfolio,
        recentTransactions,
        equityHistory: user.equityHistory || [],
      },
    });
  } catch (error) {
    console.error("[TradeController] getDefaultUser error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch default user profile",
    });
  }
};
