// scripts/migrate.js - Script de migração do banco
const { connectDB, User, dbUtils } = require('../models');

// Dados de exemplo
const seedUsers = [
  {
    email: 'admin@testgenium.com',
    password: 'admin123',
    companyName: 'TestGenium',
    fullName: 'Administrador Sistema',
    plan: 'enterprise',
    planLimits: {
      testsPerMonth: -1,
      maxConcurrentTests: 10,
      apiAccess: true,
      customReports: true
    },
    emailVerified: true,
    isActive: true
  },
  {
    email: 'demo@empresa.com',
    password: 'demo123',
    companyName: 'Empresa Demo LTDA',
    fullName: 'João Silva Demo',
    plan: 'professional',
    usage: {
      testsThisMonth: 15,
      totalTests: 45,
      lastTestDate: new Date()
    },
    emailVerified: true,
    isActive: true
  }
];

async function runMigration() {
  try {
    console.log('🚀 Iniciando migração do banco de dados...');
    
    await connectDB();
    
    // Limpa dados existentes em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Limpando dados existentes...');
      await User.deleteMany({});
    }
    
    // Cria usuários
    console.log('👥 Criando usuários...');
    for (const userData of seedUsers) {
      const user = await dbUtils.createUser(userData);
      console.log(`✅ Usuário criado: ${user.email}`);
    }
    
    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'migrate') {
    runMigration();
  } else {
    console.log('📚 Uso: node migrate.js migrate');
  }
}