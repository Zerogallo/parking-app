import { Vehicle, ParkingSpot } from '../types';

// Altere para o IP do seu computador na rede
// Para emulador Android: http://10.0.2.2:3000/api
// Para emulador iOS: http://localhost:3000/api
// Para dispositivo físico: http://192.168.x.x:3000/api
const API_URL = 'http://192.168.1.68:3000/api';

let authToken: string | null = null;

class ParkingService {
  private static async getToken(): Promise<string> {
    // Se já temos token, retorna ele
    if (authToken) {
      console.log('🔑 Usando token existente');
      return authToken;
    }

    try {
      console.log('🔐 Tentando login em:', `${API_URL}/login`);
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      console.log('📡 Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Resposta de erro:', errorText);
        throw new Error(`Falha no login: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Resposta do login:', data);
      
      authToken = data.token;
      console.log('✅ Token obtido com sucesso!');
      
      return authToken;
    } catch (error) {
      console.error('❌ Erro ao obter token:', error);
      throw error;
    }
  }

  private static async request(endpoint: string, options: RequestInit = {}) {
    try {
      const token = await this.getToken();
      
      const url = `${API_URL}${endpoint}`;
      console.log(`📡 Requisição para: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      });
      
      console.log(`📡 Status da resposta: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔄 Token expirado, renovando...');
          authToken = null;
          return this.request(endpoint, options);
        }
        const errorText = await response.text();
        console.error(`❌ Erro HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Requisição para ${endpoint} bem sucedida`);
      return data;
    } catch (error) {
      console.error(`❌ Erro na requisição ${endpoint}:`, error);
      throw error;
    }
  }

  static async getActiveParkings(): Promise<Vehicle[]> {
    try {
      console.log('📋 Buscando estacionamentos ativos...');
      const result = await this.request('/active-parkings');
      console.log(`📊 Encontrados ${result.length} veículos ativos`);
      console.log('📋 Veículos:', result);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar estacionamentos ativos:', error);
      return [];
    }
  }

  static async getSpots(): Promise<ParkingSpot[]> {
    try {
      console.log('🗺️ Buscando informações das vagas...');
      const result = await this.request('/spots');
      const occupiedCount = result.filter((s: ParkingSpot) => s.isOccupied).length;
      console.log(`📊 Vagas ocupadas: ${occupiedCount}/${result.length}`);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar vagas:', error);
      return [];
    }
  }

  static async registerEntry(data: any): Promise<any> {
    try {
      console.log('🚗 Registrando entrada...');
      console.log('📦 Dados da entrada:', data);
      
      const result = await this.request('/entry', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      console.log('✅ Entrada registrada com sucesso!');
      console.log('📦 Resposta:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Erro ao registrar entrada:', error);
      return { success: false, error: 'Erro ao registrar entrada. Verifique se o servidor está rodando.' };
    }
  }

  static async registerExit(id: number): Promise<any> {
    try {
      console.log(`🚪 Registrando saída do veículo ID: ${id}`);
      
      const result = await this.request(`/exit/${id}`, {
        method: 'POST'
      });
      
      console.log('✅ Saída registrada com sucesso!');
      console.log('📦 Resposta:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Erro ao registrar saída:', error);
      return { success: false, error: 'Erro ao registrar saída' };
    }
  }

  static async getHistory(): Promise<Vehicle[]> {
    try {
      console.log('📜 Buscando histórico completo...');
      const result = await this.request('/history');
      console.log(`📊 Encontrados ${result.length} registros no histórico`);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }
  }

  static async getReceipt(id: number): Promise<any> {
    try {
      console.log(`🧾 Buscando comprovante do ID: ${id}`);
      const result = await this.request(`/receipt/${id}`);
      console.log('✅ Comprovante encontrado!');
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar comprovante:', error);
      throw error;
    }
  }

  // Método para debug - testar conexão com o servidor
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testando conexão com o servidor...');
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      console.log('✅ Servidor respondendo:', data);
      return true;
    } catch (error) {
      console.error('❌ Servidor não está respondendo:', error);
      return false;
    }
  }

  // Método para limpar token (forçar novo login)
  static clearToken(): void {
    console.log('🗑️ Limpando token...');
    authToken = null;
  }

  // Método para obter status atual do estacionamento
  static async getDebugInfo(): Promise<any> {
    try {
      console.log('🐛 Buscando informações de debug...');
      const result = await this.request('/debug');
      console.log('📊 Debug info:', result);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar debug:', error);
      return null;
    }
  }
}

export default ParkingService;