import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Untitled Animation',
    },
    prompt: {
      type: String,
      required: true,
    },
    manimCode: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'generating-code', 'code-ready', 'rendering', 'completed', 'failed'],
      default: 'pending',
    },
    videoUrl: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    renderSettings: {
      quality: {
        type: String,
        enum: ['low', 'medium', 'high', '4k'],
        default: 'medium',
      },
      resolution: {
        type: String,
        default: '1280x720',
      },
      fps: {
        type: Number,
        default: 30,
      },
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Project', projectSchema);
