# EduConnect - Educational Platform

## 📚 Project Overview
EduConnect is a modern educational platform built with the MERN stack (MongoDB, Express.js, React, Node.js) designed to connect students, teachers, and educational resources in a seamless digital environment.

## 🛠️ Tech Stack

### Frontend
- **React** 18.2.0 - UI library
- **React Router Dom** 6.14.0 - Navigation
- **Axios** - HTTP client
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express.js** 5.2.1 - Web framework
- **MongoDB** - Database
- **Mongoose** 9.2.3 - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Development Tools
- **Nodemon** - Auto-reload server
- **Concurrently** - Run multiple scripts

## 👥 Team Members
- **Dinithi** - Project Lead & Repository Owner
- **Team Member 2** - [Role TBD]
- **Team Member 3** - [Role TBD]
- **Team Member 4** - [Role TBD]

## 🎯 Project Goals
1. Create a user-friendly educational platform
2. Implement secure authentication and authorization
3. Develop comprehensive course management system
4. Build responsive dashboard for students and teachers
5. Ensure responsive and accessible UI/UX

## 📁 Project Structure
```
EduConnect/
├── backend/          # Express.js API
│   ├── config/      # Configuration files
│   ├── controllers/ # Route controllers
│   ├── middleware/  # Custom middleware
│   ├── models/      # Mongoose models
│   ├── routes/      # API routes
│   ├── utils/       # Utilities
│   └── server.js    # Entry point
├── frontend/        # React application
│   ├── public/      # Static files
│   └── src/         # React source
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components
│       ├── context/     # React Context API
│       └── services/    # API services
└── docs/           # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5.0 or higher)
- Git
- Code editor (VS Code recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Dinithi-2000/EduConnect.git
cd EduConnect
```

2. **Install all dependencies**
```bash
npm run install-all
```

3. **Set up environment variables**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and other settings

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your API URL
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running locally or use MongoDB Atlas
```

5. **Run the application**
```bash
# From root directory - runs both frontend and backend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

For detailed setup instructions, see [SETUP.md](SETUP.md)

## 📊 Development Scripts

### Root Level
- `npm run dev` - Run both frontend and backend concurrently
- `npm run server` - Run backend only
- `npm run client` - Run frontend only
- `npm run install-all` - Install all dependencies
- `npm run build` - Build frontend for production

### Backend
- `npm run dev` - Run with nodemon (auto-reload)
- `npm start` - Run production server

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## 🔑 Features

### Current Features
✅ User authentication (Register/Login)  
✅ JWT-based authorization  
✅ Role-based access control (Student, Teacher, Admin)  
✅ Course listing and details  
✅ User dashboard  
✅ Responsive design  

### Planned Features
📝 Course enrollment  
📝 Progress tracking  
📝 Assignments and quizzes  
📝 Real-time chat  
📝 Video lessons  
📝 Certificate generation  

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get single course
- `POST /api/courses` - Create course (Teacher/Admin)
- `PUT /api/courses/:id` - Update course (Teacher/Admin)
- `DELETE /api/courses/:id` - Delete course (Teacher/Admin)

## 📊 Project Board
Track our progress on the [GitHub Project Board](https://github.com/Dinithi-2000/EduConnect/projects)

## 🔗 Important Links
- [Setup Guide](SETUP.md)
- [Team Todo Lists](docs/team-todos/)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Project Board Guide](docs/PROJECT_BOARD_GUIDE.md)

## 📝 Documentation
All project documentation can be found in the `/docs` folder.

## 🤝 Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Port already in use**
- Change PORT in `backend/.env`
- Update `REACT_APP_API_URL` in `frontend/.env`

**MongoDB connection error**
- Ensure MongoDB is running
- Check MONGO_URI in `.env`

**Module not found**
- Run `npm run install-all`

**CORS errors**
- Ensure backend is running
- Check CLIENT_URL in backend `.env`

## 📞 Contact
For questions or concerns, please open an issue on GitHub or contact the project lead.

## 🙏 Acknowledgments
- React Team for the amazing library
- Express.js community
- MongoDB team
- All contributors to this project

---

**Built with ❤️ by the EduConnect Team**

Last Updated: February 27, 2026
