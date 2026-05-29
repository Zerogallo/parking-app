import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Image,
  RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Vehicle } from '../types';
import ParkingService from '../services/ParkingService';
import CheckoutScreen from './CheckoutScreen';

const HomeScreen = () => {
  const [activeParkings, setActiveParkings] = useState<Vehicle[]>([]);
  const [recentHistory, setRecentHistory] = useState<Vehicle[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    spotNumber: '',
    customerName: '',
    plate: '',
    carColor: '',
    brand: '',
    photo: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      updateRealtimeValues();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const active = await ParkingService.getActiveParkings();
      const history = await ParkingService.getHistory();
      setActiveParkings(active);
      setRecentHistory(history.slice(0, 5));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateRealtimeValues = () => {
    setActiveParkings([...activeParkings]);
  };

  const calculateCurrentValue = (entryTime: string) => {
    const entry = new Date(entryTime);
    const now = new Date();
    const diffMs = now.getTime() - entry.getTime();
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (hours >= 24) {
      const days = Math.ceil(hours / 24);
      return days * 50;
    }
    return hours * 5;
  };

  const formatTime = (entryTime: string) => {
    const entry = new Date(entryTime);
    const now = new Date();
    const diffMs = now.getTime() - entry.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const handleEntry = async () => {
    if (!formData.spotNumber || !formData.customerName || !formData.plate || !formData.carColor || !formData.brand) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    const result = await ParkingService.registerEntry(formData);
    if (result.success) {
      Alert.alert('Sucesso', 'Entrada registrada com sucesso!');
      setModalVisible(false);
      setFormData({ spotNumber: '', customerName: '', plate: '', carColor: '', brand: '', photo: '' });
      loadData();
    } else {
      Alert.alert('Erro', result.error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, photo: result.assets[0].uri });
    }
  };

  const renderActiveParking = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity
      style={styles.parkingCard}
      onPress={() => {
        setSelectedVehicle(item);
        setCheckoutVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.spotNumber}>Vaga {item.spotNumber}</Text>
        <Text style={styles.plate}>{item.plate}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <Text style={styles.carInfo}>{item.brand} - {item.carColor}</Text>
        <Text style={styles.timeInfo}>Tempo: {formatTime(item.entryTime)}</Text>
        <Text style={styles.valueInfo}>Valor: R$ {calculateCurrentValue(item.entryTime).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHistory = ({ item }: { item: Vehicle }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyInfo}>
        <Text style={styles.historyPlate}>{item.plate}</Text>
        <Text style={styles.historyCustomer}>{item.customerName}</Text>
        <Text style={styles.historyTime}>
          Entrada: {new Date(item.entryTime).toLocaleString()}
        </Text>
        {item.exitTime && (
          <Text style={styles.historyTime}>
            Saída: {new Date(item.exitTime).toLocaleString()}
          </Text>
        )}
      </View>
      <Text style={styles.historyValue}>
        R$ {item.amount?.toFixed(2) || calculateCurrentValue(item.entryTime).toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Estacionados Agora ({activeParkings.length})</Text>
          {activeParkings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>Nenhum veículo estacionado</Text>
            </View>
          ) : (
            activeParkings.map(parking => (
              <View key={parking.id}>
                {renderActiveParking({ item: parking })}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Últimas Movimentações</Text>
          {recentHistory.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum histórico recente</Text>
          ) : (
            recentHistory.map(item => (
              <View key={item.id}>
                {renderHistory({ item })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal de entrada */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Entrada</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Número da Vaga *"
                keyboardType="numeric"
                value={formData.spotNumber}
                onChangeText={(text) => setFormData({ ...formData, spotNumber: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Nome do Cliente *"
                value={formData.customerName}
                onChangeText={(text) => setFormData({ ...formData, customerName: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Placa *"
                value={formData.plate}
                onChangeText={(text) => setFormData({ ...formData, plate: text.toUpperCase() })}
                autoCapitalize="characters"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Cor do Carro *"
                value={formData.carColor}
                onChangeText={(text) => setFormData({ ...formData, carColor: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Marca *"
                value={formData.brand}
                onChangeText={(text) => setFormData({ ...formData, brand: text })}
              />
              
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Ionicons name="camera" size={24} color="#007AFF" />
                <Text style={styles.imageButtonText}>
                  {formData.photo ? 'Alterar Foto' : 'Adicionar Foto'}
                </Text>
              </TouchableOpacity>
              
              {formData.photo ? (
                <Image source={{ uri: formData.photo }} style={styles.previewImage} />
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={handleEntry}
                >
                  <Text style={styles.buttonText}>Registrar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de checkout */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={checkoutVisible}
        onRequestClose={() => setCheckoutVisible(false)}
      >
        <CheckoutScreen
          vehicle={selectedVehicle}
          onClose={() => {
            setCheckoutVisible(false);
            loadData();
          }}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  parkingCard: {
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
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  spotNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
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
  cardContent: {
    gap: 4,
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  carInfo: {
    fontSize: 14,
    color: '#666',
  },
  timeInfo: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  valueInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyPlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyCustomer: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  historyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 12,
  },
  modalOverlay: {
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
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f0f7ff',
  },
  imageButtonText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;