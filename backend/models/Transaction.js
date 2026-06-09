import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["buy", "sell"],
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.00000001, // Minimum trade size (1 satoshi for BTC)
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of trade history
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ symbol: 1, createdAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
