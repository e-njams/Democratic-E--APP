import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type FormMode = 'login' | 'register' | 'forgot' | 'change';

interface ElectionResult {
  position_name: string;
  candidates: {
    name: string;
    votes: number;
  }[];
}

const FACULTIES = {
  "SCHOOL OF BUSINESS AND ECONOMICS": [
    "Doctor of Philosophy in Business Administration",
    "Doctor of Philosophy in Finance",
    "Master of Science in Finance",
    "Master of Business Administration (MBA)",
    "Master of Science in Project Management",
    "Master of Science in Human Resource Management",
    "Master of Organizational Development",
    "Bachelor of Science in Hospitality Management",
    "Bachelor of Business Management and Information Technology (BMIT)",
    "Bachelor of Business Information Technology (BBIT)",
    "Bachelor of Commerce",
    "Bachelor of Management Information Systems",
    "Bachelor of Science in Economics and Mathematics",
    "Bachelor of Science in Economics",
    "Bachelor of Science in Economics and Statistics",
    "Bachelor of Procurement and Logistics Management",
    "Bachelor of Science in Economics and Finance",
    "Bachelor of Science in Agribusiness Management",
    "Diploma in Business Administration",
    "Diploma in Procurement and Logistics Management",
    "Diploma in Business Management",
    "Diploma in Business Information Technology",
    "Diploma in Hospitality Management",
    "Diploma in Tourism Management",
    "Diploma in Human Resource Management",
    "Diploma in Sales and Marketing",
    "Diploma in Banking and Finance",
    "Diploma in Monitoring and Evaluation",
    "Diploma in Project Management"
  ],
  "SCHOOL OF SCIENCE, ENGINEERING AND TECHNOLOGY": [
    "Doctor of Philosophy in IT",
    "Doctor of Philosophy in IT Security and Audit",
    "Master of Science in Information Technology",
    "Master of Science in Physics",
    "Master of Science in IT Security and Audit",
    "Master of Science in Environmental Science",
    "Bachelor of Science in Computer Science",
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Telecommunications",
    "Bachelor of Science in Actuarial Science",
    "Bachelor of Science in Computer Security and Forensics",
    "Bachelor of Science (with specialization in Mathematics, Zoology, Botany, Chemistry, or Physics)",
    "Bachelor of Science in Environmental Science",
    "Diploma in Computer Science",
    "Diploma in Information Technology",
    "Certificate in Information Technology",
    "Certificate in Environmental Impact Assessment"
  ],
  "SCHOOL OF EDUCATION, HUMANITIES AND SOCIAL SCIENCES": [
    "Doctor of Philosophy in Education",
    "Master of Education in Management and Leadership of Education",
    "Master of Education in Guidance and Counseling",
    "Master of Education in Curriculum Studies",
    "Bachelor of Agricultural Education and Extension",
    "Bachelor of Arts in Chaplaincy",
    "Bachelor of Education (Science)",
    "Bachelor of Education (Arts)",
    "Bachelor of Theology",
    "Diploma in Theology",
    "Diploma in Chaplaincy",
    "Diploma in Education (Science)",
    "Diploma in Education (Arts)",
    "Diploma in Education (Early Childhood Development Education)",
    "Certificate in Education (Early Childhood Education)"
  ],
  "SCHOOL OF LAW": [
    "Bachelor of Laws"
  ],
  "SCHOOL OF MEDICINE AND HEALTH SCIENCES": [
    "Master of Medicine in Family Medicine",
    "Master of Science in Human Nutrition and Dietetics",
    "Master of Public Health",
    "Master of Science in Nursing",
    "Master of Science in Clinical Medicine (Child and Adolescent Health)",
    "Bachelor of Science in Nursing (Direct Entry)",
    "Bachelor of Science in Nursing (InService)",
    "Bachelor of Science in Clinical Medicine",
    "Bachelor of Science in Clinical Medicine (In-Service)",
    "Bachelor of Science in Public Health",
    "Bachelor of Science in Human Nutrition and Dietetics",
    "Diploma in Human Nutrition and Dietetics",
    "Diploma in Environmental Health",
    "Diploma in Medical Laboratory Sciences",
    "Diploma in Clinical Medicine and Surgery"
  ],
  "SCHOOL OF MUSIC AND MEDIA": [
    "Doctor of Philosophy in Music",
    "Master of Music",
    "Bachelor of Music Production Technology",
    "Bachelor of Music Theory and Composition",
    "Bachelor of Mass Communication",
    "Diploma in Mass Communication",
    "Diploma in Music",
    "Diploma in Music Production Technology",
    "Diploma in Theatre Arts",
    "Diploma in Electronic Media",
    "Diploma in Film and Theatre",
    "Certificate in Music",
    "Certificate in Music Production Technology",
    "Certificate in Mass Communication",
    "Certificate in Film and Theatre"
  ],
  "SCHOOL OF PHARMACY": [
    "Bachelor of Pharmacy"
  ]
};

