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
- `GET /api/courses` - Get all courses (module content excluded from list view)
- `GET /api/courses/:id` - Get a single course with ordered modules and lessons (visibility rules applied, content metadata included)
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

#### Course Detail Response (`GET /api/courses/:id`)

Returns a single course document. Modules are ordered by their `order` field (ascending), and lessons within each module are similarly ordered. Non-visible modules and lessons are excluded from the response.

Each lesson includes a `contentMetadata` object with type-specific fields:

| Field | Description |
|---|---|
| `duration` | Duration in seconds (video/audio) |
| `fileSize` | File size in bytes (documents/videos) |
| `fileFormat` | File format, e.g. `"mp4"`, `"pdf"` |
| `resolution` | Video resolution, e.g. `"1080p"` |
| `pageCount` | Number of pages (documents) |
| `transcript` | Text transcript (video/audio) |

Each lesson also has an `isVisible` flag and an `isFreePreview` flag controlling access, and `contentType` is one of `video`, `document`, `text`, `quiz`, or `assignment`.

## Technologies Used

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
