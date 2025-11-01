/**
 * Database Synchronization Script
 * Syncs Sequelize models with MySQL database
 */

require('module-alias/register');
require('dotenv').config();
const { sequelize, syncDatabase } = require('../src/models');
const logger = require('../src/utils/logger');

async function sync() {
  try {
    logger.info('🔄 Starting database synchronization...\n');

    // Test connection first
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

    // Ask user for sync option
    const args = process.argv.slice(2);
    const option = args[0];

    let syncOptions = {};

    if (option === '--force') {
      logger.warn('⚠️  Force mode: This will DROP all tables and recreate them!');
      logger.warn('⚠️  All data will be lost!');
      syncOptions = { force: true };
    } else if (option === '--alter') {
      logger.info('📝 Alter mode: This will modify existing tables to match models');
      syncOptions = { alter: true };
    } else {
      logger.info('➕ Safe mode: This will only create missing tables');
      syncOptions = { alter: false };
    }

    // Perform sync
    await syncDatabase(syncOptions);
    
    logger.info('\n✅ Database synchronized successfully!');
    logger.info('\nℹ️  Usage:');
    logger.info('  npm run db:sync          - Safe mode (create missing tables only)');
    logger.info('  npm run db:sync --alter  - Alter mode (update existing tables)');
    logger.info('  npm run db:sync --force  - Force mode (drop and recreate all tables)');

  } catch (error) {
    logger.error('❌ Database synchronization failed:', error);
    throw error;
  } finally {
    await sequelize.close();
    logger.info('\n👋 Database connection closed');
  }
}

// Run sync
if (require.main === module) {
  sync()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = sync;