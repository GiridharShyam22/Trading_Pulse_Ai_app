import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const positionSchema = new mongoose.Schema(
  {
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    avgPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    stopLoss: {
      type: Number,
      default: null,
      min: 0,
    },
    takeProfit: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    balance: {
      type: Number,
      required: true,
      default: 100000,
      min: 0,
    },
    fundRequested: {
      type: Boolean,
      default: false,
    },
    portfolio: {
      type: Map,
      of: positionSchema,
      default: new Map(),
    },
    equityHistory: [
      {
        equity: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      }
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Convert Map to plain object for clean JSON responses
        if (ret.portfolio instanceof Map) {
          ret.portfolio = Object.fromEntries(ret.portfolio);
        }
        // Never send password in JSON responses
        delete ret.password;
        return ret;
      },
    },
  }
);

// ── Hash password before saving ─────────────────────────────────
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare candidate password with stored hash ─────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Calculate total portfolio value given current market prices.
 * @param {Object} currentPrices - e.g. { BTCUSDT: 67000, ETHUSDT: 3500 }
 * @returns {number} Total value of held positions
 */
userSchema.methods.getPortfolioValue = function (currentPrices = {}) {
  let totalValue = 0;
  for (const [symbol, position] of this.portfolio) {
    const priceEntry = currentPrices[symbol];
    const currentPrice =
      priceEntry && typeof priceEntry === "object" && "price" in priceEntry
        ? priceEntry.price
        : typeof priceEntry === "number"
        ? priceEntry
        : position.avgPrice;
    totalValue += position.quantity * currentPrice;
  }
  return totalValue;
};

const User = mongoose.model("User", userSchema);

export default User;
