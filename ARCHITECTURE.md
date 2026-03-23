# 🏗️ EduConnect - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser (React)                      │
├─────────────────────────────────────────────────────────────┤
│ Frontend (PORT 3000)                                         │
│ - React Router for navigation                               │
│ - AuthContext for state management                          │
│ - Axios with JWT interceptors                               │
│ - Protected routes guarding pages                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP/REST API Calls
                 │ Authorization: Bearer {JWT}
                 │
┌────────────────▼────────────────────────────────────────────┐
│ Backend API Server (PORT 5000)                              │
├─────────────────────────────────────────────────────────────┤
│ Express.js Server                                            │
│ - JWT middleware for authentication                         │
│ - CORS enabled for cross-origin                             │
│ - JSON request/response                                     │
│ - Error handling middleware                                 │
│                                                              │
│ Routes:                                                      │
│   /api/users/login          POST                            │
│   /api/users/register       POST                            │
│   /api/quizzes              GET                             │
│   /api/quizzes/:id          GET                             │
│   /api/quizzes/:id/attempt  POST                            │
│   /api/quizzes/progress/me  GET                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ MongoDB Connection (Mongoose)
                 │
┌────────────────▼────────────────────────────────────────────┐
│ MongoDB Database                                             │
├─────────────────────────────────────────────────────────────┤
│ Collections:                                                 │
│   - users (name, email, hashed_password, role)             │
│   - quizzes (title, questions, time_limit, etc.)           │
│   - quizattempts (student_id, quiz_id, answers, score)    │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Login Process
```
1. User enters credentials on /login
2. Frontend POST /api/users/login { email, password }
3. Backend:
   - Find user by email
   - Compare password with bcrypt.compare()
   - If valid:
     - Generate JWT with user._id
     - Return { user, token, success: true }
4. Frontend:
   - Store token in localStorage
   - Store user in context
   - Redirect to /
```

### Request Authentication
```
1. Frontend makes request to protected endpoint
2. Axios interceptor adds header:
   Authorization: Bearer {token}
3. Backend middleware verify JWT:
   - Extract token from header
   - Verify with jwt.verify()
   - Attach user to req.user
   - Continue to handler
4. Handler accesses req.user.id or req.user.email
```

### Route Protection
```
<ProtectedRoute element={<Component />} />
  ↓
Check isAuthenticated from AuthContext
  ↓
If true: Render Component
If false: Render <Navigate to="/login" />
```

---

## Data Models

### User Schema
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed with bcrypt),
  role: String (enum: ['student', 'teacher', 'admin']),
  createdAt: DateTime (default: now)
}
```

### Quiz Schema
```javascript
{
  _id: ObjectId,
  title: String,
  subject: String,
  description: String,
  difficulty: String (enum: ['Easy', 'Medium', 'Hard']),
  timeLimit: Number (minutes),
  questions: [{
    questionText: String,
    questionType: String (MCQ|TrueFalse|ShortAnswer),
    options: [String],         // For MCQ
    correctAnswer: String,     // Index for MCQ, "True"/"False" for TF
    marks: Number,
    explanation: String
  }],
  totalMarks: Number (auto-calculated),
  isActive: Boolean,
  createdBy: ObjectId (User reference),
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### QuizAttempt Schema
```javascript
{
  _id: ObjectId,
  quiz: ObjectId (Quiz reference),
  student: ObjectId (User reference),
  answers: [{
    questionId: ObjectId,
    questionText: String,
    questionType: String,
    selectedAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,
    marksObtained: Number,
    maxMarks: Number
  }],
  totalScore: Number,
  totalMarks: Number,
  percentage: Number (0-100),
  grade: String (A+|A|B|C|D|F),
  timeTaken: Number (seconds),
  status: String (enum: ['in-progress', 'submitted', 'timed-out']),
  submittedAt: DateTime,
  quizTitle: String,
  quizSubject: String,
  quizDifficulty: String
}
```

---

## API Endpoints Documentation

### Authentication

#### Register User
```
POST /api/users/register

Request:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "admin"  // optional, default: "student"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

Error (400):
{
  "success": false,
  "message": "User already exists with this email"
}
```

#### Login User
```
POST /api/users/login

Request:
{
  "email": "john@example.com",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

Error (401):
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Quizzes

#### Get All Quizzes
```
GET /api/quizzes?subject=CS&difficulty=Easy&search=Data

Response (200):
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "...",
      "title": "Data Structures",
      "subject": "CS",
      "difficulty": "Easy",
      // questions.correctAnswer hidden for students
    }
  ]
}
```

#### Get Single Quiz
```
GET /api/quizzes/:id

