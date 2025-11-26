import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';

interface ElectionResult {
  position_name: string;
  candidates: {
    name: string;
    votes: number;
    percentage: number;
  }[];
}

export default function ResultsScreen() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [electionStatus, setElectionStatus] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const { data: elections } = await supabase
        .from('elections')
        .select('id, status')
        .in('status', ['active', 'closed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!elections) {
        setLoading(false);
        return;
      }

      setElectionStatus(elections.status);

      const { data: positions } = await supabase
        .from('positions')
        .select('id, name')
        .order('name');

      if (!positions) {
        setLoading(false);
        return;
      }

      const resultsData: ElectionResult[] = [];

      for (const position of positions) {
        const { data: candidates } = await supabase
          .from('candidates')
          .select('id, votes, student_id')
          .eq('position_id', position.id)
          .eq('election_id', elections.id)
          .eq('status', 'approved')
          .order('votes', { ascending: false });

        if (candidates && candidates.length > 0) {
          const totalVotes = candidates.reduce((sum: number, c: any) => sum + c.votes, 0);
          const candidatesWithNames = [];

          for (const candidate of candidates) {
            const { data: student } = await supabase
              .from('students')
              .select('name')
              .eq('id', candidate.student_id)
              .maybeSingle();

            if (student) {
              candidatesWithNames.push({
                name: student.name,
                votes: candidate.votes,
                percentage: totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0,
              });
            }
          }

          resultsData.push({
            position_name: position.name,
            candidates: candidatesWithNames,
          });
        }
      }

      setResults(resultsData);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.title}>Election Results</Text>
        {electionStatus && (
          <View
            style={[
              styles.statusBadge,
              electionStatus === 'closed' ? styles.statusClosed : styles.statusActive,
            ]}
          >
            <Text style={styles.statusText}>{electionStatus.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        {results.length === 0 ? (
          <Text style={styles.noResultsText}>No results available yet</Text>
        ) : (
          results.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <Text style={styles.positionName}>{result.position_name}</Text>

              {result.candidates.map((candidate, idx) => (
                <View key={idx} style={styles.candidateResult}>
                  <View style={styles.candidateHeader}>
                    <Text
                      style={[
                        styles.candidateName,
                        idx === 0 && styles.winnerName,
                      ]}
                    >
                      {candidate.name}
                      {idx === 0 && ' 🏆'}
                    </Text>
                    <Text style={styles.candidateVotes}>
                      {candidate.votes} votes
                    </Text>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${candidate.percentage}%` },
                        idx === 0 && styles.winnerBar,
                      ]}
                    />
                  </View>

                  <Text style={styles.percentage}>
                    {candidate.percentage.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
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
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#FFD700',
  },
  statusClosed: {
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#800020',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  positionName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 16,
  },
  candidateResult: {
    marginBottom: 16,
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  candidateName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  winnerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#800020',
  },
  candidateVotes: {
    fontSize: 14,
    color: '#666',
  },
  progressBarContainer: {
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 12,
  },
  winnerBar: {
    backgroundColor: '#800020',
  },
  percentage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
});
