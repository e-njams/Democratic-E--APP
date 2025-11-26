import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Candidate {
  id: string;
  student_id: string;
  position_id: string;
  election_id: string;
  manifesto: string;
  votes: number;
  status: string;
  student_name: string;
  position_name: string;
}

interface Position {
  id: string;
  name: string;
  election_id: string;
}

export default function CandidatesScreen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentElection, setCurrentElection] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
  try {
    // Get the most recent election
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (electionError) throw electionError;

    if (election) {
      setCurrentElection(election.id);

      // Fetch positions for this election
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('election_id', election.id)
        .order('name');

      if (positionsError) throw positionsError;
      if (positionsData) setPositions(positionsData);

      // Fetch candidates for this election
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .eq('election_id', election.id)
        .order('created_at', { ascending: false });

      if (candidatesError) throw candidatesError;

      if (candidatesData) {
        const enrichedCandidates: Candidate[] = [];
        for (const candidate of candidatesData) {
          const [{ data: student }, { data: position }] = await Promise.all([
            supabase.from('students').select('name').eq('id', candidate.student_id).maybeSingle(),
            supabase.from('positions').select('name').eq('id', candidate.position_id).maybeSingle()
          ]);

          if (student && position) {
            enrichedCandidates.push({
              ...candidate,
              student_name: student.name,
              position_name: position.name,
            });
          }
        }
        setCandidates(enrichedCandidates);
      }
    } else {
      // No election found
      setPositions([]);
      setCandidates([]);
    }
  } catch (error) {
    console.error('Error loading data:', error);
    setError('Failed to load data');
  } finally {
    setLoading(false);
  }
};

  const handleApply = async () => {
    if (!selectedPosition || !manifesto.trim()) {
      setError('Please select a position and enter your manifesto');
      return;
    }

    if (!currentElection) {
      setError('No active election to apply for');
      return;
    }

    if (!user) {
      setError('You must be logged in to apply');
      return;
    }

    setApplying(true);
    setError('');
    setSuccess('');

    try {
      // Check if user has already applied for this position
      const { data: existingApplication, error: checkError } = await supabase
        .from('candidates')
        .select('id')
        .eq('student_id', user.id)
        .eq('position_id', selectedPosition)
        .eq('election_id', currentElection)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing application:', checkError);
      }

      if (existingApplication) {
        setError('You have already applied for this position in the current election.');
        setApplying(false);
        return;
      }

      // Submit application
      const { data, error: applyError } = await supabase
        .from('candidates')
        .insert({
          student_id: user.id,
          position_id: selectedPosition,
          election_id: currentElection,
          manifesto: manifesto.trim(),
          status: 'pending',
          votes: 0,
        })
        .select();

      if (applyError) {
        console.error('Application error:', applyError);
        
        if (applyError.code === '42501') {
          setError('Permission denied. Please contact administrator.');
        } else if (applyError.code === '23505') {
          setError('You have already applied for this position.');
        } else {
          setError(`Failed to submit application: ${applyError.message}`);
        }
      } else {
        setSuccess('Application submitted successfully! Awaiting admin approval.');
        setManifesto('');
        setSelectedPosition('');
        
        setTimeout(() => {
          setShowApplyModal(false);
          setSuccess('');
          loadData(); // Refresh the data
        }, 3000);
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const groupedCandidates = candidates.reduce((acc, candidate) => {
    if (!acc[candidate.position_name]) {
      acc[candidate.position_name] = [];
    }
    acc[candidate.position_name].push(candidate);
    return acc;
  }, {} as Record<string, Candidate[]>);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#800020" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Candidates</Text>
        {user?.role === 'student' && currentElection && (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowApplyModal(true)}
          >
            <Text style={styles.applyButtonText}>Apply as Candidate</Text>
          </TouchableOpacity>
        )}
        {!currentElection && user?.role === 'student' && (
          <Text style={styles.noElectionText}>No active election</Text>
        )}
      </View>

      <ScrollView style={styles.content}>
        {candidates.length === 0 ? (
          <Text style={styles.noCandidatesText}>
            {currentElection 
              ? 'No candidates available yet' 
              : 'No active election at the moment'
            }
          </Text>
        ) : (
          Object.entries(groupedCandidates).map(([position, positionCandidates]) => (
            <View key={position} style={styles.positionSection}>
              <Text style={styles.positionTitle}>{position}</Text>
              {positionCandidates.map((candidate) => (
                <View key={candidate.id} style={styles.candidateCard}>
                  <Text style={styles.candidateName}>{candidate.student_name}</Text>
                  <Text style={styles.manifesto}>{candidate.manifesto}</Text>
                  <Text style={styles.votes}>{candidate.votes} votes</Text>
                  <View style={[
                    styles.statusBadge,
                    candidate.status === 'approved' && styles.approvedBadge,
                    candidate.status === 'pending' && styles.pendingBadge,
                  ]}>
                    <Text style={styles.statusText}>
                      {candidate.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showApplyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply as Candidate</Text>
            
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            {success ? (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Select Position</Text>
            <ScrollView style={styles.positionsList} nestedScrollEnabled>
              {positions.length === 0 ? (
                <Text style={styles.noPositionsText}>No positions available for current election</Text>
              ) : (
                positions.map((position) => (
                  <TouchableOpacity
                    key={position.id}
                    style={[
                      styles.positionOption,
                      selectedPosition === position.id && styles.positionOptionSelected,
                    ]}
                    onPress={() => setSelectedPosition(position.id)}
                  >
                    <Text
                      style={[
                        styles.positionOptionText,
                        selectedPosition === position.id && styles.positionOptionTextSelected,
                      ]}
                    >
                      {position.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <Text style={styles.label}>Manifesto</Text>
            <TextInput
              style={styles.manifestoInput}
              placeholder="Enter your manifesto and vision for this position..."
              value={manifesto}
              onChangeText={setManifesto}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowApplyModal(false);
                  setError('');
                  setSuccess('');
                  setSelectedPosition('');
                  setManifesto('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedPosition || !manifesto.trim() || applying) && styles.submitButtonDisabled
                ]}
                onPress={handleApply}
                disabled={!selectedPosition || !manifesto.trim() || applying}
              >
                {applying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 12,
  },
  applyButton: {
    backgroundColor: '#FFD700',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#800020',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noElectionText: {
    color: '#FFD700',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  noCandidatesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  positionSection: {
    marginBottom: 24,
  },
  positionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 12,
  },
  candidateCard: {
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
  candidateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  manifesto: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  votes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  approvedBadge: {
    backgroundColor: '#4caf50',
  },
  pendingBadge: {
    backgroundColor: '#ff9800',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
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
    marginBottom: 8,
    marginTop: 12,
  },
  positionsList: {
    maxHeight: 150,
    marginBottom: 12,
  },
  positionOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  positionOptionSelected: {
    borderColor: '#800020',
    backgroundColor: '#fff5f5',
  },
  positionOptionText: {
    fontSize: 16,
    color: '#666',
  },
  positionOptionTextSelected: {
    color: '#800020',
    fontWeight: 'bold',
  },
  noPositionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 12,
    fontStyle: 'italic',
  },
  manifestoInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  successBanner: {
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});