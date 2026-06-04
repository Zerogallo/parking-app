import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Alert,
  ScrollView
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Vehicle } from '../types';
import ParkingService from '../services/ParkingService';

const HistoryScreen = () => {
  const [history, setHistory] = useState<Vehicle[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Vehicle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await ParkingService.getHistory();
      setHistory(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o histórico');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const viewReceipt = async (id: number) => {
    try {
      const receipt = await ParkingService.getReceipt(id);
      setSelectedReceipt(receipt);
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o comprovante');
    }
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
          .value {
            color: #333;
          }
          .total {
            background-color: #e8f5e9;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin-top: 20px;
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
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🅿️</div>
            <div class="title">PARKING APP</div>
          </div>
          <div class="content">
            <div class="row"><span class="label">Vaga:</span><span class="value">${receipt.spotNumber}</span></div>
            <div class="row"><span class="label">Placa:</span><span class="value">${receipt.plate}</span></div>
            <div class="row"><span class="label">Cliente:</span><span class="value">${receipt.customerName}</span></div>
            <div class="row"><span class="label">Veículo:</span><span class="value">${receipt.brand} - ${receipt.carColor}</span></div>
            <div class="row"><span class="label">Entrada:</span><span class="value">${new Date(receipt.entryTime).toLocaleString()}</span></div>
            <div class="row"><span class="label">Saída:</span><span class="value">${new Date(receipt.exitTime).toLocaleString()}</span></div>
            <div class="row"><span class="label">Tempo:</span><span class="value">${receipt.hoursParked} horas</span></div>
            <div class="total"><span class="value">R$ ${receipt.amount.toFixed(2)}</span></div>
          </div>
          <div class="footer">Obrigado pela preferência!</div>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  const renderHistoryItem = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={() => viewReceipt(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.plate}>{item.plate}</Text>
          <Text style={styles.customerName}><Ionicons name="person-circle-outline" size={20} color="#000" /> {item.customerName}</Text>
        </View>
        <Text style={styles.amount}><Ionicons name="cash-outline" size={20} color="#000" /> R$ {item.amount?.toFixed(2)}</Text>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.vehicleInfo}><Ionicons name="pricetag-outline" size={20} color="#000" /> {item.brand} - {item.carColor}</Text>
        <View style={styles.cadTimeInfo}>
        <Text style={styles.timeInfo}>
          <Ionicons name="calendar-outline" size={20} color="#000" /> Entrada: {new Date(item.entryTime).toLocaleDateString()}
        </Text>
        <Text style={styles.timeInfo}>
          <Ionicons name="stopwatch-outline" size={20} color="#000" /> Entrada: {new Date(item.entryTime).toLocaleTimeString()}
        </Text>
        </View>
        {item.exitTime && (
          <>
          <View style={styles.cadTimeInfo}>

            <Text style={styles.timeInfo}>
              <Ionicons name="calendar-outline" size={20} color="#000" /> Saída: {new Date(item.exitTime).toLocaleDateString()}
            </Text>
            <Text style={styles.timeInfo}>
              <Ionicons name="stopwatch-outline" size={20} color="#000" /> Saída: {new Date(item.exitTime).toLocaleTimeString()}
            </Text>
          </View>
          </>
        )}
        {item.hoursParked && (
          <Text style={styles.duration}><Ionicons name="stopwatch-outline" size={20} color="#000" /> Tempo: {item.hoursParked} horas</Text>
        )}
      </View>
      
      <View style={styles.receiptButton}>
        <Ionicons name="document-text-outline" size={20} color="#007AFF" />
        <Text style={styles.receiptButtonText}>Ver Comprovante</Text>
        <Ionicons name="chevron-forward" size={20} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum histórico encontrado</Text>
          <Text style={styles.emptySubtext}>
            Registre entradas e saídas para ver o histórico
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧾 Comprovante</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedReceipt && (
                <>
                <View style={styles.receiptCard}>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Vaga</Text>
                      <Text style={styles.receiptValue}>{selectedReceipt.spotNumber}</Text>
                    </View>
                    
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Placa</Text>
                      <Text style={styles.receiptValue}>{selectedReceipt.plate}</Text>
                    </View>
                    
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Cliente</Text>
                      <Text style={styles.receiptValue}>{selectedReceipt.customerName}</Text>
                    </View>
                    
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Veículo</Text>
                      <Text style={styles.receiptValue}>
                        {selectedReceipt.brand} - {selectedReceipt.carColor}
                      </Text>
                    </View>
                    
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Entrada</Text>
                      <Text style={styles.receiptValue}>
                        {new Date(selectedReceipt.entryTime).toLocaleString()}
                      </Text>
                    </View>
                    
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Saída</Text>
                      <Text style={styles.receiptValue}>
                        {selectedReceipt.exitTime && new Date(selectedReceipt.exitTime).toLocaleString()}
                      </Text>
                    </View>
                    
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Tempo</Text>
                      <Text style={styles.receiptValue}>{selectedReceipt.hoursParked} horas</Text>
                    </View>
                    
                    <View style={[styles.receiptRow, styles.totalRow]}>
                      <Text style={styles.receiptLabel}>Valor Total</Text>
                      <Text style={styles.totalValue}>
                        R$ {selectedReceipt.amount?.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.printButton]}
                onPress={() => selectedReceipt && printReceipt(selectedReceipt)}
              >
                <Ionicons name="print-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Imprimir</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.closeModalButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  plate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  cardContent: {
    marginBottom: 12,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  cadTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    borderRadius: 8,
    marginBottom: 6,
    padding: 8,
    backgroundColor: '#f0f0f0',
  },
  timeInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    fontWeight: '500',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  receiptButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  receiptLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  receiptValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#ddd',
    borderBottomWidth: 0,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  printButton: {
    backgroundColor: '#4CAF50',
  },
  closeModalButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HistoryScreen;