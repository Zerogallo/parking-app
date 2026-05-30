const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'parking-app-secret-2024';

// Middleware CORS apenas
app.use(cors());

// Middleware manual para parsear JSON (sem o body-parser problemático)
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (body && body.trim()) {
        try {
          req.body = JSON.parse(body);
        } catch (e) {
          console.log('Erro ao parsear JSON:', e.message);
          req.body = {};
        }
      } else {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

// Configurar caminho do arquivo de dados
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'parkingData.json');

// Criar pasta data se não existir
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('Pasta data criada');
}

// Inicializar arquivo de dados se não existir
if (!fs.existsSync(DATA_FILE)) {
  console.log('Criando arquivo de dados inicial...');
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
  console.log('Arquivo de dados criado com 30 vagas');
}

console.log('Arquivo de dados:', DATA_FILE);

// Funções auxiliares
const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler dados:', error);
    return { activeParkings: [], history: [], spots: [] };
  }
};

const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('Dados salvos com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    return false;
  }
};

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalido' });
    req.user = user;
    next();
  });
};

// ========== ROTAS ==========

// Rota de login
app.post('/api/login', (req, res) => {
  console.log('Login solicitado');
  const token = jwt.sign({ user: 'parking-admin' }, SECRET_KEY, { expiresIn: '24h' });
  res.json({ 
    token: token
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor rodando',
    timestamp: new Date().toISOString()
  });
});

// Obter estacionamentos ativos
app.get('/api/active-parkings', authenticateToken, (req, res) => {
  console.log('Buscando estacionamentos ativos');
  const data = readData();
  res.json(data.activeParkings);
});

// Obter vagas
app.get('/api/spots', authenticateToken, (req, res) => {
  console.log('Buscando informacoes das vagas');
  const data = readData();
  res.json(data.spots);
});

// Registrar entrada
app.post('/api/entry', authenticateToken, (req, res) => {
  console.log('Registrando nova entrada');
  console.log('Body recebido:', req.body);
  
  const data = readData();
  const { spotNumber, customerName, plate, carColor, brand, photo } = req.body;
  
  if (!spotNumber || !customerName || !plate || !carColor || !brand) {
    return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
  }
  
  const spot = data.spots.find(s => s.number === parseInt(spotNumber));
  if (!spot) {
    return res.status(400).json({ error: 'Vaga nao encontrada' });
  }
  
  if (spot.isOccupied) {
    return res.status(400).json({ error: 'Vaga ja esta ocupada' });
  }

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

  data.activeParkings.push(newParking);
  spot.isOccupied = true;
  spot.currentVehicle = newParking;
  
  writeData(data);
  console.log('Entrada registrada:', plate, 'vaga', spotNumber);
  res.status(201).json(newParking);
});

// Registrar saída
app.post('/api/exit/:id', authenticateToken, (req, res) => {
  console.log('Registrando saida');
  console.log('ID:', req.params.id);
  
  const data = readData();
  const parkingId = parseInt(req.params.id);
  
  const parkingIndex = data.activeParkings.findIndex(p => p.id === parkingId);
  if (parkingIndex === -1) {
    return res.status(404).json({ error: 'Estacionamento nao encontrado' });
  }
  
  const parking = data.activeParkings[parkingIndex];
  const entryDate = new Date(parking.entryTime);
  const exitDate = new Date();
  const diffMs = exitDate - entryDate;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  
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

  data.history.unshift(completedParking);
  data.activeParkings.splice(parkingIndex, 1);
  
  const spot = data.spots.find(s => s.number === parking.spotNumber);
  if (spot) {
    spot.isOccupied = false;
    spot.currentVehicle = null;
  }
  
  writeData(data);
  console.log('Saida registrada:', parking.plate);
  res.json(completedParking);
});

// Histórico
app.get('/api/history', authenticateToken, (req, res) => {
  console.log('Buscando historico completo');
  const data = readData();
  res.json(data.history);
});

// Comprovante
app.get('/api/receipt/:id', authenticateToken, (req, res) => {
  console.log('Buscando comprovante');
  const data = readData();
  const id = parseInt(req.params.id);
  const parking = data.history.find(p => p.id === id);
  
  if (!parking) {
    return res.status(404).json({ error: 'Registro nao encontrado' });
  }
  
  res.json(parking);
});

// Debug
app.get('/api/debug', authenticateToken, (req, res) => {
  const data = readData();
  res.json({
    activeCount: data.activeParkings.length,
    historyCount: data.history.length,
    spotsOccupied: data.spots.filter(s => s.isOccupied).length
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('Servidor rodando em http://localhost:' + PORT);
  console.log('========================================');
});