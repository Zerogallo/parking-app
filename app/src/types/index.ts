export interface Vehicle {
  id: number;
  spotNumber: number;
  plate: string;
  customerName: string;
  carColor: string;
  brand: string;
  photo?: string;
  entryTime: string;
  exitTime?: string;
  hoursParked?: number;
  amount?: number;
  status: 'active' | 'completed';
}

export interface ParkingSpot {
  id: number;
  number: number;
  isOccupied: boolean;
  currentVehicle: Vehicle | null;
}

export interface Receipt {
  id: number;
  spotNumber: number;
  plate: string;
  customerName: string;
  carColor: string;
  brand: string;
  entryTime: string;
  exitTime: string;
  hoursParked: number;
  amount: number;
}