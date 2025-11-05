import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * Interface đại diện cho 1 bản ghi usage (thống kê token) trong MongoDB
 */
export interface Usage extends Document {
  userId: string;
  conversationId: string;
  messageId: string;
  type: string; // ví dụ: "inference", "search", ...
  description: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    reasoningTokens: number;
    cachedInputTokens: number;
    credit: number;
  };
  agent: {
    model: string;
    provider: string;
  }
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema cho collection `usages`
 * Sử dụng timestamps để tự động quản lý createdAt/updatedAt
 */
const UsageSchema = new Schema<Usage>({
  userId: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  messageId: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  agent: {
    model: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
  },
  usage: {
    inputTokens: { type: Number, required: true, default: 0 },
    outputTokens: { type: Number, required: true, default: 0 },
    totalTokens: { type: Number, required: true, default: 0 },
    reasoningTokens: { type: Number, required: true, default: 0 },
    cachedInputTokens: { type: Number, required: true, default: 0 },
    credit: { type: Number, required: true, default: 0 },
  },
}, {
  collection: 'usages',
  timestamps: true,
});

// Index tổng hợp tối ưu cho truy vấn phổ biến
UsageSchema.index({ userId: 1, conversationId: 1, createdAt: -1 });
UsageSchema.index({ messageId: 1 }, { unique: false });

/**
 * Lấy (hoặc tạo nếu chưa tồn tại) Model cho `usages`
 * Tránh lỗi khi hot-reload bằng cách dùng mongoose.models
 */
export function getUsageModel(): Model<Usage> {
  return (mongoose.models.Usage as Model<Usage>)
    || mongoose.model<Usage>('Usage', UsageSchema);
}

export default getUsageModel;


