// server.js - Servidor principal da TestGenium
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Importar modelos
const { connectDB, User, Test, dbUtils } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// ==============================================
// MIDDLEWARES
// ==============================================

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==============================================

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// ==============================================
// ROTAS DE AUTENTICAÇÃO
// ==============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    const user = await dbUtils.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Conta desativada' });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user._id,
        email: user.email,
        companyName: user.companyName,
        fullName: user.fullName,
        plan: user.plan,
        usage: user.usage,
        planLimits: user.planLimits
      },
      token
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, companyName, fullName, phone, plan = 'basic' } = req.body;
    
    if (!email || !password || !companyName || !fullName) {
      return res.status(400).json({ 
        error: 'Email, senha, nome da empresa e nome completo são obrigatórios' 
      });
    }
    
    const existingUser = await dbUtils.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    const userData = { email, password, companyName, fullName, phone, plan };
    const user = await dbUtils.createUser(userData);
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user._id,
        email: user.email,
        companyName: user.companyName,
        fullName: user.fullName,
        plan: user.plan
      },
      token
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==============================================
// ROTAS DE TESTES
// ==============================================

// Iniciar teste
app.post('/api/tests/start', authenticateToken, async (req, res) => {
  try {
    const { targetUrl, testType = 'complete', depth = 'standard' } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }
    
    if (!req.user.canRunTest()) {
      return res.status(403).json({ 
        error: 'Limite de testes mensais atingido',
        usage: req.user.usage,
        limits: req.user.planLimits
      });
    }
    
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testData = {
      testId,
      userId: req.user._id,
      targetUrl,
      testType,
      depth,
      status: 'running',
      startedAt: new Date()
    };
    
    const test = await dbUtils.createTest(testData);
    
    // Simular execução do teste (em produção seria assíncrono)
    setTimeout(async () => {
      const vulnerabilities = [
        {
          type: 'SQL Injection',
          severity: 'high',
          payload: "' OR '1'='1",
          description: 'Possível vulnerabilidade de SQL Injection detectada',
          recommendation: 'Implemente prepared statements e validação de entrada',
          url: targetUrl
        }
      ];
      
      await Test.findOneAndUpdate(
        { testId },
        {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          duration: 120,
          results: {
            totalTests: 12,
            vulnerabilities: vulnerabilities.length,
            coverage: 85,
            score: 'B',
            summary: { high: 1, medium: 0, low: 0 }
          },
          vulnerabilities
        }
      );
    }, 5000);
    
    res.json({
      testId,
      status: 'started',
      message: 'Teste iniciado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro iniciando teste:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Status do teste
app.get('/api/tests/:testId', authenticateToken, async (req, res) => {
  try {
    const { testId } = req.params;
    
    const test = await Test.findOne({ 
      testId, 
      userId: req.user._id 
    });
    
    if (!test) {
      return res.status(404).json({ error: 'Teste não encontrado' });
    }
    
    res.json({
      testId: test.testId,
      status: test.status,
      progress: test.progress,
      targetUrl: test.targetUrl,
      testType: test.testType,
      startedAt: test.startedAt,
      completedAt: test.completedAt,
      duration: test.duration,
      results: test.results,
      vulnerabilities: test.vulnerabilities
    });
    
  } catch (error) {
    console.error('Erro obtendo teste:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Histórico de testes
app.get('/api/tests/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    const tests = await dbUtils.getTestHistory(
      req.user._id, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    const totalTests = await Test.countDocuments({ userId: req.user._id });
    
    res.json({
      tests: tests.map(test => ({
        testId: test.testId,
        targetUrl: test.targetUrl,
        testType: test.testType,
        status: test.status,
        createdAt: test.createdAt,
        completedAt: test.completedAt,
        vulnerabilities: test.results?.vulnerabilities || 0,
        score: test.results?.score || 'N/A'
      })),
      total: totalTests
    });
    
  } catch (error) {
    console.error('Erro obtendo histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==============================================
// ROTAS PÚBLICAS
// ==============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Perfil do usuário
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const stats = await dbUtils.getUserStats(req.user._id);
    
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        companyName: req.user.companyName,
        fullName: req.user.fullName,
        plan: req.user.plan,
        createdAt: req.user.createdAt
      },
      stats,
      planLimits: req.user.planLimits
    });
    
  } catch (error) {
    console.error('Erro obtendo perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==============================================
// INICIALIZAÇÃO
// ==============================================

async function startServer() {
  try {
    await connectDB();
    console.log('📊 Banco de dados conectado');
    
    app.listen(PORT, () => {
      console.log(`🚀 TestGenium Backend rodando na porta ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
      console.log('\n🎯 Credenciais de teste:');
      console.log('Email: demo@empresa.com');
      console.log('Senha: demo123');
    });
    
  } catch (error) {
    console.error('❌ Erro iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();