Response (200):
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "Data Structures",
    // full data, answers hidden for non-admin
  }
}
```

#### Submit Quiz Attempt
```
POST /api/quizzes/:id/attempt

Request:
{
  "answers": [
    {
      "questionId": "...",
      "selectedAnswer": "1"  // MCQ index or text
    },
    ...
  ],
  "timeTaken": 1200,  // seconds
  "status": "submitted"
}

Response (201):
{
  "success": true,
  "data": {
    "_id": "...",
    "quiz": "...",
    "student": "...",
    "totalScore": 8,
    "totalMarks": 10,
    "percentage": 80,
    "grade": "A",
    "answers": [...]
  }
}
```

#### Get User Progress
```
GET /api/quizzes/progress/me
Headers: Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "data": {
    "summary": {
      "totalAttempts": 5,
      "averageScore": 75,
      "bestScore": 90
    },
    "attempts": [
      {
        "_id": "...",
        "quiz": {...},
        "totalScore": 8,
        "percentage": 80,
        "grade": "A",
        "submittedAt": "2024-01-15T10:30:00Z"
      },
      ...
    ],
    "subjectBreakdown": [
      {
        "subject": "CS",
        "averageScore": 82,
        "attempts": 3
      }
    ]
  }
}
```

---

## Frontend Architecture

### Component Hierarchy
```
App/
├── Router
│   ├── ProtectedRoute (wrapper)
│   │   ├── Home/
│   │   ├── QuizList/
│   │   ├── QuizAttempt/
│   │   │   ├── DashboardLayout
│   │   │   │   ├── Sidebar
│   │   │   │   └── Content
│   │   │   └── Timer
│   │   ├── QuizResults/
│   │   └── ProgressDashboard/
│   │       ├── StatCard
│   │       ├── BarChart
│   │       ├── SubjectBreakdown
│   │       └── HistoryTable
│   ├── Login/
│   └── Register/
└── Navbar/
    ├── Logo
    ├── NavItems
    └── UserMenu
```

### State Management
```
AuthContext
├── user: Object | null
├── loading: boolean
├── isAuthenticated: boolean
├── login(userData, token)
├── logout()
└── [stored in localStorage]

Component Props/State
├── Quiz Data (fetched from API)
├── Answers (managed locally)
├── Timer (countdown state)
└── UI States (loading, error, etc.)
```

### Service Layer
```
api.js
- Axios instance
- JWT interceptor
- Response interceptor

userService.js
- loginUser()
- registerUser()
- getUsers()

quizService.js
- getQuizzes()
- getQuizById()
- submitAttempt()
- getMyProgress()
- getAttemptById()
```

---

## Backend Architecture

### Middleware Stack
```
Express App
├── CORS middleware
├── JSON parser
├── Request logging (optional)
├── Routes
│   ├── /api/users
│   │   ├── protect middleware (optional)
│   │   ├── POST /register
│   │   ├── POST /login
│   │   └── GET/PUT/DELETE (user ops)
│   └── /api/quizzes
│       ├── GET / (public)
│       ├── GET /:id (public)
│       ├── POST / (create quiz)
│       ├── PUT /:id (update quiz)
│       ├── DELETE /:id (delete quiz)
│       ├── POST /:id/attempt (submit)
│       ├── GET /attempts/:id (view result)
│       ├── GET /progress/me (get progress)
│       └── GET /:id/analytics (admin only)
└── Error handler middleware
```

### Authentication Middleware
```
protect(req, res, next)
├── Extract token from header
├── Verify JWT signature
├── Get user from database
├── Attach to req.user
├── Call next()
└── On error → 401 response

authorize(...roles)(req, res, next)
├── Check req.user.role
├── If allowed → next()
└── Else → 403 response
```

### Auto-Grading Logic
```
submitAttempt(req, res)
├── Find quiz
├── For each question:
│   ├── Find student answer
│   ├── Check question type:
│   │   ├── MCQ → Compare option index
│   │   ├── TrueFalse → Case-insensitive comparison
│   │   └── ShortAnswer → Trimmed lowercase comparison
│   ├── If correct → Award marks
│   └── Else → 0 marks
├── Calculate totalScore
├── Calculate percentage
├── Assign grade based on percentage
├── Save attempt to database
└── Return graded attempt
```

---

## Data Flow Examples

### Login Flow
```
User Input → Frontend Form
  ↓
