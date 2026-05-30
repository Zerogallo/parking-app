import { Vehicle, ParkingSpot } from '../types';

const API_URL = 'http://192.168.1.68:3000/api';

let authToken: string | null = null;

class ParkingService {
  private static async getToken(): Promise<string> {
    if (authToken) {
      return authToken;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        }
        // Não enviar body no login
      });
      
      if (!response.ok) {
        throw new Error('Falha no login');
      }
      
      const data = await response.json();
      authToken = data.token;
      
      return authToken;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      throw error;
    }
  }

  private static async request(endpoint: string, options: RequestInit = {}) {
    try {
      const token = await this.getToken();
      
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
          authToken = null;
          return this.request(endpoint, options);
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição ${endpoint}:`, error);
      throw error;
    }
  }

  static async getActiveParkings(): Promise<Vehicle[]> {
    try {
      return await this.request('/active-parkings');
    } catch (error) {
      return [];
    }
  }

  static async getSpots(): Promise<ParkingSpot[]> {
    try {
      return await this.request('/spots');
    } catch (error) {
      return [];
    }
  }

  static async registerEntry(data: any): Promise<any> {
    try {
      // Garantir que os dados são válidos
      const body = {
        spotNumber: Number(data.spotNumber),
        customerName: String(data.customerName),
        plate: String(data.plate).toUpperCase(),
        carColor: String(data.carColor),
        brand: String(data.brand),
        photo: data.photo || null
      };
      
      console.log('Enviando:', body);
      
      const result = await this.request('/entry', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Erro:', error);
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
      console.error('Erro:', error);
      return { success: false, error: 'Erro ao registrar saída' };
    }
  }

  static async getHistory(): Promise<Vehicle[]> {
    try {
      return await this.request('/history');
    } catch (error) {
      return [];
    }
  }

  static async getReceipt(id: number): Promise<any> {
    try {
      return await this.request(`/receipt/${id}`);
    } catch (error) {
      throw error;
    }
  }
}

export default ParkingService;