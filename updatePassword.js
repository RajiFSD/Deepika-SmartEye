require('module-alias/register');
const bcrypt = require('bcryptjs');
const { User } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function updatePassword() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Find the user
    const user = await User.findOne({ 
      where: { email: 'admin@demostore.com' } 
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('📧 Found user:', user.email);
    console.log('🔑 Current password_hash:', user.password_hash);

    // Generate proper bcrypt hash
    const plainPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    
    console.log('🔐 New bcrypt hash generated:', hashedPassword);

    // Update the password
    await user.update({ password_hash: hashedPassword });

    console.log('');
    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('📧 Email: admin@demostore.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role:', user.role);

    // Test the password
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('');
    console.log(isValid ? '✅ Password verification: SUCCESS' : '❌ Password verification: FAILED');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updatePassword();