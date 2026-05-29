import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
    if (!vehicle) return;
    
    Alert.alert(
      'Confirmar Saída',
      `Deseja registrar a saída do veículo ${vehicle.plate}?\n\nValor atual: R$ ${currentValue.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            const result = await ParkingService.registerExit(vehicle.id);
            setLoading(false);
            
            if (result.success) {
              Alert.alert('Sucesso', 'Saída registrada com sucesso!');
              await printReceipt(result.data);
              onClose();
            } else {
              Alert.alert('Erro', result.error);
            }
          }
        }
      ]
    );
  };

  const printReceipt = async (receipt: any) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprovante de Estacionamento</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            margin: 0;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 32px;
            margin-bottom: 10px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #007AFF;
          }
          .subtitle {
            color: #666;
            font-size: 12px;
          }
          .content {
            margin: 20px 0;
          }
          .row {
            margin: 12px 0;
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .label {
            font-weight: bold;
            color: #666;
            display: inline-block;
            width: 100px;
          }
          .value {color: #333;
          }
          .total {
            background-color: #e8f5e9;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin-top: 20px;
          }
          .total .label {
            font-size: 18px;
            width: auto;
          }
          .total .value {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🅿️</div>
            <div class="title">PARKING APP</div>
            <div class="subtitle">Comprovante de Estacionamento</div>
          </div>
          
          <div class="content">
            <div class="row">
              <span class="label">Vaga:</span>
              <span class="value">${receipt.spotNumber}</span>
            </div>
            <div class="row">
              <span class="label">Placa:</span>
              <span class="value">${receipt.plate}</span>
            </div>
            <div class="row">
              <span class="label">Cliente:</span>
              <span class="value">${receipt.customerName}</span>
            </div>
            <div class="row">
              <span class="label">Veículo:</span>
              <span class="value">${receipt.brand} - ${receipt.carColor}</span>
            </div>
            <div class="row">
              <span class="label">Entrada:</span>
              <span class="value">${new Date(receipt.entryTime).toLocaleString()}</span>
            </div>
            <div class="row">
              <span class="label">Saída:</span>
              <span class="value">${new Date(receipt.exitTime).toLocaleString()}</span>
            </div>
            <div class="row">
              <span class="label">Tempo:</span>
              <span class="value">${receipt.hoursParked} horas</span>
            </div>
          </div>
          
          <div class="total">
            <div class="label">VALOR TOTAL</div>
            <div class="value">R$ ${receipt.amount.toFixed(2)}</div>
          </div>
          
          <div class="footer">
            Obrigado pela preferência!<br/>
            Este comprovante é válido como garantia.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o comprovante');
    }
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {vehicle.photo && (
          <Image source={{ uri: vehicle.photo }} style={styles.vehicleImage} />
        )}
        
        <View style={styles.infoCard}>
          <Ionicons name="location" size={24} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Vaga</Text>
            <Text style={styles.infoValue}>{vehicle.spotNumber}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="person" size={24} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Cliente</Text>
            <Text style={styles.infoValue}>{vehicle.customerName}</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="car" size={24} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Placa</Text>
            <Text style={styles.infoValue}>{vehicle.plate}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="options" size={24} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Veículo</Text>
            <Text style={styles.infoValue}>{vehicle.brand} - {vehicle.carColor}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="time" size={24} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Horário de Entrada</Text>
            <Text style={styles.infoValue}>
              {new Date(vehicle.entryTime).toLocaleString()}
            </Text>
          </View>
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
    backgroundColor: '#fff',
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
  vehicleImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timeCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
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
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 36,
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