export default function SplashScreen() {
  const [mode, setMode] = useState<FormMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [showFacultyPicker, setShowFacultyPicker] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);

  const [adminNumber, setAdminNumber] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [faculty, setFaculty] = useState('');
  const [course, setCourse] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { signIn, signUp, resetPassword, changePassword, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  useEffect(() => {
    loadElectionResults();
  }, []);

  const loadElectionResults = async () => {
    try {
      const { data: elections } = await supabase
        .from('elections')
        .select('id, status')
        .in('status', ['active', 'closed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!elections) {
        setLoadingResults(false);
        return;
      }

      const { data: positions } = await supabase
        .from('positions')
        .select('id, name')
        .order('name');

      if (!positions) {
        setLoadingResults(false);
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
      setLoadingResults(false);
    }
  };

  const handleFacultyChange = (selectedFaculty: string) => {
    setFaculty(selectedFaculty);
    setShowFacultyPicker(false);
    setCourse('');
    
    if (selectedFaculty && FACULTIES[selectedFaculty as keyof typeof FACULTIES]) {
      setAvailableCourses(FACULTIES[selectedFaculty as keyof typeof FACULTIES]);
    } else {
      setAvailableCourses([]);
    }
  };

  const handleCourseChange = (selectedCourse: string) => {
    setCourse(selectedCourse);
    setShowCoursePicker(false);
  };

  const handleLogin = async () => {
    if (!adminNumber || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    const result = await signIn(adminNumber, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  const handleRegister = async () => {
    if (!name || !adminNumber || !email || !password || !faculty || !course) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    const result = await signUp({
      name,
      adminNumber,
      email,
      password,
      faculty,
      course,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    const result = await resetPassword(email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Password reset instructions sent to your email');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    const result = await changePassword(oldPassword, newPassword);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setMode('login'), 2000);
    }
  };

  const resetForm = () => {
    setError('');
    setSuccess('');
    setAdminNumber('');
    setPassword('');
    setName('');
    setEmail('');
    setFaculty('');
    setCourse('');
    setOldPassword('');
    setNewPassword('');
    setAvailableCourses([]);
    setShowFacultyPicker(false);
    setShowCoursePicker(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Democratic UniApp</Text>
        <Text style={styles.subtitle}>Student Elections</Text>
      </View>

      <View style={styles.formContainer}>
        {mode === 'login' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Login</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Administration Number"
              value={adminNumber}
              onChangeText={setAdminNumber}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
            <View style={styles.links}>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setMode('register');
                }}
              >
                <Text style={styles.linkText}>Register</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setMode('forgot');
                }}
              >
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {mode === 'register' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Register</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Administration Number"
              value={adminNumber}
              onChangeText={setAdminNumber}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            {/* Faculty Dropdown */}
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowFacultyPicker(true)}
            >
              <Text style={faculty ? styles.pickerTextSelected : styles.pickerTextPlaceholder}>
                {faculty || 'Select Faculty'}
              </Text>
            </TouchableOpacity>

            {/* Course Dropdown */}
            <TouchableOpacity
              style={[styles.input, !faculty && styles.disabledInput]}
              onPress={() => faculty && setShowCoursePicker(true)}
              disabled={!faculty}
            >
              <Text style={course ? styles.pickerTextSelected : styles.pickerTextPlaceholder}>
                {course || (faculty ? 'Select Course' : 'Select Faculty First')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Register</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                resetForm();
                setMode('login');
              }}
            >
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'forgot' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Forgot Password</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                resetForm();
                setMode('login');
              }}
            >
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'change' && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Change Password</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Change Password</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                resetForm();
                setMode('login');
              }}
            >
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Faculty Picker Modal */}
      <Modal
        visible={showFacultyPicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Faculty</Text>
            <ScrollView style={styles.pickerContainer}>
              {Object.keys(FACULTIES).map((facultyName) => (
                <TouchableOpacity
                  key={facultyName}
                  style={styles.pickerItem}
                  onPress={() => handleFacultyChange(facultyName)}
                >
                  <Text style={styles.pickerItemText}>{facultyName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFacultyPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Course Picker Modal */}
      <Modal
        visible={showCoursePicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Course</Text>
            <ScrollView style={styles.pickerContainer}>
              {availableCourses.map((courseName) => (
                <TouchableOpacity
                  key={courseName}
                  style={styles.pickerItem}
                  onPress={() => handleCourseChange(courseName)}
                >
                  <Text style={styles.pickerItemText}>{courseName}</Text>
                </TouchableOpacity>
              ))}
              {availableCourses.length === 0 && (
                <Text style={styles.noCoursesText}>No courses available for selected faculty</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCoursePicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Election Results</Text>
        {loadingResults ? (
          <ActivityIndicator size="large" color="#800020" />
        ) : results.length === 0 ? (
          <Text style={styles.noResultsText}>No election results available</Text>
        ) : (
          results.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <Text style={styles.positionName}>{result.position_name}</Text>
              {result.candidates.map((candidate, idx) => (
                <View key={idx} style={styles.candidateRow}>
                  <Text style={styles.candidateName}>{candidate.name}</Text>
                  <Text style={styles.candidateVotes}>{candidate.votes} votes</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#800020',
    padding: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
  },
  formContainer: {
    padding: 20,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#800020',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  linkText: {
    color: '#800020',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    color: '#388e3c',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultsContainer: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  resultCard: {
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
  positionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 12,
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  candidateName: {
    fontSize: 16,
    color: '#333',
  },
  candidateVotes: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 15,
    textAlign: 'center',
  },
  pickerContainer: {
    maxHeight: 300,
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  pickerTextSelected: {
    fontSize: 16,
    color: '#333',
  },
  pickerTextPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  disabledInput: {
    backgroundColor: '#e9ecef',
    opacity: 0.7,
  },
  modalCloseButton: {
    backgroundColor: '#800020',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noCoursesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});