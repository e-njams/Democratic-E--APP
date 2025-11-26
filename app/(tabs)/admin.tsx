// Replace the entire admin.tsx with this updated version

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Users, Award, CheckCircle, XCircle, Plus } from 'lucide-react-native';

type Section = 'elections' | 'positions' | 'candidates';

interface Election {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Position {
  id: string;
  name: string;
  description: string;
  election_id: string;
  election_name?: string;
}

interface Candidate {
  id: string;
  student_id: string;
  position_id: string;
  election_id: string;
  manifesto: string;
  status: string;
  student_name: string;
  position_name: string;
  election_name?: string;
}

export default function AdminScreen() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('elections');
  const [loading, setLoading] = useState(false);

  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Election modal states
  const [showElectionModal, setShowElectionModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Position modal states
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [positionName, setPositionName] = useState('');
  const [positionDescription, setPositionDescription] = useState('');
  const [selectedElectionForPosition, setSelectedElectionForPosition] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadData = async () => {
    setLoading(true);

    try {
      if (activeSection === 'elections') {
        const { data, error } = await supabase
          .from('elections')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) setElections(data);
      } 
      else if (activeSection === 'positions') {
        const { data, error } = await supabase
          .from('positions')
          .select(`
            *,
            elections (
              start_date,
              end_date
            )
          `)
          .order('name');

        if (error) throw error;
        
        if (data) {
          const enrichedPositions = data.map(position => ({
            ...position,
            election_name: `Election ${new Date(position.elections.start_date).toLocaleDateString()}`
          }));
          setPositions(enrichedPositions);
        }
      } 
      else if (activeSection === 'candidates') {
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const enriched: Candidate[] = [];
          for (const candidate of data) {
            const [{ data: student }, { data: position }, { data: election }] = await Promise.all([
              supabase.from('students').select('name').eq('id', candidate.student_id).maybeSingle(),
              supabase.from('positions').select('name, election_id').eq('id', candidate.position_id).maybeSingle(),
              supabase.from('elections').select('start_date').eq('id', candidate.election_id).maybeSingle()
            ]);

            if (student && position && election) {
              enriched.push({
                ...candidate,
                student_name: student.name,
                position_name: position.name,
                election_name: `Election ${new Date(election.start_date).toLocaleDateString()}`
              });
            }
          }
          setCandidates(enriched);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddElection = async () => {
    if (!startDate || !endDate) {
      setError('Please enter both dates');
      return;
    }

    // Convert date strings to full timestamps
    const startDateTime = new Date(startDate + 'T00:00:00.000Z').toISOString();
    const endDateTime = new Date(endDate + 'T23:59:59.999Z').toISOString();

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('elections').insert({
        start_date: startDateTime,
        end_date: endDateTime,
        status: 'upcoming',
      });

      if (insertError) throw insertError;

      setSuccess('Election created successfully');
      setStartDate('');
      setEndDate('');
      setShowElectionModal(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to create election');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPosition = async () => {
    if (!positionName || !selectedElectionForPosition) {
      setError('Please enter position name and select an election');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('positions')
        .insert({ 
          name: positionName, 
          description: positionDescription,
          election_id: selectedElectionForPosition
        });

      if (insertError) throw insertError;

      setSuccess('Position added successfully');
      setPositionName('');
      setPositionDescription('');
      setSelectedElectionForPosition('');
      setShowPositionModal(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to add position');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePosition = async (id: string) => {
    Alert.alert(
      'Delete Position',
      'Are you sure you want to delete this position?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('positions')
              .delete()
              .eq('id', id);

            if (!error) {
              loadData();
            }
          },
        },
      ]
    );
  };

  const handleUpdateElectionStatus = async (id: string, status: string) => {
    await supabase.from('elections').update({ status }).eq('id', id);
    loadData();
  };

  const handleUpdateCandidateStatus = async (id: string, status: string) => {
    await supabase.from('candidates').update({ status }).eq('id', id);
    loadData();
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access Denied</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      {success ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeSection === 'elections' && styles.activeTab,
          ]}
          onPress={() => setActiveSection('elections')}
        >
          <Calendar
            size={20}
            color={activeSection === 'elections' ? '#800020' : '#666'}
          />
          <Text
            style={[
              styles.tabText,
              activeSection === 'elections' && styles.activeTabText,
            ]}
          >
            Elections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeSection === 'positions' && styles.activeTab,
          ]}
          onPress={() => setActiveSection('positions')}
        >
          <Award
            size={20}
            color={activeSection === 'positions' ? '#800020' : '#666'}
          />
          <Text
            style={[
              styles.tabText,
              activeSection === 'positions' && styles.activeTabText,
            ]}
          >
            Positions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeSection === 'candidates' && styles.activeTab,
          ]}
          onPress={() => setActiveSection('candidates')}
        >
          <Users
            size={20}
            color={activeSection === 'candidates' ? '#800020' : '#666'}
          />
          <Text
            style={[
              styles.tabText,
              activeSection === 'candidates' && styles.activeTabText,
            ]}
          >
            Candidates
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading && <ActivityIndicator size="large" color="#800020" style={styles.loader} />}

        {activeSection === 'elections' && (
          <View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowElectionModal(true)}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Create Election</Text>
            </TouchableOpacity>

            {elections.map((election) => (
              <View key={election.id} style={styles.card}>
                <View style={[
                  styles.statusBadge,
                  election.status === 'active' && styles.activeBadge,
                  election.status === 'closed' && styles.closedBadge
                ]}>
                  <Text style={styles.statusText}>
                    {election.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  Start: {new Date(election.start_date).toLocaleDateString()}
                </Text>
                <Text style={styles.dateText}>
                  End: {new Date(election.end_date).toLocaleDateString()}
                </Text>
                <View style={styles.buttonRow}>
                  {election.status === 'upcoming' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        handleUpdateElectionStatus(election.id, 'active')
                      }
                    >
                      <Text style={styles.actionButtonText}>Activate</Text>
                    </TouchableOpacity>
                  )}
                  {election.status === 'active' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        handleUpdateElectionStatus(election.id, 'closed')
                      }
                    >
                      <Text style={styles.actionButtonText}>Close</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeSection === 'positions' && (
          <View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowPositionModal(true)}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Position</Text>
            </TouchableOpacity>

            {positions.map((position) => (
              <View key={position.id} style={styles.card}>
                <Text style={styles.cardTitle}>{position.name}</Text>
                <Text style={styles.cardDescription}>{position.description}</Text>
                {position.election_name && (
                  <Text style={styles.electionInfo}>Election: {position.election_name}</Text>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePosition(position.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeSection === 'candidates' && (
          <View>
            {candidates.map((candidate) => (
              <View key={candidate.id} style={styles.card}>
                <Text style={styles.cardTitle}>{candidate.student_name}</Text>
                <Text style={styles.cardSubtitle}>
                  Position: {candidate.position_name}
                </Text>
                {candidate.election_name && (
                  <Text style={styles.electionInfo}>Election: {candidate.election_name}</Text>
                )}
                <Text style={styles.cardDescription}>{candidate.manifesto}</Text>
                <View style={[
                  styles.statusBadge,
                  candidate.status === 'approved' && styles.approvedBadge,
                  candidate.status === 'rejected' && styles.rejectedBadge
                ]}>
                  <Text style={styles.statusText}>
                    {candidate.status.toUpperCase()}
                  </Text>
                </View>

                {candidate.status === 'pending' && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() =>
                        handleUpdateCandidateStatus(candidate.id, 'approved')
                      }
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() =>
                        handleUpdateCandidateStatus(candidate.id, 'rejected')
                      }
                    >
                      <XCircle size={16} color="#fff" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Election Modal */}
      <Modal visible={showElectionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Election</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
            />
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowElectionModal(false);
                  setError('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddElection}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Position Modal */}
      <Modal visible={showPositionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Position</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <Text style={styles.label}>Select Election</Text>
            <ScrollView style={styles.electionList} nestedScrollEnabled>
              {elections.map((election) => (
                <TouchableOpacity
                  key={election.id}
                  style={[
                    styles.electionOption,
                    selectedElectionForPosition === election.id && styles.electionOptionSelected,
                  ]}
                  onPress={() => setSelectedElectionForPosition(election.id)}
                >
                  <Text
                    style={[
                      styles.electionOptionText,
                      selectedElectionForPosition === election.id && styles.electionOptionTextSelected,
                    ]}
                  >
                    Election {new Date(election.start_date).toLocaleDateString()} - {new Date(election.end_date).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Position Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Position Name"
              value={positionName}
              onChangeText={setPositionName}
            />
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={positionDescription}
              onChangeText={setPositionDescription}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPositionModal(false);
                  setError('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddPosition}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#800020',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  successBanner: {
    backgroundColor: '#4caf50',
    padding: 12,
    alignItems: 'center',
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#800020',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#800020',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loader: {
    marginVertical: 20,
  },
  addButton: {
    backgroundColor: '#800020',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  electionInfo: {
    fontSize: 12,
    color: '#800020',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#4caf50',
  },
  closedBadge: {
    backgroundColor: '#666',
  },
  approvedBadge: {
    backgroundColor: '#4caf50',
  },
  rejectedBadge: {
    backgroundColor: '#d32f2f',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#800020',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  electionList: {
    maxHeight: 150,
    marginBottom: 12,
  },
  electionOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  electionOptionSelected: {
    borderColor: '#800020',
    backgroundColor: '#fff5f5',
  },
  electionOptionText: {
    fontSize: 14,
    color: '#666',
  },
  electionOptionTextSelected: {
    color: '#800020',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#800020',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#800020',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#800020',
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});