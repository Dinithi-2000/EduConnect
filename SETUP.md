# EduConnect - Project Setup Guide

## 📋 Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (v5.0 or higher)
- [Git](https://git-scm.com/)
- A code editor (VS Code recommended)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Dinithi-2000/EduConnect.git
cd EduConnect
```

### 2. Install All Dependencies
```bash
npm run install-all
```

This will install dependencies for:
- Root project
- Backend (Express/Node.js)
- Frontend (React)

### 3. Set Up Environment Variables

#### Backend Environment
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your settings:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/educonnect
JWT_SECRET=your_secret_key_change_this
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:3000
```

#### Frontend Environment
```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:

**Windows:**
```bash
net start MongoDB
```

**macOS/Linux:**
```bash
sudo systemctl start mongod
```

Or if using MongoDB Atlas, update `MONGO_URI` in backend/.env

### 5. Run the Application

#### Option A: Run Both (Recommended)
From the root directory:
```bash
npm run dev
```

This starts:
- Backend API: http://localhost:5000
- Frontend App: http://localhost:3000

#### Option B: Run Separately

**Backend Only:**
```bash
npm run server
```

**Frontend Only:**
```bash
npm run client
```

## 📁 Project Structure

```
EduConnect/
├── backend/                    # Express.js Backend
│   ├── config/                # Configuration files
│   │   ├── database.js       # MongoDB connection
│   │   └── env.js            # Environment variables
│   ├── controllers/          # Route controllers
│   │   ├── authController.js
│   │   └── courseController.js
│   ├── middleware/           # Custom middleware
│   │   ├── auth.js          # Authentication middleware
│   │   └── errorHandler.js  # Error handling
│   ├── models/              # Mongoose models
│   │   ├── User.js
│   │   └── Course.js
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   └── courseRoutes.js
│   ├── utils/               # Utility functions
│   │   └── logger.js
│   ├── server.js            # Entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/                 # React Frontend
│   ├── public/              # Static files
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   │   ├── Navbar.js
│   │   │   ├── Footer.js
│   │   │   └── PrivateRoute.js
│   │   ├── pages/           # Page components
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Courses.js
│   │   │   ├── CourseDetail.js
│   │   │   └── NotFound.js
│   │   ├── context/         # React Context
│   │   │   └── AuthContext.js
│   │   ├── services/        # API services
│   │   │   ├── api.js
│   │   │   └── courseService.js
│   │   ├── App.js           # Main App component
│   │   ├── App.css
│   │   ├── index.js         # Entry point
│   │   └── index.css
│   ├── package.json
│   └── .env.example
│
├── docs/                     # Documentation
│   ├── team-todos/          # Team member todo lists
│   └── PROJECT_BOARD_GUIDE.md
│
├── .github/                 # GitHub specific
│   └── ISSUE_TEMPLATE/     # Issue templates
│
├── .gitignore
├── package.json            # Root package.json
├── README.md
└── SETUP.md               # This file
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Run both frontend and backend
- `npm run server` - Run backend only
- `npm run client` - Run frontend only
- `npm run install-all` - Install all dependencies
- `npm run build` - Build frontend for production

### Backend (in /backend)
- `npm run dev` - Run with nodemon (auto-reload)
- `npm start` - Run production server

### Frontend (in /frontend)
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## 🗄️ Database Setup

### Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Database will be created automatically when you run the app

### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `MONGO_URI` in `backend/.env`

## 📦 Additional Backend Dependencies

If needed, install these manually:
```bash
cd backend
npm install bcryptjs cors dotenv express jsonwebtoken mongoose
npm install -D nodemon
```

## 📦 Additional Frontend Dependencies

If needed, install these manually:
```bash
cd frontend
npm install axios react react-dom react-router-dom
```

## 🧪 Testing the API

### Using the API

#### Health Check
```bash
GET http://localhost:5000/api/health
```

#### Register User
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student"
}
```

#### Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Courses
```bash
GET http://localhost:5000/api/courses
```

## 🐛 Troubleshooting

### Port Already in Use
If port 5000 or 3000 is in use:
- Change `PORT` in `backend/.env`
- Update `REACT_APP_API_URL` in `frontend/.env`

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGO_URI` in `.env`
- Verify network connectivity for MongoDB Atlas

### Module Not Found
```bash
npm run install-all
```

### CORS Errors
- Ensure backend is running
- Check `CLIENT_URL` in backend `.env`
- Verify frontend API URL in `frontend/.env`

## 🔐 Default Users

After setup, you can create test users:
- Student: student@example.com / password123
- Teacher: teacher@example.com / password123
- Admin: admin@example.com / password123

## 📚 Learning Resources

- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Mongoose Docs](https://mongoosejs.com/)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## 📞 Support

- GitHub Issues: [Create an issue](https://github.com/Dinithi-2000/EduConnect/issues)
- Project Board: [View tasks](https://github.com/Dinithi-2000/EduConnect/projects)

---

**Happy Coding! 🎓**
