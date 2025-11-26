# Kabarak University Election App - Setup Guide

## Overview
This is a student election management app built with Expo and Supabase. It allows students to register, apply as candidates, vote, and view election results. Admins can manage positions, elections, and candidate applications.

## Database Access
The app uses Supabase which is pre-configured in the `.env` file.

## Features

### Student Features
- Register with administration number, name, email, password, faculty, and course
- Login with administration number and password
- View approved candidates for each position
- Apply as a candidate for positions
- Vote once per position during active elections
- View election results
- Change password
- Access personal profile

### Admin Features
- Create and manage election positions
- Set up election periods (start and end dates)
- Approve or reject candidate applications
- View all candidates and their statuses
- Manage election status (upcoming → active → closed)

## Admin Credentials (For Testing)
To test admin features, use these credentials:
- **Admin Number**: ADMIN001
- **Password**: admin123

## How to Use

### 1. Starting the App
```bash
npm run dev
```
This will start the Expo development server.

### 2. First Time Setup
When you first run the app, you'll see the splash screen with login and registration options.

#### Register as a Student
1. Click "Register" on the splash screen
2. Fill in all required fields:
   - Full Name
   - Administration Number (unique)
   - Email
   - Password
   - Faculty
   - Course
3. Click "Register"

#### Login
1. Enter your administration number
2. Enter your password
3. Click "Login"

### 3. Student Workflow

#### View Home Screen
After login, students see:
- Current election status
- Quick links to candidates, voting, and results

#### Apply as Candidate
1. Go to "Candidates" tab
2. Click "Apply as Candidate"
3. Select a position
4. Enter your manifesto
5. Submit

#### Vote During Active Election
1. Go to "Vote" tab (only visible during active elections)
2. Select one candidate per position
3. Click "Submit Votes"
4. You can only vote once per position

#### View Results
1. Go to "Results" tab
2. See all candidates and their vote counts
3. Winners are marked with 🏆

### 4. Admin Workflow

#### Login as Admin
1. Use ADMIN001 and password admin123

#### Create Positions
1. Click "Admin" tab
2. Click "Positions" section
3. Click "Add Position"
4. Enter position name and description
5. Click "Add"

#### Create Elections
1. Click "Elections" section
2. Click "Create Election"
3. Enter start date in format: YYYY-MM-DD
4. Enter end date in format: YYYY-MM-DD
5. Click "Create"

#### Manage Election Status
1. In Elections section, click "Activate" to start voting
2. Click "Close" to end voting and display results

#### Approve Candidates
1. Click "Candidates" section
2. View pending applications
3. Click "Approve" or "Reject" for each candidate
4. Approved candidates appear in student voting screens

## Key Rules

1. **One Vote Per Position**: Each student can only vote once per position
2. **Admin Approval Required**: Candidates must be approved by admin before appearing in voting lists
3. **Active Election Only**: Voting is only available during active elections
4. **Results Display**: Results show after election is closed
5. **Password Management**: Students can change passwords in their profile

## Database Schema

### students
- Stores user accounts and roles
- Tracks which positions each student has voted for

### positions
- Election positions like President, Vice-President, Secretary

### elections
- Sets election periods and manages status (upcoming → active → closed)

### candidates
- Stores candidate applications with manifesto and approval status

### votes
- Records individual votes with timestamps

## Troubleshooting

### Login Issues
- Ensure administration number is entered correctly (case-sensitive)
- Check password for typos

### Can't Vote
- Election must be in "active" status
- You can only vote once per position
- Candidate must be "approved" by admin

### Can't Apply as Candidate
- There must be an election in the system
- You can only apply once per position per election

## Technical Details

- Built with Expo and React Native
- Uses Supabase for database and authentication
- Styled with React Native StyleSheet
- Icons from lucide-react-native
- No external backend required

## Notes

- The app is mobile-optimized but works on web
- The current implementation uses localStorage for session persistence
- Password reset is simulated (in production would send emails)
