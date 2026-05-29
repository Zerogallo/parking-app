import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ParkingSpot } from '../types';
import ParkingService from '../services/ParkingService';

const ParkingMapScreen = () => {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSpots();
    const interval = setInterval(loadSpots, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSpots = async () => {
    const data = await ParkingService.getSpots();
    setSpots(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSpots();
    setRefreshing(false);
  };

  const renderSpot = (spot: ParkingSpot) => {
    const isOccupied = spot.isOccupied;
    
    return (
      <TouchableOpacity
        key={spot.id}
        style={[styles.spot, isOccupied ? styles.occupiedSpot : styles.freeSpot]}
        onPress={() => {
          if (isOccupied) {
            setSelectedSpot(spot);
            setModalVisible(true);
          }
        }}
        disabled={!isOccupied}
      >
        {isOccupied ? (
          <>
            <Ionicons name="car" size={32} color="#fff" />
            <Text style={styles.spotNumber}>{spot.number}</Text>
          </>
        ) : (
          <>
            <Ionicons name="square-outline" size={32} color="#4CAF50" />
            <Text style={[styles.spotNumber, styles.freeSpotNumber]}>
              {spot.number}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const occupiedCount = spots.filter(s => s.isOccupied).length;
  const freeCount = spots.length - occupiedCount;

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="grid-outline" size={24} color="#007AFF" />
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{spots.length}</Text>
        </View>
        
        <View style={[styles.statCard, styles.occupiedCard]}>
          <Ionicons name="car" size={24} color="#f44336" />
          <Text style={styles.statLabel}>Ocupadas</Text>
          <Text style={[styles.statValue, styles.occupiedValue]}>{occupiedCount}</Text>
        </View>
        
        <View style={[styles.statCard, styles.freeCard]}>
          <Ionicons name="square-outline" size={24} color="#4CAF50" />
          <Text style={styles.statLabel}>Disponíveis</Text>
          <Text style={[styles.statValue, styles.freeValue]}>{freeCount}</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.grid}>
          {spots.map(spot => renderSpot(spot))}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informações do Veículo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedSpot?.currentVehicle && (
              <ScrollView>
                {selectedSpot.currentVehicle.photo && (
                  <Image 
                    source={{ uri: selectedSpot.currentVehicle.photo }} 
                    style={styles.vehicleImage}
                  />
                )}
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vaga:</Text>
                  <Text style={styles.infoText}>{selectedSpot.number}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cliente:</Text>
                  <Text style={styles.infoText}>{selectedSpot.currentVehicle.customerName}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Placa:</Text>
                  <Text style={styles.infoText}>{selectedSpot.currentVehicle.plate}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Veículo:</Text>
                  <Text style={styles.infoText}>
                    {selectedSpot.currentVehicle.brand} - {selectedSpot.currentVehicle.carColor}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Entrada:</Text>
                  <Text style={styles.infoText}>
                    {new Date(selectedSpot.currentVehicle.entryTime).toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Fechar</Text>
            </TouchableOpacity>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    minWidth: 100,
  },
  occupiedCard: {
    backgroundColor: '#FFEBEE',
  },
  freeCard: {
    backgroundColor: '#E8F5E9',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  occupiedValue: {
    color: '#f44336',
  },
  freeValue: {
    color: '#4CAF50',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
  },
  spot: {
    width: '23%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  freeSpot: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  occupiedSpot: {
    backgroundColor: '#f44336',
  },
  spotNumber: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  freeSpotNumber: {
    color: '#4CAF50',
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
  vehicleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  closeModalButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ParkingMapScreen;