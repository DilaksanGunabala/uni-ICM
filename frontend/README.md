# University Marks Management System - Frontend

Next.js 14 frontend application for the University In-Course Marks Management System with role-based dashboards and authentication.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── dashboard/            # Role-based dashboard routes
│   │   │   ├── super-admin/      # Super Admin dashboard
│   │   │   ├── hod/              # HOD dashboard
│   │   │   ├── lecturer/         # Lecturer dashboard
│   │   │   └── student/          # Student dashboard
│   │   ├── login/                # Login page
│   │   ├── layout.tsx            # Root layout with AuthProvider
│   │   ├── page.tsx              # Home page (redirects)
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── auth/                 # Authentication components
│   │   │   └── ProtectedRoute.tsx
│   │   ├── common/               # Reusable UI components
│   │   │   └── LoadingSpinner.tsx
│   │   └── layout/               # Layout components
│   │       ├── DashboardLayout.tsx
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── context/
│   │   └── AuthContext.tsx       # Authentication context & hooks
│   ├── lib/
│   │   ├── api.ts                # API client (Axios)
│   │   └── utils.ts              # Utility functions
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── public/                       # Static assets
├── .env.local                    # Environment variables
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

## Features

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Automatic token management
- Protected routes with redirect
- Persistent login state

### Role-Based Dashboards

#### Super Admin
- User management
- Department management
- Subject management
- Enrollment management
- Audit logs viewing
- System-wide statistics

#### HOD (Head of Department)
- Marks approval workflow
- Department overview
- Faculty statistics
- Report generation

#### Lecturer
- Subject assignments
- Marks entry and editing
- Assessment management
- Student performance tracking

#### Student
- View approved marks
- Academic progress tracking
- Report downloads
- Subject enrollments

### UI Components
- Responsive dashboard layouts
- Sidebar navigation
- Header with user info
- Loading spinners
- Toast notifications
- Protected route wrappers

## Installation

1. **Install dependencies:**
   ```bash
   cd c:\uni_incourse_webapp\frontend
   npm install
   ```

2. **Configure environment variables:**

   The `.env.local` file is already configured:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

   The application will be available at http://localhost:3000

## API Client

The `src/lib/api.ts` file contains a complete API client with methods for:

- **Authentication**: login, getCurrentUser, logout
- **Users**: CRUD operations
- **Departments**: CRUD operations
- **Subjects**: CRUD + lecturer assignments
- **Enrollments**: CRUD + bulk operations
- **Assessments**: CRUD + subject filtering
- **Marks**: CRUD + approval workflow
- **Audit Logs**: Viewing and filtering

### Example Usage

```typescript
import { api } from '@/lib/api';

// Login
const response = await api.login({ email, password });

// Get marks
const marks = await api.getMarks({ student_id: 1 });

// Approve mark
await api.approveMark(markId, 'Looks good!');
```

## Authentication Context

The `useAuth` hook provides:

```typescript
const {
  user,              // Current user object
  loading,           // Loading state
  login,             // Login function
  logout,            // Logout function
  isAuthenticated,   // Boolean auth status
  hasRole,           // Check if user has specific role
  hasAnyRole,        // Check if user has any of given roles
} = useAuth();
```

## Test Accounts

All test accounts use password: `admin123`

- **Super Admin**: admin@university.edu
- **HOD**: hod.cse@university.edu
- **Lecturer**: lecturer1@university.edu
- **Student**: student1@university.edu

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Routing

The application uses Next.js 14 App Router with the following structure:

- `/` - Home (redirects to dashboard or login)
- `/login` - Login page
- `/dashboard` - Dashboard redirect (role-based)
- `/dashboard/super-admin` - Super Admin dashboard
- `/dashboard/hod` - HOD dashboard
- `/dashboard/lecturer` - Lecturer dashboard
- `/dashboard/student` - Student dashboard

## Styling

The application uses Tailwind CSS with:
- Custom color palette (primary, secondary)
- Utility classes for common patterns
- Responsive design
- Component-based styling

Custom CSS classes available:
- `.btn-primary`, `.btn-secondary`, `.btn-danger` - Button styles
- `.input` - Input field style
- `.label` - Form label style
- `.card` - Card container style
- `.badge` - Badge style

## Type Safety

Full TypeScript support with types for:
- API requests/responses
- User roles and permissions
- Mark statuses
- Enrollment statuses
- Assessment types
- All data models

## Next Steps

To complete the CRUD functionality:

1. **Create management pages** for each entity:
   - `/dashboard/super-admin/users` - User list & CRUD
   - `/dashboard/super-admin/departments` - Department list & CRUD
   - `/dashboard/super-admin/subjects` - Subject list & CRUD
   - `/dashboard/super-admin/enrollments` - Enrollment management
   - `/dashboard/super-admin/audit-logs` - Audit log viewer

2. **Create operational pages**:
   - `/dashboard/hod/marks-approval` - Marks approval interface
   - `/dashboard/lecturer/marks` - Marks entry interface
   - `/dashboard/lecturer/subjects` - My subjects list
   - `/dashboard/student/marks` - My marks view
   - `/dashboard/student/reports` - Report downloads

3. **Add data tables** with:
   - Sorting
   - Filtering
   - Pagination
   - Search
   - Actions (edit, delete, approve, etc.)

4. **Add forms** for:
   - Creating/editing users
   - Creating/editing departments
   - Creating/editing subjects
   - Marks entry
   - Assessment creation

5. **Add modals** for:
   - Confirmation dialogs
   - Quick actions
   - Forms in popups

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Proprietary - University In-Course Marks Management System
