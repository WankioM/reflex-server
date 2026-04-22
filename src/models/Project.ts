import mongoose, { Schema, Document, Types } from 'mongoose';

export type ProjectSource = 'manual' | 'github';
export type ProjectStatus = 'active' | 'archived';

export interface IProject extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description: string;
  source: ProjectSource;
  githubRepo: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    source: { type: String, enum: ['manual', 'github'], default: 'manual' },
    githubRepo: { type: String, default: null },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ userId: 1, createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
