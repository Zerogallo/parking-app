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
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Vehicle, ParkingSpot } from '../types';
import ParkingService from '../services/ParkingService';
import CheckoutScreen from './CheckoutScreen';

const HomeScreen = () => {
  const [activeParkings, setActiveParkings] = useState<Vehicle[]>([]);
  const [recentHistory, setRecentHistory] = useState<Vehicle[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingSpot, setCheckingSpot] = useState(false);
  const [spotAvailable, setSpotAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  
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
    loadSpots();
    
    // Atualizar a cada 5 segundos para manter sincronizado
    const interval = setInterval(() => {
      loadData();
      loadSpots();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      console.log('🔄 Carregando dados...');
      const active = await ParkingService.getActiveParkings();
      const history = await ParkingService.getHistory();
      
      setActiveParkings(active);
      setRecentHistory(history.slice(0, 5));
      
      console.log(`✅ Carregados: ${active.length} veículos ativos`);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const loadSpots = async () => {
    try {
      const spotsData = await ParkingService.getSpots();
      setSpots(spotsData);
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadSpots();
    setRefreshing(false);
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
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const checkSpotAvailability = async (spotNumber: string) => {
    if (!spotNumber || spotNumber === '') {
      setSpotAvailable(null);
      return;
    }

    setCheckingSpot(true);
    try {
      const spotsData = await ParkingService.getSpots();
      setSpots(spotsData);
      
      const spot = spotsData.find(s => s.number === parseInt(spotNumber));
      
      if (!spot) {
        setSpotAvailable(false);
      } else {
        setSpotAvailable(!spot.isOccupied);
      }
    } catch (error) {
      setSpotAvailable(false);
    } finally {
      setCheckingSpot(false);
    }
  };

  const handleSpotNumberChange = (text: string) => {
    setFormData({ ...formData, spotNumber: text });
    
    if (!text || text === '') {
      setSpotAvailable(null);
      return;
    }
    
    // Verificar após 500ms
    const timeoutId = setTimeout(() => {
      checkSpotAvailability(text);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleEntry = async () => {
    if (!formData.spotNumber || !formData.customerName || !formData.plate || !formData.carColor || !formData.brand) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    // Verificar se a vaga ainda está disponível
    const spot = spots.find(s => s.number === parseInt(formData.spotNumber));
    if (!spot) {
      Alert.alert('Erro', 'Vaga não encontrada');
      return;
    }
    
    if (spot.isOccupied) {
      Alert.alert('Erro', 'Esta vaga já está ocupada');
      return;
    }

    setLoading(true);
    const result = await ParkingService.registerEntry(formData);
    setLoading(false);
    
    if (result.success) {
      Alert.alert('Sucesso', 'Entrada registrada com sucesso!');
      setModalVisible(false);
      setFormData({ spotNumber: '', customerName: '', plate: '', carColor: '', brand: '', photo: '' });
      setSpotAvailable(null);
      await loadData();
      await loadSpots();
    } else {
      Alert.alert('Erro', result.error);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar foto');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, photo: result.assets[0].uri });
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
              <Text style={styles.emptySubtext}>
                Toque no botão + para registrar entrada
              </Text>
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
        onRequestClose={() => {
          setModalVisible(false);
          setSpotAvailable(null);
          setFormData({ spotNumber: '', customerName: '', plate: '', carColor: '', brand: '', photo: '' });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Entrada</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Campo Número da Vaga */}
              <View>
                <TextInput
                  style={[
                    styles.input,
                    spotAvailable === false && styles.inputError,
                    spotAvailable === true && styles.inputSuccess
                  ]}
                  placeholder="Número da Vaga * (1-30)"
                  keyboardType="numeric"
                  value={formData.spotNumber}
                  onChangeText={handleSpotNumberChange}
                />
                {checkingSpot && (
                  <View style={styles.checkingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.checkingText}>Verificando vaga...</Text>
                  </View>
                )}
                {spotAvailable === true && !checkingSpot && (
                  <Text style={styles.availableText}>✅ Vaga disponível!</Text>
                )}
                {spotAvailable === false && !checkingSpot && (
                  <Text style={styles.unavailableText}>❌ Vaga ocupada ou inválida</Text>
                )}
              </View>
              
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
              
              {/* Botões de Foto */}
              <View style={styles.photoButtonsContainer}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Tirar Foto</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Ionicons name="images" size={24} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Galeria</Text>
                </TouchableOpacity>
              </View>
              
              {formData.photo ? (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: formData.photo }} style={styles.previewImage} />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => setFormData({ ...formData, photo: '' })}
                  >
                    <Ionicons name="close-circle" size={24} color="#f44336" />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setSpotAvailable(null);
                    setFormData({ spotNumber: '', customerName: '', plate: '', carColor: '', brand: '', photo: '' });
                  }}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.button, 
                    styles.confirmButton,
                    (!formData.spotNumber || !formData.customerName || !formData.plate || !formData.carColor || !formData.brand || spotAvailable === false) && styles.disabledButton
                  ]}
                  onPress={handleEntry}
                  disabled={!formData.spotNumber || !formData.customerName || !formData.plate || !formData.carColor || !formData.brand || spotAvailable === false || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Registrar</Text>
                  )}
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
            loadSpots();
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
    fontSize: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#ccc',
    marginTop: 8,
    fontSize: 12,
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
  inputError: {
    borderColor: '#f44336',
    backgroundColor: '#FFEBEE',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  checkingText: {
    fontSize: 12,
    color: '#666',
  },
  availableText: {
    color: '#4CAF50',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '500',
  },
  unavailableText: {
    color: '#f44336',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '500',
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
    gap: 8,
  },
  photoButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  photoPreviewContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
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
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;