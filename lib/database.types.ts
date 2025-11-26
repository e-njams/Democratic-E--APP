export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
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
        };
        Insert: {
          id?: string;
          admin_number: string;
          name: string;
          email: string;
          password: string;
          faculty: string;
          course: string;
          role?: 'student' | 'candidate' | 'admin';
          has_voted_positions?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_number?: string;
          name?: string;
          email?: string;
          password?: string;
          faculty?: string;
          course?: string;
          role?: 'student' | 'candidate' | 'admin';
          has_voted_positions?: string[];
          created_at?: string;
        };
      };
      positions: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_at?: string;
        };
      };
      elections: {
        Row: {
          id: string;
          start_date: string;
          end_date: string;
          status: 'upcoming' | 'active' | 'closed';
          created_at: string;
        };
        Insert: {
          id?: string;
          start_date: string;
          end_date: string;
          status?: 'upcoming' | 'active' | 'closed';
          created_at?: string;
        };
        Update: {
          id?: string;
          start_date?: string;
          end_date?: string;
          status?: 'upcoming' | 'active' | 'closed';
          created_at?: string;
        };
      };
      candidates: {
        Row: {
          id: string;
          student_id: string;
          position_id: string;
          election_id: string;
          manifesto: string;
          status: 'pending' | 'approved' | 'rejected';
          votes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          position_id: string;
          election_id: string;
          manifesto?: string;
          status?: 'pending' | 'approved' | 'rejected';
          votes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          position_id?: string;
          election_id?: string;
          manifesto?: string;
          status?: 'pending' | 'approved' | 'rejected';
          votes?: number;
          created_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          student_id: string;
          candidate_id: string;
          position_id: string;
          election_id: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          candidate_id: string;
          position_id: string;
          election_id: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          candidate_id?: string;
          position_id?: string;
          election_id?: string;
          timestamp?: string;
        };
      };
    };
  };
}
