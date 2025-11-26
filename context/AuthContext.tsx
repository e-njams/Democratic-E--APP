import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import directly

interface Student {
  id: string;
  admin_number: string;
  name: string;
  email: string;
  password: string;
  faculty: string;
  course: string;
  role: 'student' | 'candidate' | 'admin';
  has_voted_positions: string[];
  created_at: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: Student | null;
  loading: boolean;
  signIn: (adminNumber: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: {
    name: string;
    adminNumber: string;
    email: string;
    password: string;
    faculty: string;
    course: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  // Add this useEffect to handle redirects when user changes
  useEffect(() => {
    if (!loading && !user) {
      // User is logged out, ensure we're on login page
      const currentRoute = router;
      // This will be handled by the splash screen redirect logic
    }
  }, [user, loading]);

  const checkUser = async () => {
    try {
      const storedUserId = await getStoredUserId();
      if (storedUserId) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', storedUserId)
          .maybeSingle();

        if (data && !error) {
          setUser(data);
        } else {
          await clearStoredUserId();
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (adminNumber: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('admin_number', adminNumber)
        .maybeSingle();

      if (error || !data) {
        return { error: 'Invalid administration number or password' };
      }

      if (data.password !== password) {
        return { error: 'Invalid administration number or password' };
      }

      setUser(data);
      await storeUserId(data.id);
      return { error: null };
    } catch (error) {
      return { error: 'An error occurred. Please try again.' };
    }
  };

  const signUp = async (signUpData: {
    name: string;
    adminNumber: string;
    email: string;
    password: string;
    faculty: string;
    course: string;
  }) => {
    try {
      const { data: existingUser } = await supabase
        .from('students')
        .select('id')
        .eq('admin_number', signUpData.adminNumber)
        .maybeSingle();

      if (existingUser) {
        return { error: 'Administration number already registered' };
      }

      const { data: existingEmail } = await supabase
        .from('students')
        .select('id')
        .eq('email', signUpData.email)
        .maybeSingle();

      if (existingEmail) {
        return { error: 'Email already registered' };
      }

      const { data, error } = await supabase
        .from('students')
        .insert({
          name: signUpData.name,
          admin_number: signUpData.adminNumber,
          email: signUpData.email,
          password: signUpData.password,
          faculty: signUpData.faculty,
          course: signUpData.course,
          role: 'student',
        })
        .select()
        .single();

      if (error) {
        return { error: 'Registration failed. Please try again.' };
      }

      setUser(data);
      await storeUserId(data.id);
      return { error: null };
    } catch (error) {
      return { error: 'An error occurred. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Clear user state first
      setUser(null);
      // Clear stored user ID
      await clearStoredUserId();
      
      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (error || !data) {
        return { error: 'Email not found' };
      }

      return { error: null };
    } catch (error) {
      return { error: 'An error occurred. Please try again.' };
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      if (user.password !== oldPassword) {
        return { error: 'Current password is incorrect' };
      }

      const { error } = await supabase
        .from('students')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (error) {
        return { error: 'Failed to change password' };
      }

      const updatedUser = { ...user, password: newPassword };
      setUser(updatedUser);
      return { error: null };
    } catch (error) {
      return { error: 'An error occurred. Please try again.' };
    }
  };

  const refreshUser = async () => {
    if (user) {
      const { data: userData } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userData) {
        setUser(userData);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Use AsyncStorage directly instead of dynamic imports
async function storeUserId(userId: string) {
  try {
    await AsyncStorage.setItem('userId', userId);
  } catch (error) {
    console.error('Error storing user ID:', error);
  }
}

async function getStoredUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('userId');
  } catch (error) {
    console.error('Error getting stored user ID:', error);
    return null;
  }
}

async function clearStoredUserId() {
  try {
    await AsyncStorage.removeItem('userId');
  } catch (error) {
    console.error('Error clearing stored user ID:', error);
  }
}