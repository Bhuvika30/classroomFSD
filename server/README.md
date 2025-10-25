# Classroom Assignment Portal

A comprehensive classroom management system built with the MERN stack (MongoDB, Express.js, React, Node.js). This application supports role-based access control for students, teachers, and administrators with features for class management, assignment creation, submission handling, grading, and analytics.

## Features

### 🎯 Core Functionality

- **Role-based Authentication**: Student, Teacher, and Admin roles with JWT-based authentication
- **Class Management**: Create, join, and manage classes with unique class codes
- **Assignment System**: Create assignments with file/link submissions, due dates, and point values
- **Submission Handling**: Students can submit files or links with comments
- **Grading System**: Teachers can grade submissions with feedback and comments
- **Real-time Dashboard**: Role-specific dashboards with relevant information

### 👥 User Roles

#### Students

- Join classes using class codes
- View assignments and due dates
- Submit assignments (file upload or link submission)
- Track submission status and grades
- View teacher feedback and comments

#### Teachers

- Create and manage classes
- Create assignments with detailed instructions
- Review and grade student submissions
- Provide feedback and comments
- View class analytics and statistics

#### Administrators

- Manage all users (students, teachers, admins)
- Oversee all classes and assignments
- View system-wide statistics
- User role management and account activation/deactivation

### 🔧 Technical Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Search & Filtering**: Advanced search and filtering across all entities
- **Pagination**: Efficient data loading with pagination
- **File Upload**: Secure file upload with validation
- **Security**: Input validation, authentication, authorization, and rate limiting
- **Modern UI**: Clean, intuitive interface without external CSS frameworks

## Tech Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Multer** - File upload handling
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### Frontend

- **React** - UI library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management
- **Custom CSS** - Styling (no Tailwind or external frameworks)

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Backend Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd classroom
   ```

2. **Install backend dependencies**

   ```bash
   cd server
   npm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your configuration:

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/classroom
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   BCRYPT_ROUNDS=12
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=10485760
   ALLOWED_FILE_TYPES=pdf,doc,docx,txt,jpg,jpeg,png
   CLIENT_URL=http://localhost:3000
   ```

4. **Start MongoDB**

   ```bash
   # Using MongoDB service
   sudo systemctl start mongod

   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the backend server**

   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:5000`

### Frontend Setup

1. **Install frontend dependencies**

   ```bash
   cd ../client
   npm install
   ```

2. **Environment Configuration**
   Create `.env` file in the client directory:

   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

3. **Start the frontend development server**

   ```bash
   npm start
   ```

   The application will open at `http://localhost:3000`

## Usage

### Initial Setup

1. **Create Admin Account**

   - Register the first user through the registration form
   - Manually update their role to 'admin' in the database:

   ```javascript
   // In MongoDB shell
   db.users.updateOne(
     { email: 'admin@example.com' },
     { $set: { role: 'admin' } }
   )
   ```

2. **Demo Accounts**
   The login page includes demo account credentials for testing:
   - **Admin**: admin@classroom.com / password123
   - **Teacher**: teacher@classroom.com / password123
   - **Student**: student@classroom.com / password123

### Getting Started

#### For Teachers:

1. Login with teacher credentials
2. Create a new class from the Classes page
3. Share the class code with students
4. Create assignments with instructions and due dates
5. Review and grade student submissions

#### For Students:

1. Login with student credentials
2. Join a class using the class code provided by teacher
3. View assignments on the Dashboard or Assignments page
4. Submit work before the due date
5. Check grades and feedback on submissions

#### For Admins:

1. Access the Admin Panel from the navigation
2. Manage users (create, edit roles, activate/deactivate)
3. Oversee classes and assignments
4. View system statistics and analytics

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Class Endpoints

- `GET /api/classes` - List classes (with pagination, search, filters)
- `POST /api/classes` - Create new class
- `GET /api/classes/:id` - Get class details
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete/archive class
- `POST /api/classes/:id/enroll` - Enroll student
- `POST /api/classes/join` - Join class by code

### Assignment Endpoints

- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `GET /api/assignments/:id` - Get assignment details
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment
- `GET /api/assignments/:id/submissions` - Get assignment submissions

### Submission Endpoints

- `GET /api/submissions` - List user submissions
- `POST /api/submissions` - Create submission
- `GET /api/submissions/:id` - Get submission details
- `PUT /api/submissions/:id` - Update submission
- `PUT /api/submissions/:id/grade` - Grade submission

## Project Structure

```
classroom/
├── server/                 # Backend application
│   ├── config/            # Database configuration
│   ├── middleware/        # Authentication, validation, upload
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API route handlers
│   ├── utils/            # Utility functions
│   ├── server.js         # Main server file
│   └── package.json      # Backend dependencies
├── client/               # Frontend application
│   ├── public/          # Static assets
│   ├── src/
│   │   ├── components/  # React components
│   │   │   ├── Auth/    # Authentication components
│   │   │   ├── Classes/ # Class management
│   │   │   ├── Assignments/ # Assignment components
│   │   │   ├── Submissions/ # Submission components
│   │   │   ├── Dashboard/   # Dashboard components
│   │   │   ├── Profile/     # User profile
│   │   │   ├── Admin/       # Admin panel
│   │   │   ├── Layout/      # Navigation, layout
│   │   │   └── Common/      # Shared components
│   │   ├── contexts/    # React contexts
│   │   ├── utils/       # API utilities
│   │   ├── App.js       # Main app component
│   │   └── index.js     # React entry point
│   └── package.json     # Frontend dependencies
├── package.json          # Root package.json
└── README.md            # This file
```

## Security Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Password Security**: bcrypt hashing with salt rounds
- **Input Validation**: Server-side validation using express-validator
- **File Upload Security**: File type and size validation
- **Rate Limiting**: API rate limiting on authentication endpoints
- **CORS**: Configured for specific origins
- **Security Headers**: Helmet.js for security headers

## Development

### Available Scripts

#### Backend (server/)

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests

#### Frontend (client/)

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

#### Root

- `npm run server` - Start backend server
- `npm run client` - Start frontend server
- `npm run dev` - Start both frontend and backend concurrently

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Deployment

### Production Build

1. **Build the frontend**

   ```bash
   cd client
   npm run build
   ```

2. **Configure environment variables for production**

   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   CLIENT_URL=your-production-domain
   ```

3. **Start the production server**
   ```bash
   cd server
   npm start
   ```

### Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./server
    ports:
      - '5000:5000'
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/classroom
    depends_on:
      - mongodb

  frontend:
    build: ./client
    ports:
      - '3000:3000'
    depends_on:
      - backend

volumes:
  mongodb_data:
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please create an issue in the GitHub repository or contact the development team.

---

Built with ❤️ using the MERN stack
#   C l a s s r o o m P r o j e c t  
 #   c l a s s r o o m  
 #   c l a s s r o o m - p r o j e c t  
 