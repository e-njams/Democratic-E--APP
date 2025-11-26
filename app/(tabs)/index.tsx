import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface ElectionInfo {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState<ElectionInfo | null>(null);

  useEffect(() => {
    loadElectionInfo();
  }, []);

  const loadElectionInfo = async () => {
    try {
      const { data } = await supabase
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setElection(data);
      }
    } catch (error) {
      console.error('Error loading election:', error);
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kabarak University Elections</Text>
        <Text style={styles.welcomeText}>Welcome, {user?.name}!</Text>
      </View>

      <View style={styles.content}>
        {election ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Election</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{election.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.dateText}>
              Start: {new Date(election.start_date).toLocaleDateString()}
            </Text>
            <Text style={styles.dateText}>
              End: {new Date(election.end_date).toLocaleDateString()}
            </Text>

            {election.status === 'active' && (
              <TouchableOpacity
                style={styles.voteButton}
                onPress={() => router.push('/(tabs)/vote')}
              >
                <Text style={styles.voteButtonText}>Cast Your Vote</Text>
              </TouchableOpacity>
            )}

            {election.status === 'closed' && (
              <TouchableOpacity
                style={styles.resultsButton}
                onPress={() => router.push('/(tabs)/results')}
              >
                <Text style={styles.resultsButtonText}>View Results</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.noElectionText}>No active election at the moment</Text>
          </View>
        )}

        <View style={styles.quickLinks}>
          <Text style={styles.quickLinksTitle}>Quick Links</Text>
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/(tabs)/candidates')}
          >
            <Text style={styles.linkText}>View Candidates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/(tabs)/results')}
          >
            <Text style={styles.linkText}>Election Results</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.linkText}>My Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    padding: 40,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#800020',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  voteButton: {
    backgroundColor: '#800020',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  resultsButtonText: {
    color: '#800020',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noElectionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  quickLinks: {
    marginTop: 20,
  },
  quickLinksTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 12,
  },
  linkCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkText: {
    fontSize: 16,
    color: '#800020',
    fontWeight: '600',
  },
});
