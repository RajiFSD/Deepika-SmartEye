# SmartAI People Counting System

A comprehensive AI-powered people counting and occupancy management system with real-time monitoring, alerts, and analytics.

## 🎯 Features

- **Real-time People Counting**: Track entry and exit counts in real-time
- **Multi-tenant Support**: Manage multiple organizations and branches
- **Camera Management**: Configure and monitor multiple IP/RTSP cameras
- **Zone Configuration**: Define custom counting zones with polygon mapping
- **Alert System**: Automated alerts when occupancy thresholds are exceeded
- **Analytics Dashboard**: Comprehensive analytics and reporting
- **User Management**: Role-based access control (Super Admin, Admin, Manager, Viewer)
- **Export Reports**: Generate PDF/Excel reports for occupancy data
- **REST API**: Complete RESTful API for integration

## 🏗️ Architecture

```
smartai-people-counting/
├── backend/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── models/           # Sequelize models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── validators/       # Request validation
│   ├── uploads/          # File uploads
│   ├── logs/             # Application logs
│   └── server.js         # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── context/      # React context
│   │   └── App.jsx       # Main app
│   └── package.json
└── ai-module/
    ├── detection/        # AI detection scripts
    ├── models/           # AI model files
    └── requirements.txt
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0.0
- MySQL >= 8.0
- Python >= 3.8 (for AI module)
- npm >= 8.0.0

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smartai-people-counting/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Create database**
   ```sql
   CREATE DATABASE smartai_people_counting;
   ```

5. **Run database migrations**
   ```bash
   npm run db:sync
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Set REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start development server**
   ```bash
   npm start
   ```

The app will be available at `http://localhost:3000`

### AI Module Setup

1. **Navigate to AI module directory**
   ```bash
   cd ../ai-module
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Download AI models**
   ```bash
   python download_models.py
   ```

## 📚 API Documentation

### Authentication

```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh-token
POST /api/auth/logout
```

### Cameras

```http
GET    /api/cameras
POST   /api/cameras
GET    /api/cameras/:id
PUT    /api/cameras/:id
DELETE /api/cameras/:id
PUT    /api/cameras/:id/status
```

### People Count

```http
GET  /api/people-count
POST /api/people-count
GET  /api/people-count/stats
GET  /api/people-count/current-occupancy
```

### Alerts

```http
GET    /api/alerts
POST   /api/alerts/threshold
GET    /api/alerts/logs
PUT    /api/alerts/:id/resolve
```

For complete API documentation, visit `/api-docs` when the server is running.

## 🗄️ Database Schema

### Core Tables

- **tenants**: Organization information
- **branches**: Physical locations
- **users**: User accounts and authentication
- **cameras**: Camera configurations
- **zone_configs**: Counting zone definitions
- **people_count_logs**: Entry/exit records
- **current_occupancy**: Real-time occupancy data
- **alert_thresholds**: Occupancy limits
- **alert_logs**: Alert history

## 🔐 Authentication

The system uses JWT (JSON Web Tokens) for authentication:

1. Login with credentials
2. Receive access token and refresh token
3. Include access token in Authorization header
4. Refresh token when access token expires

```javascript
Authorization: Bearer <access_token>
```

## 👥 User Roles

- **Super Admin**: Full system access
- **Admin**: Tenant-level management
- **Manager**: Branch-level operations
- **Viewer**: Read-only access

## 🎨 Frontend Technologies

- React 18
- React Router
- Axios
- Tailwind CSS
- Lucide Icons
- Chart.js

## 🛠️ Backend Technologies

- Node.js
- Express.js
- Sequelize ORM
- MySQL
- JWT Authentication
- Joi Validation
- Helmet (Security)
- Rate Limiting

## 📊 AI Technologies

- Python
- OpenCV
- YOLO (Object Detection)
- TensorFlow/PyTorch
- NumPy

## 🧪 Testing

```bash
# Backend tests
npm test

# Frontend tests
cd frontend && npm test
```

## 📦 Deployment

### Production Build

```bash
# Backend
NODE_ENV=production npm start

# Frontend
npm run build
```

### Docker Deployment

```bash
docker-compose up -d
```

## 🔧 Configuration

Key environment variables:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database credentials
- `JWT_SECRET`: JWT signing secret
- `CORS_ORIGIN`: Allowed frontend origin

## 📝 License

MIT License

## 👤 Author

Your Name

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Show your support

Give a ⭐️ if this project helped you!