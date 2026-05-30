import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../types';
import ParkingService from '../services/ParkingService';

interface CheckoutScreenProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

const CheckoutScreen = ({ vehicle, onClose }: CheckoutScreenProps) => {
  const [currentValue, setCurrentValue] = useState(0);
  const [timeDisplay, setTimeDisplay] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      updateValues();
      const interval = setInterval(updateValues, 1000);
      return () => clearInterval(interval);
    }
  }, [vehicle]);

  const updateValues = () => {
    if (!vehicle) return;
    
    const entry = new Date(vehicle.entryTime);
    const now = new Date();
    const diffMs = now.getTime() - entry.getTime();
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const h = Math.floor(diffSeconds / 3600);
    const m = Math.floor((diffSeconds % 3600) / 60);
    const s = diffSeconds % 60;
    
    setTimeDisplay(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    
    if (hours >= 24) {
      const days = Math.ceil(hours / 24);
      setCurrentValue(days * 50);
    } else {
      setCurrentValue(hours * 5);
    }
  };

  const handleCheckout = async () => {
    if (!vehicle) {
      Alert.alert('Erro', 'Veículo não encontrado');
      return;
    }
    
    Alert.alert(
      'Confirmar Saída',
      `Deseja registrar a saída do veículo ${vehicle.plate}?\n\nVaga: ${vehicle.spotNumber}\nValor atual: R$ ${currentValue.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('🚪 Registrando saída do veículo ID:', vehicle.id);
              const result = await ParkingService.registerExit(vehicle.id);
              console.log('📦 Resultado:', result);
              
              if (result.success) {
                Alert.alert('Sucesso', 'Saída registrada com sucesso!');
                onClose();
              } else {
                Alert.alert('Erro', result.error || 'Erro ao registrar saída');
              }
            } catch (error) {
              console.error('❌ Erro:', error);
              Alert.alert('Erro', 'Não foi possível registrar a saída');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!vehicle) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Saída de Veículo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Vaga</Text>
          <Text style={styles.infoValue}>{vehicle.spotNumber}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Cliente</Text>
          <Text style={styles.infoValue}>{vehicle.customerName}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Placa</Text>
          <Text style={styles.infoValue}>{vehicle.plate}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Veículo</Text>
          <Text style={styles.infoValue}>{vehicle.brand} - {vehicle.carColor}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Horário de Entrada</Text>
          <Text style={styles.infoValue}>
            {new Date(vehicle.entryTime).toLocaleString()}
          </Text>
        </View>

        <View style={styles.timeCard}>
          <Text style={styles.timeLabel}>Tempo Estacionado</Text>
          <Text style={styles.timeValue}>{timeDisplay}</Text>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Valor a Pagar</Text>
          <Text style={styles.totalValue}>R$ {currentValue.toFixed(2)}</Text>
          <Text style={styles.paymentInfo}>
            *R$ 5,00 por hora | R$ 50,00 diária
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={[styles.checkoutButton, loading && styles.disabledButton]} 
        onPress={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="exit-outline" size={24} color="#fff" />
            <Text style={styles.checkoutButtonText}>Registrar Saída</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timeCard: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 8,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    fontFamily: 'monospace',
  },
  totalCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  checkoutButton: {
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;