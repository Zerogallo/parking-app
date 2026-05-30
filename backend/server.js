const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'parking-app-secret-2024';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar caminho do arquivo de dados
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'parkingData.json');

// Criar pasta data se não existir
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Pasta data criada');
}

// Inicializar arquivo de dados se não existir
if (!fs.existsSync(DATA_FILE)) {
  console.log('📝 Criando arquivo de dados inicial...');
  const initialData = {
    activeParkings: [],
    history: [],
    spots: Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      isOccupied: false,
      currentVehicle: null
    }))
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  console.log('✅ Arquivo de dados criado com 30 vagas!');
}

console.log('📁 Arquivo de dados:', DATA_FILE);

// Funções auxiliares para ler/escrever dados
const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Erro ao ler dados:', error);
    return { activeParkings: [], history: [], spots: [] };
  }
};

const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Dados salvos com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar dados:', error);
    return false;
  }
};

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// ========== ROTAS DA API ==========

// Rota de login (gera token)
app.post('/api/login', (req, res) => {
  console.log('🔐 Login solicitado');
  const token = jwt.sign({ user: 'parking-admin' }, SECRET_KEY, { expiresIn: '24h' });
  res.json({ 
    success: true,
    token: token,
    message: 'Login realizado com sucesso'
  });
});

// Rota para testar se o servidor está rodando
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor rodando!',
    timestamp: new Date().toISOString()
  });
});

// Obter todos os estacionamentos ativos
app.get('/api/active-parkings', authenticateToken, (req, res) => {
  console.log('📋 Buscando estacionamentos ativos');
  const data = readData();
  console.log(`📊 Encontrados ${data.activeParkings.length} veículos ativos`);
  res.json(data.activeParkings);
});

// Obter todas as vagas
app.get('/api/spots', authenticateToken, (req, res) => {
  console.log('🗺️ Buscando informações das vagas');
  const data = readData();
  const occupiedCount = data.spots.filter(s => s.isOccupied).length;
  console.log(`📊 Vagas ocupadas: ${occupiedCount}/${data.spots.length}`);
  res.json(data.spots);
});

