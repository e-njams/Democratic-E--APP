# Kabarak University Election App - Structure & Navigation

## Directory Structure

```
project/
├── app/
│   ├── index.tsx                 (Splash/Login/Register screen)
│   ├── _layout.tsx               (Root layout with AuthProvider)
│   ├── +not-found.tsx            (404 page)
│   └── (tabs)/
│       ├── _layout.tsx           (Tab navigation layout)
│       ├── index.tsx             (Home/Dashboard)
│       ├── candidates.tsx        (View & apply as candidates)
│       ├── vote.tsx              (Cast votes during elections)
│       ├── results.tsx           (View election results)
│       ├── profile.tsx           (User profile & settings)
│       └── admin.tsx             (Admin dashboard)
│
├── context/
│   └── AuthContext.tsx           (Authentication & session management)
│
├── lib/
│   ├── supabase.ts              (Supabase client initialization)
│   └── database.types.ts        (TypeScript type definitions for database)
│
├── hooks/
│   └── useFrameworkReady.ts      (Expo framework initialization)
│
└── assets/                       (Images & static files)
```

## Screen Navigation Flow

### 1. Splash Screen (`app/index.tsx`)
- **Purpose**: Authentication entry point
- **Features**:
  - Login form
  - Registration form
  - Forgot password
  - Change password
  - Election results preview
- **Navigation**: After login → `/(tabs)`

### 2. Home Screen (`app/(tabs)/index.tsx`)
- **Purpose**: Dashboard showing election status
- **Features**:
  - Current election info
  - Status badge (upcoming/active/closed)
  - Quick action buttons
  - Quick links to other screens
- **Tab Icon**: Home

### 3. Candidates Screen (`app/(tabs)/candidates.tsx`)
- **Purpose**: View approved candidates & apply
- **Features**:
  - List all approved candidates grouped by position
  - Apply as candidate button (students only)
  - Modal form for candidate applications
  - Manifesto text input
- **Tab Icon**: Users

### 4. Vote Screen (`app/(tabs)/vote.tsx`)
- **Purpose**: Cast votes during active elections
- **Features**:
  - Only visible during active elections
  - Radio button selection for candidates
  - One vote per position
  - Submit all votes at once
  - Vote submission confirmation
- **Tab Icon**: Vote (ballot box)

### 5. Results Screen (`app/(tabs)/results.tsx`)
- **Purpose**: View election results
- **Features**:
  - All positions and their candidates
  - Vote counts for each candidate
  - Percentage calculations
  - Progress bars
  - Winner indicator (🏆)
  - Shows when election is active or closed
- **Tab Icon**: Trophy

### 6. Profile Screen (`app/(tabs)/profile.tsx`)
- **Purpose**: Manage user account
- **Features**:
  - Display user information
  - Change password modal
  - Sign out button
  - View role and registration details
- **Tab Icon**: User

### 7. Admin Dashboard (`app/(tabs)/admin.tsx`)
- **Purpose**: Manage elections, positions, and candidates
- **Access**: Admin role only
- **Sections**:
  - **Positions**: Add/delete election positions
  - **Elections**: Create elections, manage status
  - **Candidates**: Approve/reject applications
- **Tab Icon**: User (admin only)

## Navigation Architecture

```
Root Layout (_layout.tsx)
├── AuthProvider (wraps all routes)
├── /                              (Splash - login/register)
│   └── Logged out users see this
│
└── /(tabs)/_layout.tsx            (Tab navigator)
    ├── (tabs)/index               (Home)
    ├── (tabs)/candidates          (Candidates)
    ├── (tabs)/vote                (Voting)
    ├── (tabs)/results             (Results)
    ├── (tabs)/profile             (Profile)
    └── (tabs)/admin               (Admin - admin only)
```

## Role-Based Tab Visibility

### Student Role
- Home ✓
- Candidates ✓
- Vote ✓ (if election active)
- Results ✓
- Profile ✓
- Admin ✗ (hidden)

### Admin Role
- Home ✓
- Admin ✓ (with 3 tabs: Positions, Elections, Candidates)
- Candidates ✓
- Vote ✗ (hidden)
- Results ✗ (hidden)
- Profile ✗ (hidden)

## Key Navigation Paths

### Student Registration & Voting Journey
1. `/ (login)` → Register
2. `/ (login)` → Login
3. `/(tabs)` → Home
4. `/(tabs)/candidates` → Apply as candidate (optional)
5. `/(tabs)/vote` → Cast votes (if election active)
6. `/(tabs)/results` → View results
7. `/(tabs)/profile` → Manage account

### Admin Setup Journey
1. `/ (login)` → Login as admin
2. `/(tabs)/admin` → Positions → Add positions
3. `/(tabs)/admin` → Elections → Create election
4. `/(tabs)/admin` → Elections → Activate election
5. `/(tabs)/admin` → Candidates → Approve candidate applications
6. `/(tabs)/admin` → Elections → Close election

## Deep Linking (Navigation Methods)

```typescript
// From any screen, navigate using:
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to tabs
router.push('/(tabs)');
router.push('/(tabs)/candidates');
router.push('/(tabs)/vote');
router.push('/(tabs)/results');
router.push('/(tabs)/profile');
router.push('/(tabs)/admin');

// Navigate to splash
router.replace('/');
```

## Screen State Management

- **Auth State**: AuthContext provides `user` object globally
- **User Role**: Determines tab visibility
- **Election Status**: Affects Vote tab visibility
- **Voted Positions**: Tracked in user's `has_voted_positions` array

## Key Features by Screen

| Screen | Key Features |
|--------|-------------|
| Splash | Login, Register, Password Reset, Results Preview |
| Home | Election Status, Quick Links, Current Info |
| Candidates | View Approved Candidates, Apply as Candidate |
| Vote | Select Candidates, Radio Buttons, Submit Votes |
| Results | Progress Bars, Vote Counts, Winner Badges |
| Profile | User Info, Change Password, Sign Out |
| Admin | Manage Positions, Elections, & Candidates |

## Conditional Rendering Rules

1. **Login Screen**: Show if `user === null`
2. **Tab Navigation**: Show if `user !== null`
3. **Vote Tab**: Show only if `election.status === 'active'` AND user hasn't voted for all positions
4. **Admin Tab**: Show only if `user.role === 'admin'`
5. **Apply Button**: Show only if `user.role === 'student'`
6. **Approve/Reject Buttons**: Show only if `candidate.status === 'pending'`
