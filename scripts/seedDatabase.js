/**
 * Database Seeder
 * Seeds the database with initial test data
 */

require('module-alias/register');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { 
  Tenant, 
  Branch, 
  User, 
  Camera, 
  ZoneConfig,
  sequelize 
} = require('../src/models');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // 1. Create Tenants
    console.log('📦 Creating tenants...');
    const tenant1 = await Tenant.create({
      tenant_name: 'Acme Corporation',
      tenant_code: 'ACME001',
      contact_email: 'admin@acme.com',
      contact_phone: '+1-555-0100',
      subscription_type: 'enterprise',
      is_active: true
    });
    console.log('✅ Tenant created: Acme Corporation\n');

    // 2. Create Branches
    console.log('🏢 Creating branches...');
    const branch1 = await Branch.create({
      tenant_id: tenant1.tenant_id,
      branch_name: 'Headquarters',
      branch_code: 'HQ001',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      timezone: 'America/New_York',
      is_active: true
    });

    const branch2 = await Branch.create({
      tenant_id: tenant1.tenant_id,
      branch_name: 'Downtown Office',
      branch_code: 'DT001',
      address: '456 Park Avenue',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      timezone: 'America/New_York',
      is_active: true
    });
    console.log('✅ Branches created: Headquarters, Downtown Office\n');

    // 3. Create Users
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const superAdmin = await User.create({
      tenant_id: tenant1.tenant_id,
      username: 'superadmin',
      email: 'superadmin@acme.com',
      password_hash: hashedPassword,
      full_name: 'Super Administrator',
      role: 'super_admin',
      is_active: true
    });

    const admin = await User.create({
      tenant_id: tenant1.tenant_id,
      username: 'admin',
      email: 'admin@acme.com',
      password_hash: hashedPassword,
      full_name: 'Admin User',
      role: 'admin',
      is_active: true
    });

    const manager = await User.create({
      tenant_id: tenant1.tenant_id,
      username: 'manager',
      email: 'manager@acme.com',
      password_hash: hashedPassword,
      full_name: 'Manager User',
      role: 'manager',
      is_active: true
    });

    const viewer = await User.create({
      tenant_id: tenant1.tenant_id,
      username: 'viewer',
      email: 'viewer@acme.com',
      password_hash: hashedPassword,
      full_name: 'Viewer User',
      role: 'viewer',
      is_active: true
    });
    console.log('✅ Users created: superadmin, admin, manager, viewer (password: admin123)\n');

    // 4. Create Cameras
    console.log('📹 Creating cameras...');
    const camera1 = await Camera.create({
      tenant_id: tenant1.tenant_id,
      branch_id: branch1.branch_id,
      camera_name: 'Main Entrance',
      camera_code: 'CAM001',
      camera_type: 'RTSP',
      stream_url: 'rtsp://admin:admin@192.168.1.100:554/stream1',
      location_description: 'Main entrance facing street',
      fps: 25,
      resolution: '1920x1080',
      is_active: true
    });

    const camera2 = await Camera.create({
      tenant_id: tenant1.tenant_id,
      branch_id: branch1.branch_id,
      camera_name: 'Back Exit',
      camera_code: 'CAM002',
      camera_type: 'RTSP',
      stream_url: 'rtsp://admin:admin@192.168.1.101:554/stream1',
      location_description: 'Emergency exit at back of building',
      fps: 25,
      resolution: '1920x1080',
      is_active: true
    });

    const camera3 = await Camera.create({
      tenant_id: tenant1.tenant_id,
      branch_id: branch2.branch_id,
      camera_name: 'Lobby Entrance',
      camera_code: 'CAM003',
      camera_type: 'IP',
      stream_url: 'rtsp://admin:admin@192.168.1.102:554/stream1',
      location_description: 'Lobby entrance',
      fps: 30,
      resolution: '2560x1440',
      is_active: true
    });
    console.log('✅ Cameras created: Main Entrance, Back Exit, Lobby Entrance\n');

    // 5. Create Zone Configs
    console.log('🔷 Creating zones...');
    await ZoneConfig.create({
      camera_id: camera1.camera_id,
      tenant_id: tenant1.tenant_id,
      zone_name: 'Entry Zone',
      polygon_json: [
        { x: 0.2, y: 0.3 },
        { x: 0.8, y: 0.3 },
        { x: 0.8, y: 0.9 },
        { x: 0.2, y: 0.9 }
      ],
      entry_direction: 'UP',
      is_active: true,
      created_by: superAdmin.user_id
    });

    await ZoneConfig.create({
      camera_id: camera2.camera_id,
      tenant_id: tenant1.tenant_id,
      zone_name: 'Exit Zone',
      polygon_json: [
        { x: 0.1, y: 0.2 },
        { x: 0.9, y: 0.2 },
        { x: 0.9, y: 0.8 },
        { x: 0.1, y: 0.8 }
      ],
      entry_direction: 'DOWN',
      is_active: true,
      created_by: superAdmin.user_id
    });
    console.log('✅ Zones created\n');

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   - Tenants: 1');
    console.log('   - Branches: 2');
    console.log('   - Users: 4');
    console.log('   - Cameras: 3');
    console.log('   - Zones: 2');
    console.log('\n🔑 Login Credentials:');
    console.log('   Username: superadmin | Password: admin123');
    console.log('   Username: admin      | Password: admin123');
    console.log('   Username: manager    | Password: admin123');
    console.log('   Username: viewer     | Password: admin123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run seeder
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seedDatabase;