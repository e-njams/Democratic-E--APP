import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Candidate {
  id: string;
  student_id: string;
  position_id: string;
  manifesto: string;
  student_name: string;
}

interface Position {
  id: string;
  name: string;
  description: string;
  candidates: Candidate[];
}

export default function VoteScreen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentElection, setCurrentElection] = useState<any>(null);

  useEffect(() => {
    loadVotingData();
  }, []);

  const loadVotingData = async () => {
    try {
      const { data: election } = await supabase
        .from('elections')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();

      if (!election) {
        setLoading(false);
        return;
      }

      setCurrentElection(election);

      const { data: positionsData } = await supabase
        .from('positions')
        .select('*')
        .order('name');

      if (!positionsData) {
        setLoading(false);
        return;
      }

      const positionsWithCandidates: Position[] = [];

      for (const position of positionsData) {
        if (user?.has_voted_positions?.includes(position.id)) {
          continue;
        }

        const { data: candidatesData } = await supabase
          .from('candidates')
          .select('*')
          .eq('position_id', position.id)
          .eq('election_id', election.id)
          .eq('status', 'approved');

        if (candidatesData && candidatesData.length > 0) {
          const enrichedCandidates: Candidate[] = [];
          for (const candidate of candidatesData) {
            const { data: student } = await supabase
              .from('students')
              .select('name')
              .eq('id', candidate.student_id)
              .maybeSingle();

            if (student) {
              enrichedCandidates.push({
                ...candidate,
                student_name: student.name,
              });
            }
          }

          positionsWithCandidates.push({
            ...position,
            candidates: enrichedCandidates,
          });
        }
      }

      setPositions(positionsWithCandidates);
    } catch (error) {
      console.error('Error loading voting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setSelectedVotes({
      ...selectedVotes,
      [positionId]: candidateId,
    });
  };

  const handleSubmitVotes = async () => {
    if (Object.keys(selectedVotes).length === 0) {
      setError('Please select at least one candidate to vote for');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const votesToInsert = Object.entries(selectedVotes).map(
        ([positionId, candidateId]) => ({
          student_id: user!.id,
          candidate_id: candidateId,
          position_id: positionId,
          election_id: currentElection.id,
        })
      );

      const { error: voteError } = await supabase.from('votes').insert(votesToInsert);

      if (voteError) {
        setError('Failed to submit votes. Please try again.');
        setSubmitting(false);
        return;
      }

      for (const [positionId, candidateId] of Object.entries(selectedVotes)) {
        const { data: candidate } = await supabase
          .from('candidates')
          .select('votes')
          .eq('id', candidateId)
          .maybeSingle();

        if (candidate) {
          await supabase
            .from('candidates')
            .update({ votes: candidate.votes + 1 })
            .eq('id', candidateId);
        }
      }

      const updatedVotedPositions = [
        ...(user?.has_voted_positions || []),
        ...Object.keys(selectedVotes),
      ];

      await supabase
        .from('students')
        .update({ has_voted_positions: updatedVotedPositions })
        .eq('id', user!.id);

      await refreshUser();

      Alert.alert('Success', 'Your votes have been submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedVotes({});
            loadVotingData();
          },
        },
      ]);
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#800020" />
      </View>
    );
  }

  if (!currentElection) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Vote</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active election at the moment</Text>
        </View>
      </View>
    );
  }

  if (positions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Vote</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            You have already voted for all available positions
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cast Your Vote</Text>
        <Text style={styles.subtitle}>Select one candidate per position</Text>
      </View>

      <ScrollView style={styles.content}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {positions.map((position) => (
          <View key={position.id} style={styles.positionSection}>
            <Text style={styles.positionName}>{position.name}</Text>
            {position.description ? (
              <Text style={styles.positionDescription}>{position.description}</Text>
            ) : null}

            {position.candidates.map((candidate) => (
              <TouchableOpacity
                key={candidate.id}
                style={[
                  styles.candidateCard,
                  selectedVotes[position.id] === candidate.id &&
                    styles.candidateCardSelected,
                ]}
                onPress={() => handleSelectCandidate(position.id, candidate.id)}
              >
                <View style={styles.radioButton}>
                  {selectedVotes[position.id] === candidate.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <View style={styles.candidateInfo}>
                  <Text style={styles.candidateName}>{candidate.student_name}</Text>
                  <Text style={styles.manifesto}>{candidate.manifesto}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitVotes}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Votes</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  positionSection: {
    marginBottom: 32,
  },
  positionName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 8,
  },
  positionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  candidateCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  candidateCardSelected: {
    borderColor: '#800020',
    backgroundColor: '#fff5f5',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#800020',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#800020',
  },
  candidateInfo: {
    flex: 1,
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
  },
  submitButton: {
    backgroundColor: '#800020',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 40,
  },
});
