# EduConnect Frontend

Frontend application for EduConnect built with React.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Run the Application

**Development mode:**
```bash
npm start
```

**Build for production:**
```bash
npm run build
```

## Folder Structure

```
Frontend/
├── public/              # Static files
│   └── index.html      # HTML template
├── src/
│   ├── components/     # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── Navbar.css
│   │   ├── Card.jsx
│   │   └── Card.css
│   ├── pages/          # Page components
│   │   ├── Home.jsx
│   │   ├── Home.css
│   │   ├── About.jsx
│   │   ├── About.css
│   │   ├── NotFound.jsx
│   │   └── NotFound.css
│   ├── services/       # API service functions
│   │   ├── api.js
│   │   └── userService.js
│   ├── context/        # React Context for state management
│   │   └── AuthContext.jsx
│   ├── utils/          # Utility functions
│   │   └── helpers.js
│   ├── App.js          # Main App component
│   ├── App.css         # App styles
│   ├── index.js        # Entry point
│   └── index.css       # Global styles
├── .env.example        # Example environment variables
├── .gitignore          # Git ignore file
└── package.json        # Dependencies and scripts
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner

## Features

- **React Router** - Navigation between pages
- **Axios** - HTTP client for API calls
- **Context API** - State management
- **Component-based architecture** - Reusable UI components
- **Responsive design** - Mobile-friendly interface

## Technologies Used

- **React** - UI library
- **React Router** - Routing
- **Axios** - HTTP client
- **CSS3** - Styling
