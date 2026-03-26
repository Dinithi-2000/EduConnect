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
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
AI_PROVIDER=gemini
STRIPE_SECRET_KEY=your_stripe_secret_key_here
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
```

`AI_PROVIDER` can be `gemini`, `openai`, or `auto`.
In `auto` mode, Gemini is preferred when `GEMINI_API_KEY` is available.
If no provider key is present, the chatbot still works with a local fallback response mode.

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

### AI Chat
- `POST /api/ai/chat` - Send chat message to EduConnect AI assistant
- `POST /api/ai/train` - Add/update internal Q&A knowledge entries for RAG
- `GET /api/ai/history/:studentId` - Load saved chat history for continuity

### Commerce
- `GET /api/commerce/premium-catalog` - List premium quizzes/courses available for purchase
- `POST /api/commerce/complete-purchase` - Complete tokenized payment and unlock premium content
- `POST /api/commerce/stripe/create-checkout-session` - Create Stripe Checkout session for premium item
- `POST /api/commerce/stripe/complete-checkout` - Verify Stripe session and unlock purchased premium item

## RAG Architecture (Chatbot)

- Retrieval: Finds top internal knowledge entries from `Backend/data/knowledgeBase.json` based on question + student context.
- Augmentation: Injects current course, recent activity, and retrieved docs into the model prompt.
- Generation: Uses Gemini (`AI_PROVIDER=gemini`) or OpenAI fallback depending on environment.
- Continuity: Saves and reloads chat history from `Backend/data/chatHistory.json`.
- Recommendations: Returns related resources/quizzes/Kuppi suggestions in each response when possible.

## Payment Security Notes

- The purchase API accepts only gateway-generated tokens (`paymentToken`) from Stripe/PayPal.
- Raw `cardNumber` and `cvv` are explicitly rejected.
- Transaction, unlock, and receipt queue records are persisted for admin tracking and follow-up processing.

## Technologies Used

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