POST /api/users/login { email, password }
  ↓
Backend: Find user by email
  ↓
Backend: Compare password with bcrypt
  ↓
Backend: Generate JWT token
  ↓
Response: { user, token }
  ↓
Frontend: localStorage.setItem('token', token)
  ↓
Frontend: AuthContext.login(user, token)
  ↓
Frontend: Navigate to /
```

### Quiz Submission Flow
```
User Answers Questions → [Question state updated]
  ↓
User Clicks Submit
  ↓
Frontend: Calculate timeTaken
  ↓
Frontend: Collect all answers into array
  ↓
POST /api/quizzes/:id/attempt {answers, timeTaken}
  ↓
Backend: Get quiz from database
  ↓
Backend: Compare each answer with correctAnswer
  ↓
Backend: Calculate score, percentage, grade
  ↓
Backend: Save QuizAttempt document
  ↓
Response: { ...attempt details }
  ↓
Frontend: Navigate to /quizzes/results/:attemptId
```

### Progress Loading Flow
```
ProgressDashboard mounts
  ↓
useEffect calls getMyProgress()
  ↓
GET /api/quizzes/progress/me (with JWT token)
  ↓
Backend: Get user from req.user (JWT verified)
  ↓
Backend: Find all QuizAttempt documents for user
  ↓
Backend: Calculate summary stats
  ↓
Backend: Build subject breakdown
  ↓
Response: { summary, attempts, subjectBreakdown }
  ↓
Frontend: setState(data)
  ↓
Frontend: Render charts, tables, stats
```

---

## Security Measures

### Password Security
```
Registration:
1. Accept password from user
2. Hash with bcryptjs (salt: 10)
3. Never store plain text
4. Database stores only hash

Login:
1. Get password from user
2. Get stored hash from database
3. Use bcrypt.compare(plain, hash)
4. Returns true/false only
```

### JWT Token Security
```
1. Token generated with user._id only
2. Secret key from environment variable
3. Expires in 7 days (configured)
4. Verified on every protected request
5. Token sent via Authorization header
6. Only stored in localStorage
7. No sensitive data in token payload
```

### API Security
```
1. CORS enabled only for frontend
2. JWT required for protected routes
3. Password hashed with bcrypt
4. Input validation on all endpoints
5. Error messages don't leak information
6. MongoDB injection prevented by Mongoose
```

---

## Scalability Considerations

### Current Architecture
- Single server (REST API)
- MongoDB single instance
- Frontend served from React dev server

### Future Enhancements
1. **Load Balancing**: Multiple API servers
2. **Caching**: Redis for attempt results
3. **Database Indexing**: On frequently queried fields
4. **API Rate Limiting**: Prevent abuse
5. **Database Replication**: For redundancy
6. **CDN**: For static assets
7. **Microservices**: Separate auth, quiz, analytics

### Performance Optimization
1. **Query Optimization**: Index frequently searched fields
2. **Pagination**: For large attempt lists
3. **Lazy Loading**: Load progress data on demand
4. **Debouncing**: On search fields
5. **Code Splitting**: React lazy loading
6. **Compression**: GZip responses

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection tested
- [ ] JWT_SECRET changed from default
- [ ] CORS origins restricted
- [ ] Error logging implemented
- [ ] HTTPS enabled
- [ ] Input validation enhanced
- [ ] Rate limiting added
- [ ] Database backups configured
- [ ] Monitoring/alerting setup

---

## Development Notes

### Common Commands
```bash
# Backend
cd Backend
npm install          # Install dependencies
npm run dev          # Start development server
npm run init         # Initialize database
npm start            # Production mode

# Frontend
cd Frontend
npm install          # Install dependencies
npm start            # Development server
npm run build        # Production build
npm test             # Run tests
```

### Debug Mode
```javascript
// Frontend - Set in services/api.js
console.log('Request:', config);  // Log all requests

// Backend - Set in server.js
app.use(morgan('dev'));  // Detailed logging
```

### Database Backup
```bash
# Export data
mongoexport --db educonnect --collection users --out users.json

# Import data
mongoimport --db educonnect --collection users --file users.json
```

---

## Conclusion

This architecture provides:
- ✅ Secure authentication
- ✅ Scalable API design
- ✅ Modular components
- ✅ Clean separation of concerns
- ✅ Production-ready code
- ✅ Easy to maintain and extend

The system is built to handle the core requirements and can be extended with additional features as needed.
