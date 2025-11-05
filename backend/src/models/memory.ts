import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * Interface đại diện cho 1 bản ghi trí nhớ (memory) trong MongoDB
 */
export interface Memory extends Document {
  userId: string;
  type: string;
  value: string;
  targetId: string;
  confidence: number; // integer
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema cho collection `memories`
 * Sử dụng timestamps để tự động quản lý createdAt/updatedAt
 */
const MemorySchema = new Schema<Memory>({
  userId: {
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
  value: {
    type: String,
    required: true,
  },
  targetId: {
    type: String,
    required: false,
    default: '',
  },
  confidence: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'confidence phải là số nguyên',
    },
  },
}, {
  collection: 'memories',
  timestamps: true,
});

// Index tổng hợp phổ biến cho truy vấn theo user và target
MemorySchema.index({ userId: 1, targetId: 1, createdAt: -1 });

/**
 * Lấy (hoặc tạo nếu chưa tồn tại) Model cho `memories`
 * Tránh lỗi khi hot-reload bằng cách dùng mongoose.models
 */
export function getMemoryModel(): Model<Memory> {
  return (mongoose.models.Memory as Model<Memory>)
    || mongoose.model<Memory>('Memory', MemorySchema);
}

export default getMemoryModel;


