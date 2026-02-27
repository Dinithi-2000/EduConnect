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

## Technologies Used

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
