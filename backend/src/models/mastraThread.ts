import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * Interface đại diện cho 1 thread (cuộc trò chuyện) trong MongoDB
 */
export interface MastraThread extends Document {
  id: string;             // conversationId (unique)
  resourceId: string;     // userId
  title: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema cho collection `mastra_threads`
 * Sử dụng timestamps để tự động quản lý createdAt/updatedAt
 */
const MastraThreadSchema = new Schema<MastraThread>({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  resourceId: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: null,
  },
}, {
  collection: 'mastra_threads',
  timestamps: true,
});

// Indexes tối ưu cho truy vấn phổ biến
MastraThreadSchema.index({ resourceId: 1, createdAt: -1 });

/**
 * Lấy (hoặc tạo nếu chưa tồn tại) Model cho `mastra_threads`
 * Tránh lỗi khi hot-reload bằng cách dùng mongoose.models
 */
export function getMastraThreadModel(): Model<MastraThread> {
  return (mongoose.models.MastraThread as Model<MastraThread>)
    || mongoose.model<MastraThread>('MastraThread', MastraThreadSchema);
}

export default getMastraThreadModel;


