/**
 * Object Counting Job Model
 * Compatible with sequelize.sync() - no migration needed
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ObjectCountingJob = sequelize.define('ObjectCountingJob', {
    job_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Unique job identifier'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'User who created the job'
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'branch_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Associated branch'
    },
    zone_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'zone_config',
        key: 'zone_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Associated zone'
    },
    camera_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cameras',
        key: 'camera_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Associated camera'
    },
    source_type: {
      type: DataTypes.ENUM('upload', 'stream'),
      allowNull: false,
      defaultValue: 'upload',
      comment: 'Source of video - uploaded file or camera stream'
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Original filename for uploaded videos'
    },
    file_path: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Path to uploaded video file'
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'File size in bytes'
    },
    stream_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'RTSP/HTTP stream URL for camera streams'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in seconds for stream processing'
    },
    model_type: {
      type: DataTypes.ENUM('hog', 'yolo'),
      allowNull: false,
      defaultValue: 'hog',
      comment: 'Object detection model: HOG (fast) or YOLO (accurate)'
    },
    status: {
      type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'queued',
      comment: 'Current job status'
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Processing progress (0-100%)'
    },
    total_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Total number of objects counted'
    },
    frames_processed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total number of video frames processed'
    },
    processing_time: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Total processing time in seconds'
    },
    results: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Detailed results: detections, video_info, output path, etc.'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if job failed'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional data: logs, camera_name, timestamps, etc.'
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When processing started'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When processing completed/failed/cancelled'
    }
  }, {
    tableName: 'object_counting_jobs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Stores object counting/detection job information',
    indexes: [
      {
        name: 'idx_obj_count_user_id',
        fields: ['user_id'],
        comment: 'Fast lookup by user'
      },
      {
        name: 'idx_obj_count_status',
        fields: ['status'],
        comment: 'Filter by job status'
      },
      {
        name: 'idx_obj_count_branch',
        fields: ['branch_id'],
        comment: 'Filter by branch'
      },
      {
        name: 'idx_obj_count_camera',
        fields: ['camera_id'],
        comment: 'Filter by camera'
      },
      {
        name: 'idx_obj_count_created',
        fields: ['created_at'],
        comment: 'Sort by creation date'
      },
      {
        name: 'idx_obj_count_user_status',
        fields: ['user_id', 'status'],
        comment: 'Composite index for user dashboard'
      }
    ]
  });

  // Define associations
  ObjectCountingJob.associate = (models) => {
    // Belongs to User
    ObjectCountingJob.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Belongs to Branch (optional)
    ObjectCountingJob.belongsTo(models.Branch, {
      foreignKey: 'branch_id',
      as: 'branch',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Belongs to Zone (optional)
    ObjectCountingJob.belongsTo(models.Zone, {
      foreignKey: 'zone_id',
      as: 'zone',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Belongs to Camera (optional)
    ObjectCountingJob.belongsTo(models.Camera, {
      foreignKey: 'camera_id',
      as: 'camera',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  return ObjectCountingJob;
};