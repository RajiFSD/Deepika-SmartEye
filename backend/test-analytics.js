// Run this script to test analytics directly
// node test-analytics.js

const { PeopleCountLog } = require("./src/models");
const { Op } = require("sequelize");
const { sequelize } = require("./src/config/database");

async function testAnalytics() {
  try {
    console.log('🔍 ========== ANALYTICS TEST ==========');
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    console.log('📅 Testing date range:');
    console.log('  Start:', today.toISOString());
    console.log('  End:', tomorrow.toISOString());
    
    // Test 1: Check if table exists and has data
    console.log('\n📊 Test 1: Checking table data...');
    const totalCount = await PeopleCountLog.count();
    console.log(`✅ Total records in people_count_logs: ${totalCount}`);
    
    // Test 2: Check today's data
    console.log('\n📊 Test 2: Checking today\'s data...');
    const todayCount = await PeopleCountLog.count({
      where: {
        detection_time: {
          [Op.between]: [today, tomorrow]
        }
      }
    });
    console.log(`✅ Records for today: ${todayCount}`);
    
    // Test 3: Get sample records
    console.log('\n📊 Test 3: Sample records...');
    const samples = await PeopleCountLog.findAll({
      limit: 5,
      order: [['detection_time', 'DESC']],
      raw: true
    });
    console.log('Sample records:', JSON.stringify(samples, null, 2));
    
    // Test 4: Try the HOUR function directly
    console.log('\n📊 Test 4: Testing HOUR function...');
    const hourTest = await sequelize.query(
      `SELECT HOUR(detection_time) as hour, direction, COUNT(*) as count 
       FROM people_count_logs 
       WHERE detection_time >= ? AND detection_time < ?
       GROUP BY hour, direction
       ORDER BY hour ASC`,
      {
        replacements: [today, tomorrow],
        type: sequelize.QueryTypes.SELECT
      }
    );
    console.log('Raw SQL result:', JSON.stringify(hourTest, null, 2));
    
    // Test 5: Try Sequelize's HOUR function
    console.log('\n📊 Test 5: Testing Sequelize HOUR function...');
    const sequelizeHourTest = await PeopleCountLog.findAll({
      where: {
        detection_time: {
          [Op.between]: [today, tomorrow]
        }
      },
      attributes: [
        [sequelize.fn('HOUR', sequelize.col('detection_time')), 'hour'],
        'direction',
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      group: ['hour', 'direction'],
      order: [[sequelize.literal('hour'), 'ASC']],
      raw: true
    });
    console.log('Sequelize result:', JSON.stringify(sequelizeHourTest, null, 2));
    
    // Test 6: Check column names
    console.log('\n📊 Test 6: Checking table structure...');
    const tableDesc = await sequelize.query(
      'DESCRIBE people_count_logs',
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('Table columns:', tableDesc.map(col => col.Field));
    
    console.log('\n✅ ========== TEST COMPLETE ==========');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAnalytics();