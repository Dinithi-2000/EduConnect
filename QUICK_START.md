# EduConnect - Quick Reference Guide

## 🚀 Getting Started (Quick Version)

### First Time Setup
```bash
# 1. Clone repository
git clone https://github.com/Dinithi-2000/EduConnect.git
cd EduConnect

# 2. Install all dependencies
npm run install-all

# 3. Copy environment files
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env
cd ..

# 4. Make sure MongoDB is running
# Windows: net start MongoDB
# macOS/Linux: sudo systemctl start mongod

# 5. Start the application
npm run dev
```

### Daily Development

**Start both frontend and backend:**
```bash
npm run dev
```

**Backend only (port 5000):**
```bash
npm run server
```

**Frontend only (port 3000):**
```bash
npm run client
```

## 📂 Folder Structure Overview

### Backend (`/backend`)
- `config/` - Database and environment configuration
- `controllers/` - Business logic (authController, courseController)
- `middleware/` - Auth middleware, error handling
- `models/` - MongoDB schemas (User, Course)
- `routes/` - API endpoints
- `utils/` - Helper functions
- `server.js` - Main entry point

### Frontend (`/frontend/src`)
- `components/` - Reusable UI (Navbar, Footer, PrivateRoute)
- `pages/` - Page components (Home, Login, Register, Dashboard, Courses)
- `context/` - React Context (AuthContext)
- `services/` - API calls (api.js, courseService.js)
- `App.js` - Main app with routes

## 🔑 Key Features Implemented

✅ User Authentication (Register/Login)  
✅ JWT Authorization  
✅ Protected Routes  
✅ Course Management  
✅ User Dashboard  
✅ Responsive Navbar/Footer  

## 📝 Common Commands

### Git Workflow
```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Stage and commit changes
git add .
git commit -m "feat: your feature description"

# Push to GitHub
git push origin feature/your-feature-name
```

### Installing New Packages

**Backend:**
```bash
cd backend
npm install package-name
```

**Frontend:**
```bash
cd frontend
npm install package-name
```

## 🌐 API Endpoints (Backend)

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get single course
- `POST /api/courses` - Create course (teacher/admin only)
- `PUT /api/courses/:id` - Update course (teacher/admin only)
- `DELETE /api/courses/:id` - Delete course (teacher/admin only)

### Health Check
- `GET /api/health` - Check if API is running

## 🔧 Environment Variables

### Backend (`.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/educonnect
JWT_SECRET=your_secret_key
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:3000
```

### Frontend (`.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🐛 Troubleshooting

### "Address already in use"
- Backend: Change PORT in `backend/.env`
- Frontend: Kill process on port 3000 or set PORT=3001 in `frontend/.env`

### "MongoDB connection failed"
- Ensure MongoDB is running
- Check MONGO_URI in `backend/.env`
- For MongoDB Atlas, use connection string from cloud

### "Module not found"
```bash
# Reinstall all dependencies
npm run install-all
```

### "CORS error"
- Ensure backend is running
- Check CLIENT_URL in `backend/.env`
- Verify REACT_APP_API_URL in `frontend/.env`

## 📚 Tech Stack Reference

**Frontend:**
- React 18.2.0
- React Router DOM 6.14.0
- Axios
- CSS3

**Backend:**
- Node.js + Express.js 5.2.1
- MongoDB + Mongoose 9.2.3
- JWT + bcryptjs

## 📖 Documentation Files

- `README.md` - Project overview
- `SETUP.md` - Detailed setup instructions
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - MIT License

## 🎯 Next Steps for Team

1. **Set up local environment**
   - Install Node.js, MongoDB
   - Clone repository
   - Run `npm run install-all`

2. **Configure environment variables**
   - Copy `.env.example` files
   - Update with your settings

3. **Run the application**
   - Start MongoDB
   - Run `npm run dev`
   - Access at http://localhost:3000

4. **Start developing**
   - Create feature branches
   - Work on assigned tasks
   - Submit pull requests

## 💡 Tips

- Always pull latest changes before starting work
- Test your changes locally before pushing
- Write meaningful commit messages
- Keep your branch up to date with main
- Ask for help if stuck!

## 📞 Team Communication

- GitHub Issues - Report bugs, request features
- GitHub Project Board - Track tasks
- Pull Requests - Code reviews

---

**Happy Coding! 🚀**
