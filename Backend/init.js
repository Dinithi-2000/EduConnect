const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Quiz = require('./models/Quiz');

dotenv.config();

const initializeDB = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');

        // Clear existing data (optional - comment out if you want to keep data)
        // await User.deleteMany({});
        // await Quiz.deleteMany({});

        // Create demo users
        const users = await User.find();
        if (!users.length) {
            const adminUser = await User.create({
                name: 'Admin Dinathi',
                email: 'admin@educonnect.com',
                password: 'admin123',
                role: 'admin'
            });
            console.log('✅ Admin user created');

            const studentUser = await User.create({
                name: 'Student Demo',
                email: 'student@educonnect.com',
                password: 'student123',
                role: 'student'
            });
            console.log('✅ Student user created');
        }

        // Create demo quizzes if they don't exist
        const quizCount = await Quiz.countDocuments();
        if (quizCount === 0) {
            const quizzes = await Quiz.create([
                {
                    title: 'Data Structures Fundamentals',
                    subject: 'Computer Science',
                    description: 'Test your knowledge on basic data structures like arrays, linked lists, stacks, and queues.',
                    difficulty: 'Easy',
                    timeLimit: 20,
                    questions: [
                        {
                            questionText: 'What is the time complexity of binary search?',
                            questionType: 'MCQ',
                            options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
                            correctAnswer: '1',
                            marks: 1,
                            explanation: 'Binary search has O(log n) time complexity as it divides the array in half each iteration.'
                        },
                        {
                            questionText: 'Which data structure uses LIFO (Last In First Out)?',
                            questionType: 'MCQ',
                            options: ['Queue', 'Stack', 'Tree', 'Graph'],
                            correctAnswer: '1',
                            marks: 1,
                            explanation: 'Stack uses LIFO principle where the last element added is the first one to be removed.'
                        },
                        {
                            questionText: 'Is linked list always better than array?',
                            questionType: 'TrueFalse',
                            options: ['True', 'False'],
                            correctAnswer: 'False',
                            marks: 1,
                            explanation: 'Both have trade-offs. Arrays are better for random access, linked lists for insertions.'
                        }
                    ]
                },
                {
                    title: 'Advanced Algorithms',
                    subject: 'Computer Science',
                    description: 'Challenging questions on algorithms including sorting, searching, and dynamic programming.',
                    difficulty: 'Hard',
                    timeLimit: 30,
                    questions: [
                        {
                            questionText: 'What is the worst-case time complexity of quicksort?',
                            questionType: 'MCQ',
                            options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
                            correctAnswer: '1',
                            marks: 2,
                            explanation: 'Quicksort has O(n²) worst-case when pivot selection is poor, while average is O(n log n).'
                        },
                        {
                            questionText: 'Dynamic programming is used for problems with overlapping subproblems.',
                            questionType: 'TrueFalse',
                            options: ['True', 'False'],
                            correctAnswer: 'True',
                            marks: 2,
                            explanation: 'Dynamic programming solves problems by storing and reusing subproblem solutions.'
                        }
                    ]
                },
                {
                    title: 'JavaScript Basics',
                    subject: 'Web Development',
                    description: 'Foundation concepts in JavaScript programming language.',
                    difficulty: 'Easy',
                    timeLimit: 15,
                    questions: [
                        {
                            questionText: 'What does "let" keyword do in JavaScript?',
                            questionType: 'MCQ',
                            options: [
                                'Declares global variable',
                                'Declares block-scoped variable',
                                'Declares function-scoped variable',
                                'Declares constant'
                            ],
                            correctAnswer: '1',
                            marks: 1,
                            explanation: 'let declares a block-scoped variable that is only accessible within the block.'
                        },
                        {
                            questionText: 'Closures in JavaScript can access parent scope variables.',
                            questionType: 'TrueFalse',
                            options: ['True', 'False'],
                            correctAnswer: 'True',
                            marks: 1,
                            explanation: 'Closures have access to variables from their parent/outer scope.'
                        }
                    ]
                },
                {
                    title: 'React Components',
                    subject: 'Web Development',
                    description: 'Intermediate level questions on React component lifecycle and state management.',
                    difficulty: 'Medium',
                    timeLimit: 25,
                    questions: [
                        {
                            questionText: 'What is the correct way to pass props in React?',
                            questionType: 'MCQ',
                            options: [
                                'Through global variables',
                                'As HTML attributes on components',
                                'Through parent component function parameters',
                                'In component state'
                            ],
                            correctAnswer: '1',
                            marks: 2,
                            explanation: 'Props are passed as attributes to React components, similar to HTML attributes.'
                        },
                        {
                            questionText: 'Hooks like useState can only be used in functional components.',
                            questionType: 'TrueFalse',
                            options: ['True', 'False'],
                            correctAnswer: 'True',
                            marks: 2,
                            explanation: 'React Hooks were designed specifically to work with functional components.'
                        }
                    ]
                },
                {
                    title: 'Mathematics - Algebra',
                    subject: 'Mathematics',
                    description: 'Test your algebra skills with equations and expressions.',
                    difficulty: 'Medium',
                    timeLimit: 20,
                    questions: [
                        {
                            questionText: 'Solve for x: 2x + 5 = 13',
                            questionType: 'MCQ',
                            options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
                            correctAnswer: '1',
                            marks: 1,
                            explanation: '2x + 5 = 13 → 2x = 8 → x = 4'
                        }
                    ]
                }
            ]);
            console.log(`✅ ${quizzes.length} demo quizzes created`);
        }

        console.log('✅ Database initialization completed successfully!');
        console.log('\n📝 Demo Credentials:');
        console.log('   Admin: admin@educonnect.com / admin123');
        console.log('   Student: student@educonnect.com / student123');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during initialization:', error.message);
        process.exit(1);
    }
};

initializeDB();
