# EduConnect Backend

Backend API for EduConnect application built with Node.js, Express, and MongoDB.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add the following:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/educonnect
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

### 3. Run the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## Folder Structure

```
Backend/
├── config/           # Configuration files (database, etc.)
├── controllers/      # Request handlers
├── middleware/       # Custom middleware (auth, error handling)
├── models/          # Mongoose models
├── routes/          # API routes
├── utils/           # Utility functions
├── .env.example     # Example environment variables
├── .gitignore       # Git ignore file
├── package.json     # Dependencies and scripts
└── server.js        # Entry point
```

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Courses

#### `GET /api/courses/:id` — Course Detail

Returns full information about a single published course, including the module/lesson hierarchy, per-lesson content items, access flags, and (when authenticated) the requesting student's progress.

**Authentication:** Optional — supply a `Bearer <token>` header to receive `access` and `progress` fields populated for the current user.

**Success Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "course": {
      "_id": "64abc…",
      "title": "Introduction to Computer Science",
      "description": "A beginner-friendly course covering core CS concepts.",
      "instructor": { "_id": "64def…", "name": "Dr. Smith", "email": "smith@example.com" },
      "thumbnail": "https://cdn.example.com/thumbnails/cs101.jpg",
      "category": "Computer Science",
      "level": "beginner",
      "tags": ["cs", "algorithms", "beginner"],
      "isPublished": true,
      "totalModules": 3,
      "totalLessons": 12,
      "totalDuration": 7200,
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-03-15T12:30:00.000Z"
    },
    "modules": [
      {
        "_id": "64m01…",
        "title": "Module 1: Foundations",
        "description": "Core concepts and history of computing.",
        "order": 1,
        "lessons": [
          {
            "_id": "64l01…",
            "title": "Lesson 1: What is CS?",
            "description": "An overview of computer science as a discipline.",
            "order": 1,
            "duration": 600,
            "isPreview": true,
            "contentItems": [
              {
                "_id": "64c01…",
                "title": "Intro Video",
                "type": "video",
                "url": "https://cdn.example.com/videos/cs101-l1.mp4",
                "duration": 600,
                "size": null,
                "order": 1
              },
              {
                "_id": "64c02…",
                "title": "Lecture Notes",
                "type": "pdf",
                "url": "https://cdn.example.com/pdfs/cs101-l1-notes.pdf",
                "duration": null,
                "size": 512,
                "order": 2
              }
            ],
            "isAccessible": true,
            "isCompleted": false
          }
        ]
      }
    ],
    "access": {
      "isEnrolled": true,
      "enrolledAt": "2024-02-01T09:00:00.000Z",
      "canAccess": true
    },
    "progress": {
      "overallProgress": 25.0,
      "completedLessons": ["64l01…"],
      "totalLessons": 12,
      "completedCount": 3,
      "lastAccessedAt": "2024-03-14T18:45:00.000Z",
      "completedAt": null
    }
  }
}
```

**Notes:**
- `access` and `progress` are `null` / default values when the request is unauthenticated.
- `progress` is `null` when the user is authenticated but not enrolled.
- For lessons that are **not** a preview and the user is **not** enrolled, `contentItems[].url` is returned as `null` (metadata is still visible).
- Unpublished courses return `403` unless the requesting user is the instructor or an admin.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| `403 Forbidden` | Course is unpublished and the caller is not the instructor or an admin |
| `404 Not Found` | No course exists for the given `:id` |
| `500 Internal Server Error` | Unexpected server-side error |

## Technologies Used

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
