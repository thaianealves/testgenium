import React, { useState, useEffect } from 'react';
import { AlertCircle, Shield, Zap, Search, Smartphone, Play, CheckCircle, XCircle, Clock, TrendingUp, User, LogOut } from 'lucide-react';

// Interfaces TypeScript
interface User {
  id: string;
  email: string;
  companyName: string;
  fullName: string;
  plan: string;
}

interface TestConfig {
  targetUrl: string;
  testType: string;
  depth: string;
  customHeaders: string;
}

interface Vulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  payload: string;
  description: string;
  recommendation: string;
  url: string;
}

interface Stats {
  totalTests: number;
  vulnerabilities: number;
  coverage: number;
  score: string;
}

const TestGenium: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [testConfig, setTestConfig] = useState<TestConfig>({
    targetUrl: '',
    testType: 'complete',
    depth: 'standard',
    customHeaders: ''
  });
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<Vulnerability[]>([]);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalTests: 0,
    vulnerabilities: 0,
    coverage: 0,
    score: 'A+'
  });

  const testTypes = [
    { icon: <Shield className="w-6 h-6" />, title: 'Testes de Segurança', desc: 'SQL Injection, XSS, CSRF e vulnerabilidades' },
    { icon: <Zap className="w-6 h-6" />, title: 'Testes de Performance', desc: 'Tempo de resposta, throughput e carga' },
    { icon: <Search className="w-6 h-6" />, title: 'Análise de Código', desc: 'Qualidade, padrões e detecção de bugs' },
    { icon: <Smartphone className="w-6 h-6" />, title: 'Testes Funcionais', desc: 'Validação de funcionalidades e UX' }
  ];

  // Função de login
  const handleLogin = async (): Promise<void> => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        loadUserStats(data.token);
      } else {
        alert(data.error || 'Erro no login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro de conexão com o servidor');
    }
  };

  // Carregar estatísticas
  const loadUserStats = async (token: string): Promise<void> => {
    try {
      const response = await fetch('http://localhost:5000/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalTests: data.stats.totalTests,
          vulnerabilities: data.stats.totalVulnerabilities,
          coverage: 85,
          score: 'A+'
        });
      }
    } catch (error) {
      console.error('Erro carregando stats:', error);
    }
  };

  // Logout
  const handleLogout = (): void => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setResults([]);
    setStats({ totalTests: 0, vulnerabilities: 0, coverage: 0, score: 'A+' });
  };

  // Verificar se já está logado
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
      loadUserStats(savedToken);
    }
  }, []);

  // Executar testes
  const runTests = async (): Promise<void> => {
    if (!testConfig.targetUrl) {
      alert('Por favor, insira uma URL válida.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Você precisa estar logado para executar testes.');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResults([]);

    try {
      const response = await fetch('http://localhost:5000/api/tests/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testConfig)
      });

      const data = await response.json();
      
      if (response.ok) {
        setCurrentTestId(data.testId);
        
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 20;
          });
        }, 1000);

        setTimeout(async () => {
          clearInterval(progressInterval);
          await checkTestResult(data.testId, token);
        }, 6000);

      } else {
        alert(data.error || 'Erro iniciando teste');
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Erro executando teste:', error);
      alert('Erro de conexão com o servidor');
      setIsRunning(false);
    }
  };

  // Verificar resultado do teste
  const checkTestResult = async (testId: string, token: string): Promise<void> => {
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${testId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const testData = await response.json();
        
        if (testData.status === 'completed') {
          setResults(testData.vulnerabilities || []);
          setStats(prev => ({
            ...prev,
            totalTests: prev.totalTests + 1,
            vulnerabilities: prev.vulnerabilities + (testData.vulnerabilities?.length || 0)
          }));
          setProgress(100);
        }
      }
    } catch (error) {
      console.error('Erro verificando resultado:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string): React.ReactElement => {
    switch (severity) {
      case 'high': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'medium': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  // Tela de Login
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">TestGenium</h1>
            <p className="text-gray-600">Plataforma de Testes Automatizados</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email:
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha:
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              Entrar
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">🎯 Credenciais de teste:</p>
            <p className="text-sm text-gray-600">Email: demo@empresa.com</p>
            <p className="text-sm text-gray-600">Senha: demo123</p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-light mb-2">TestGenium</h1>
                <p className="text-xl opacity-90 font-light">Plataforma de Testes Automatizados e Análise de Segurança</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm opacity-75">Bem-vindo,</p>
                  <p className="font-semibold">{user?.fullName}</p>
                  <p className="text-xs opacity-75">{user?.companyName}</p>
                </div>
                <User className="w-8 h-8" />
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-lg text-center border border-gray-100">
                <div className="text-3xl font-bold text-purple-600 mb-2">{stats.totalTests}</div>
                <div className="text-gray-600 font-medium">Testes Executados</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg text-center border border-gray-100">
                <div className="text-3xl font-bold text-red-500 mb-2">{stats.vulnerabilities}</div>
                <div className="text-gray-600 font-medium">Vulnerabilidades</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg text-center border border-gray-100">
                <div className="text-3xl font-bold text-blue-500 mb-2">{stats.coverage}%</div>
                <div className="text-gray-600 font-medium">Cobertura</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg text-center border border-gray-100">
                <div className="text-3xl font-bold text-green-500 mb-2">{stats.score}</div>
                <div className="text-gray-600 font-medium">Score de Segurança</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {testTypes.map((type, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="text-purple-600">{type.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-800 ml-3">{type.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{type.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl mb-8 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
            <Search className="w-6 h-6 mr-3 text-purple-600" />
            Configuração de Testes
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do Sistema Alvo:
              </label>
              <input
                type="url"
                value={testConfig.targetUrl}
                onChange={(e) => setTestConfig({...testConfig, targetUrl: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="https://exemplo.com"
                disabled={isRunning}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Teste:
              </label>
              <select
                value={testConfig.testType}
                onChange={(e) => setTestConfig({...testConfig, testType: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                disabled={isRunning}
              >
                <option value="complete">Análise Completa</option>
                <option value="security">Apenas Segurança</option>
                <option value="performance">Apenas Performance</option>
                <option value="functional">Apenas Funcional</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profundidade da Análise:
              </label>
              <select
                value={testConfig.depth}
                onChange={(e) => setTestConfig({...testConfig, depth: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                disabled={isRunning}
              >
                <option value="basic">Básica (Rápida)</option>
                <option value="standard">Padrão (Recomendada)</option>
                <option value="deep">Profunda (Completa)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Headers Personalizados:
              </label>
              <textarea
                value={testConfig.customHeaders}
                onChange={(e) => setTestConfig({...testConfig, customHeaders: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors resize-none"
                rows={3}
                placeholder="Authorization: Bearer token&#10;Custom-Header: value"
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={runTests}
              disabled={isRunning || !testConfig.targetUrl}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full font-semibold flex items-center mx-auto hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Play className="w-5 h-5 mr-2" />
              {isRunning ? 'Executando Testes...' : 'Iniciar Testes'}
            </button>
          </div>

          {isRunning && (
            <div className="mt-6">
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-center mt-2 text-sm text-gray-600">
                Progresso: {Math.round(progress)}%
              </div>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-3 text-purple-600" />
              Resultados dos Testes
            </h2>

            <div className="space-y-4">
              {results.filter(r => r.severity === 'high' || r.severity === 'medium').length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-red-600 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Problemas Encontrados
                  </h3>
                  {results.filter(r => r.severity === 'high' || r.severity === 'medium').map((result, index) => (
                    <div key={index} className={`border-l-4 rounded-lg p-6 mb-4 ${getSeverityColor(result.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            {getSeverityIcon(result.severity)}
                            <h4 className="text-lg font-semibold text-gray-800 ml-2">
                              {result.type} - {result.severity.toUpperCase()}
                            </h4>
                          </div>
                          <p className="text-gray-700 mb-2">
                            <strong>Descrição:</strong> {result.description}
                          </p>
                          <p className="text-gray-700 mb-2">
                            <strong>Recomendação:</strong> {result.recommendation}
                          </p>
                          <p className="text-gray-600 text-sm">
                            <strong>URL:</strong> {result.url}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium text-green-600 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Status de Segurança
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    Teste concluído com sucesso! {results.length} verificações realizadas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestGenium;