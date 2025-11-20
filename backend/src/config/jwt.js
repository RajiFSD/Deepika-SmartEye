// 🆕 OPTIMIZED CONNECTION POOL SETTINGS
// DB_POOL_MAX=20          # Maximum connections (increased for video processing)
// DB_POOL_MIN=5           # Minimum connections (keep connections warm)
// DB_POOL_ACQUIRE=60000   # Maximum wait time to get connection (60 seconds)
// DB_POOL_IDLE=30000      # Maximum idle time before releasing (30 seconds)

// # Database timezone
// DB_TIMEZONE=+05:30      # Indian Standard Time (use +00:00 for UTC)

// # ============================================
// # DETECTION SERVICE CONFIGURATION
// # ============================================
// DETECTION_SERVICE_URL=http://localhost:5000

// # ============================================
// # LOGGING
// # ============================================
// LOG_LEVEL=info

// # ============================================
// # CORS SETTINGS
// # ============================================
// CORS_ORIGIN=http://localhost:5173

// # ============================================
// # OPTIONAL: REDIS (if using caching)
// # ============================================
// # REDIS_HOST=localhost
// # REDIS_PORT=6379
// # REDIS_PASSWORD=

// # ============================================
// # OPTIONAL: EMAIL SETTINGS
// # ============================================
// # SMTP_HOST=smtp.gmail.com
// # SMTP_PORT=587
// # SMTP_USER=your-email@gmail.com
// # SMTP_PASSWORD=your-app-password

// # ============================================
// # PERFORMANCE TUNING
// # ============================================
// # Node.js memory limit (if needed)
// # NODE_OPTIONS=--max-old-space-size=4096

// # ============================================
// # FEATURE FLAGS
// # ============================================
// ENABLE_GENDER_DETECTION=true
// ENABLE_AGE_DETECTION=false
// ENABLE_EMOTION_DETECTION=false

// # ============================================
// # MONITORING (optional)
// # ============================================
// # ENABLE_METRICS=true
// # METRICS_PORT=9090