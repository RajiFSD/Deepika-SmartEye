
/**
 * Database Configuration
 * Sequelize setup with connection pooling
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
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 5,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: false,
    underscored: true,
    freezeTableName: true,
  },
  timezone: '+00:00', // UTC
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
    define: config.define,
    timezone: config.timezone,
  }
);

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
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
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', { error: error.message });
  }
};

/**
 * Sync database (use carefully in production)
 */
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    logger.info('Database synchronized', options);
  } catch (error) {
    logger.error('Database sync failed:', { error: error.message });
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  closeConnection,
  syncDatabase,
  config,
};