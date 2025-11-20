/**
 * Database Configuration
 * Sequelize setup with connection pooling
 * 🆕 OPTIMIZED FOR VIDEO PROCESSING & DETECTION
 */

const { Sequelize } = require('sequelize');
const logger = require('@utils/logger');

// Database configuration from environment variables
const config = {
  database: process.env.DB_NAME || 'smarteye_ai',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'VconnectWinze@2025',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  
  // 🆕 OPTIMIZED CONNECTION POOL FOR VIDEO PROCESSING
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 20,        // Increased from 5 to 20
    min: parseInt(process.env.DB_POOL_MIN) || 5,         // Increased from 0 to 5
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,  // Increased from 30000 to 60000 (60 seconds)
    idle: parseInt(process.env.DB_POOL_IDLE) || 30000,   // Increased from 10000 to 30000
    evict: 10000,                                         // Run eviction every 10 seconds
  },
  
  // 🆕 RETRY CONFIGURATION
  retry: {
    max: 3,                    // Retry failed operations 3 times
    timeout: 3000,             // Wait 3 seconds between retries
  },
  
  // 🆕 ENHANCED DIALECT OPTIONS
  dialectOptions: {
    connectTimeout: 60000,     // MySQL connection timeout (60 seconds)
    multipleStatements: false, // Security: prevent SQL injection
    decimalNumbers: true,      // Handle decimals properly
    dateStrings: true,         // Get dates as strings
    typeCast: true,            // Type casting
  },
  
  define: {
    timestamps: false,
    underscored: true,
    freezeTableName: true,
  },
  
  // 🆕 SET TO INDIAN TIMEZONE (or keep UTC)
  timezone: process.env.DB_TIMEZONE || '+05:30', // IST (or use '+00:00' for UTC)
  
  // 🆕 BENCHMARK QUERIES (helpful for optimization)
  benchmark: process.env.NODE_ENV === 'development',
};

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    retry: config.retry,
    dialectOptions: config.dialectOptions,
    define: config.define,
    timezone: config.timezone,
    benchmark: config.benchmark,
  }
);

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
    
    // 🆕 Log connection pool info
    const poolInfo = sequelize.connectionManager.pool;
    logger.info(`📊 Connection Pool: max=${config.pool.max}, min=${config.pool.min}, acquire=${config.pool.acquire}ms`);
    
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to database:', { error: error.message });
    return false;
  }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('✅ Database connection closed gracefully');
  } catch (error) {
    logger.error('❌ Error closing database connection:', { error: error.message });
  }
};

/**
 * Sync database (use carefully in production)
 */
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    logger.info('✅ Database synchronized', options);
  } catch (error) {
    logger.error('❌ Database sync failed:', { error: error.message });
    throw error;
  }
};

/**
 * 🆕 Check database health
 */
const checkHealth = async () => {
  try {
    await sequelize.authenticate();
    const pool = sequelize.connectionManager.pool;
    
    return {
      healthy: true,
      pool: {
        size: pool.size,
        available: pool.available,
        using: pool.using,
        waiting: pool.waiting,
      },
      config: {
        max: config.pool.max,
        min: config.pool.min,
        acquire: config.pool.acquire,
      }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

/**
 * 🆕 Monitor connection pool (for debugging)
 */
const monitorPool = () => {
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const pool = sequelize.connectionManager.pool;
      logger.debug(`📊 Pool Status: Active=${pool.size}, Available=${pool.available}, Waiting=${pool.waiting}`);
    }, 30000); // Log every 30 seconds
  }
};

/**
 * 🆕 Graceful shutdown handler
 */
const gracefulShutdown = async () => {
  logger.info('🔄 Initiating graceful database shutdown...');
  try {
    await closeConnection();
    logger.info('✅ Database shutdown complete');
  } catch (error) {
    logger.error('❌ Error during database shutdown:', { error: error.message });
  }
};

// 🆕 Handle process termination
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 🆕 Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error('❌ Uncaught Exception:', { error: error.message });
  await gracefulShutdown();
  process.exit(1);
});

// 🆕 Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', { reason, promise });
});

module.exports = {
  sequelize,
  testConnection,
  closeConnection,
  syncDatabase,
  checkHealth,      // 🆕 New export
  monitorPool,      // 🆕 New export
  gracefulShutdown, // 🆕 New export
  config,
};