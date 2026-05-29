import { Vehicle, ParkingSpot } from '../types';

// Use o IP do seu computador
const API_URL = 'http://192.168.1.68:3000/api';

let authToken: string | null = null;

class ParkingService {
  private static async getToken(): Promise<string> {
    if (authToken) {
      return authToken;
    }

    try {
      console.log('🔐 Tentando login em:', `${API_URL}/login`);
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Envia objeto vazio
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
      
      console.log(`📡 Requisição para: ${API_URL}${endpoint}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔄 Token expirado, renovando...');
          authToken = null;
          return this.request(endpoint, options);
        }
        throw new Error(`HTTP ${response.status}`);
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
      return await this.request('/active-parkings');
    } catch (error) {
      console.error('Erro ao buscar estacionamentos ativos:', error);
      return [];
    }
  }

  static async getSpots(): Promise<ParkingSpot[]> {
    try {
      return await this.request('/spots');
    } catch (error) {
      console.error('Erro ao buscar vagas:', error);
      return [];
    }
  }

  static async registerEntry(data: any): Promise<any> {
    try {
      const result = await this.request('/entry', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      return { success: false, error: 'Erro ao registrar entrada' };
    }
  }

  static async registerExit(id: number): Promise<any> {
    try {
      const result = await this.request(`/exit/${id}`, {
        method: 'POST'
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
      return { success: false, error: 'Erro ao registrar saída' };
    }
  }

  static async getHistory(): Promise<Vehicle[]> {
    try {
      return await this.request('/history');
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  }

  static async getReceipt(id: number): Promise<any> {
    try {
      return await this.request(`/receipt/${id}`);
    } catch (error) {
      console.error('Erro ao buscar comprovante:', error);
      throw error;
    }
  }
}

export default ParkingService;