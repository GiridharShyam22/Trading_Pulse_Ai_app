import mongoose from "mongoose";

/**
 * MongoDB Time Series Collection for Price Ticks
 * 
 * Optimized for high-frequency inserts and querying by timestamp.
 * Includes a TTL index (expiresAfterSeconds) to automatically 
 * delete ticks older than 24 hours to save free-tier storage.
 */

const tickSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    symbol: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    volume: { type: Number, required: true, default: 1 },
  },
  {
    // Define as a MongoDB Time Series collection
    timeseries: {
      timeField: "timestamp",
      metaField: "symbol",
      granularity: "seconds",
    },
    // Prevent Mongoose from creating the default __v version key
    versionKey: false,
  }
);

// TTL Index: Automatically delete documents 24 hours (86400 seconds) after their timestamp
// Note: TTL indexes on timeseries collections use expireAfterSeconds natively.
tickSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model("Tick", tickSchema);
