# EduConnect - MERN Stack Application

EduConnect is a full-stack educational platform built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Project Structure

```
EduConnect/
├── Backend/               # Node.js + Express backend
│   ├── config/           # Database configuration
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── .env.example     # Environment variables template
│   ├── .gitignore       # Git ignore file
│   ├── package.json     # Backend dependencies
│   ├── server.js        # Entry point
│   └── README.md        # Backend documentation
│
└── Frontend/             # React frontend
    ├── public/          # Static files
    ├── src/
    │   ├── components/  # Reusable components
    │   ├── pages/       # Page components
    │   ├── services/    # API services
    │   ├── context/     # React Context
    │   ├── utils/       # Helper functions
    │   ├── App.js       # Main component
    │   └── index.js     # Entry point
    ├── .env.example     # Environment variables template
    ├── .gitignore       # Git ignore file
    ├── package.json     # Frontend dependencies
    └── README.md        # Frontend documentation
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

#### 1. Clone the repository
```bash
git clone <repository-url>
cd EduConnect
```

#### 2. Backend Setup
```bash
cd Backend
npm install
```

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Update the `.env` file with your configuration:
```
PORT=5000
MONGODB_URI=mongodb+srv://educonnect-admin:educonnectAdmin123@educonnect-cluster.9pseo0d.mongodb.net/?appName=educonnect-cluster
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

Start the backend server:
```bash
npm run dev
```

#### 3. Frontend Setup
```bash
cd ../Frontend
npm install
```

Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Update the `.env` file:
```
REACT_APP_API_URL=http://localhost:5000/api
```

Start the React development server:
```bash
npm start
```

### Running the Application

1. **Start MongoDB:**
   ```bash
   mongod
   ```

2. **Start Backend Server (Terminal 1):**
   ```bash
   cd Backend
   npm run dev
   ```
   Backend will run on http://localhost:5000

3. **Start Frontend Server (Terminal 2):**
   ```bash
   cd Frontend
   npm start
   ```
   Frontend will run on http://localhost:3000

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management

## Features

- ✅ RESTful API architecture
- ✅ User authentication with JWT
- ✅ MongoDB database integration
- ✅ React Router for navigation
- ✅ Responsive design
- ✅ Error handling middleware
- ✅ Environment variables configuration
- ✅ Modular folder structure

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Development

### Backend Development
```bash
cd Backend
npm run dev    # Run with nodemon (auto-restart)
npm start      # Run in production mode
```

### Frontend Development
```bash
cd Frontend
npm start      # Development server with hot reload
npm run build  # Production build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