// Registrar entrada
app.post('/api/entry', authenticateToken, (req, res) => {
  console.log('🚗 Registrando nova entrada');
  console.log('📦 Dados recebidos:', req.body);
  
  const data = readData();
  const { spotNumber, customerName, plate, carColor, brand, photo } = req.body;
  
  // Validar campos obrigatórios
  if (!spotNumber || !customerName || !plate || !carColor || !brand) {
    console.log('❌ Campos obrigatórios faltando');
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  
  // Validar se a vaga existe
  const spot = data.spots.find(s => s.number === parseInt(spotNumber));
  if (!spot) {
    console.log(`❌ Vaga ${spotNumber} não encontrada`);
    return res.status(400).json({ error: 'Vaga não encontrada' });
  }
  
  if (spot.isOccupied) {
    console.log(`❌ Vaga ${spotNumber} já está ocupada`);
    return res.status(400).json({ error: 'Vaga já está ocupada' });
  }

  // Criar novo registro
  const newParking = {
    id: Date.now(),
    spotNumber: parseInt(spotNumber),
    plate: plate.toUpperCase(),
    customerName: customerName,
    carColor: carColor,
    brand: brand,
    photo: photo || null,
    entryTime: new Date().toISOString(),
    status: 'active'
  };

  // Adicionar aos ativos
  data.activeParkings.push(newParking);
  
  // Marcar vaga como ocupada
  spot.isOccupied = true;
  spot.currentVehicle = newParking;
  
  // Salvar dados
  const saved = writeData(data);
  
  if (saved) {
    console.log(`✅ Entrada registrada: ${plate} na vaga ${spotNumber}`);
    console.log(`📊 Total de ativos: ${data.activeParkings.length}`);
    res.status(201).json(newParking);
  } else {
    console.log('❌ Erro ao salvar entrada');
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// Registrar saída
app.post('/api/exit/:id', authenticateToken, (req, res) => {
  console.log('🚪 Registrando saída');
  const data = readData();
  const parkingId = parseInt(req.params.id);
  
  const parkingIndex = data.activeParkings.findIndex(p => p.id === parkingId);
  if (parkingIndex === -1) {
    console.log(`❌ Estacionamento com ID ${parkingId} não encontrado`);
    return res.status(404).json({ error: 'Estacionamento não encontrado' });
  }
  
  const parking = data.activeParkings[parkingIndex];
  const entryDate = new Date(parking.entryTime);
  const exitDate = new Date();
  const diffMs = exitDate - entryDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  const hours = Math.ceil(diffHours);
  
  // Calcular valor (R$5 por hora ou R$50 diária)
  let amount;
  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    amount = days * 50;
  } else {
    amount = hours * 5;
  }

  const completedParking = {
    ...parking,
    exitTime: exitDate.toISOString(),
    hoursParked: hours,
    amount: amount,
    status: 'completed'
  };

  // Mover para histórico (adicionar no início)
  data.history.unshift(completedParking);
  
  // Remover dos ativos
  data.activeParkings.splice(parkingIndex, 1);
  
  // Liberar vaga
  const spot = data.spots.find(s => s.number === parking.spotNumber);
  if (spot) {
    spot.isOccupied = false;
    spot.currentVehicle = null;
  }
  
  // Salvar dados
  const saved = writeData(data);
  
  if (saved) {
    console.log(`✅ Saída registrada: ${parking.plate}`);
    console.log(`💰 Valor cobrado: R$ ${amount}`);
    console.log(`📊 Horas estacionado: ${hours}h`);
    console.log(`📊 Total no histórico: ${data.history.length}`);
    res.json(completedParking);
  } else {
    console.log('❌ Erro ao salvar saída');
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// Obter histórico completo
app.get('/api/history', authenticateToken, (req, res) => {
  console.log('📜 Buscando histórico completo');
  const data = readData();
  console.log(`📊 Total no histórico: ${data.history.length}`);
  res.json(data.history);
});

// Obter comprovante específico
app.get('/api/receipt/:id', authenticateToken, (req, res) => {
  console.log('🧾 Buscando comprovante');
  const data = readData();
  const id = parseInt(req.params.id);
  
  // Primeiro busca no histórico
  let parking = data.history.find(p => p.id === id);
  
  // Se não encontrar, busca nos ativos
  if (!parking) {
    parking = data.activeParkings.find(p => p.id === id);
  }
  
  if (!parking) {
    console.log(`❌ Registro ${id} não encontrado`);
    return res.status(404).json({ error: 'Registro não encontrado' });
  }
  
  console.log(`✅ Comprovante encontrado para ${parking.plate}`);
  res.json(parking);
});

// Rota para debug - mostrar status atual
app.get('/api/debug', authenticateToken, (req, res) => {
  const data = readData();
  res.json({
    activeCount: data.activeParkings.length,
    historyCount: data.history.length,
    activeParkings: data.activeParkings.map(p => ({
      id: p.id,
      plate: p.plate,
      spot: p.spotNumber
    })),
    spotsOccupied: data.spots.filter(s => s.isOccupied).length,
    totalSpots: data.spots.length
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ════════════════════════════════════════════════════════════
  ✅ SERVIDOR DO ESTACIONAMENTO RODANDO!
  ════════════════════════════════════════════════════════════
  
  📡 LOCAL: http://localhost:${PORT}
  📡 REDE: http://192.168.1.68:${PORT} (altere para seu IP)
  
  🅿️  API de Estacionamento
  📁 Dados salvos em: ${DATA_FILE}
  
  ════════════════════════════════════════════════════════════
  📍 ROTAS DISPONÍVEIS:
  ════════════════════════════════════════════════════════════
  
  🔓 ROTAS PÚBLICAS:
     POST → /api/login
     GET  → /api/health
  
  🔒 ROTAS PROTEGIDAS:
     GET  → /api/active-parkings  (veículos estacionados)
     GET  → /api/spots            (status das vagas)
     POST → /api/entry            (registrar entrada)
     POST → /api/exit/:id         (registrar saída)
     GET  → /api/history          (histórico completo)
     GET  → /api/receipt/:id      (buscar comprovante)
     GET  → /api/debug            (informações de debug)
  
  ════════════════════════════════════════════════════════════
  🎯 Servidor pronto para receber requisições!
  ════════════════════════════════════════════════════════════
  `);
});