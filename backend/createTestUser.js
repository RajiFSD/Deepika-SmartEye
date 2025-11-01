require('module-alias/register');
const bcrypt = require('bcryptjs');
const { User, Tenant } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function createTestUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Find existing tenant (tenant_id = 1 already exists)
    let tenant = await Tenant.findByPk(1);

    if (!tenant) {
      console.log('❌ Tenant with ID 1 not found. Checking for any tenant...');
      tenant = await Tenant.findOne();
      
      if (!tenant) {
        console.log('❌ No tenants found. Please create a tenant first.');
        process.exit(1);
      }
    }

    console.log('✅ Using tenant:', tenant.tenant_name, '(ID:', tenant.tenant_id + ')');

    // User details to create
    const newUserEmail = 'admin@smarteye.com';
    const newUserPassword = 'admin456';

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { email: newUserEmail } 
    });

    if (existingUser) {
      console.log('');
      console.log('⚠️  User already exists!');
      console.log('📧 Email:', existingUser.email);
      console.log('');
      console.log('Updating password...');
      
      // Update password
      const hashedPassword = await bcrypt.hash(newUserPassword, 12);
      await existingUser.update({ 
        password_hash: hashedPassword,
        is_active: true 
      });
      
      console.log('✅ Password updated successfully!');
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('       LOGIN CREDENTIALS');
      console.log('═══════════════════════════════════════');
      console.log('📧 Email:    ' + newUserEmail);
      console.log('🔑 Password: ' + newUserPassword);
      console.log('👤 Role:     ' + existingUser.role);
      console.log('═══════════════════════════════════════');
      
      process.exit(0);
    }

    // Create new user
    console.log('');
    console.log('🔄 Creating new user...');
    
    const hashedPassword = await bcrypt.hash(newUserPassword, 12);
    
    const user = await User.create({
      tenant_id: tenant.tenant_id,
      username: 'smarteye_admin',
      email: newUserEmail,
      password_hash: hashedPassword,
      full_name: 'SmartEye Admin',
      role: 'admin',
      is_active: true
    });

    console.log('✅ User created successfully!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('       LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:    ' + newUserEmail);
    console.log('🔑 Password: ' + newUserPassword);
    console.log('👤 Role:     ' + user.role);
    console.log('🏢 Tenant:   ' + tenant.tenant_name);
    console.log('🆔 User ID:  ' + user.user_id);
    console.log('═══════════════════════════════════════');
    console.log('');

    // Verify the password works
    const isValid = await bcrypt.compare(newUserPassword, hashedPassword);
    console.log('🔐 Password verification:', isValid ? '✅ SUCCESS' : '❌ FAILED');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    
    if (error.errors) {
      console.error('');
      console.error('Validation errors:');
      error.errors.forEach(err => {
        console.error('  • ' + err.message);
      });
    }
    
    console.error('');
    process.exit(1);
  }
}

createTestUser();