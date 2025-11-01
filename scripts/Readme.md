# SmartEye AI - People Counting System

> AI-powered real-time people counting and occupancy management system

## 🎯 Features

- ✅ **Real-time People Counting** - Track entries and exits in real-time using AI
- 📹 **Multi-Camera Support** - Manage multiple IP/RTSP cameras across locations
- 🏢 **Multi-Tenant Architecture** - Support multiple organizations and branches
- 🔷 **Custom Zone Configuration** - Define counting zones with polygon mapping
- 🚨 **Smart Alerts** - Automated notifications when occupancy thresholds exceeded
- 📊 **Analytics Dashboard** - Comprehensive analytics and reporting
- 👥 **Role-Based Access Control** - Super Admin, Admin, Manager, Viewer roles
- 📈 **Export Reports** - Generate PDF/Excel reports
- 🔄 **Real-time Updates** - WebSocket support for live data
- 🔐 **Secure Authentication** - JWT-based authentication with refresh tokens

## 🏗️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **Sequelize** - ORM
- **Winston** - Logging
- **JWT** - Authentication
- **Socket.IO** - Real-time communication

### Frontend
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide Icons** - Icons

### AI Module
- **Python** - AI processing
- **YOLO** - Object detection
- **OpenCV** - Computer vision
- **DeepSORT** - Object tracking

## 📋 Prerequisites

- **Node.js** >= 16.0.0
- **MySQL** >= 8.0
- **Python** >= 3.8 (for AI module)
- **npm** >= 8.0.0

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd smarteye-ai
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smarteye_ai

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=1h
```

### 4. Create Database

```sql
CREATE DATABASE smarteye_ai;
```

### 5. Initialize Database

```bash
# Sync database tables
npm run db:sync

# Seed with test data
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

## 📚 API Endpoints

### Authentication
```
POST   /api/auth/login          - User login
POST   /api/auth/register       - Register new user
POST   /api/auth/refresh        - Refresh access token
POST   /api/auth/logout         - User logout
```

### Cameras
```
GET    /api/cameras             - Get all cameras
POST   /api/cameras             - Create camera
GET    /api/cameras/:id         - Get camera by ID
PUT    /api/cameras/:id         - Update camera
DELETE /api/cameras/:id         - Delete camera
PUT    /api/cameras/:id/status  - Update camera status
```

### Branches
```
GET    /api/branches            - Get all branches
POST   /api/branches            - Create branch
GET    /api/branches/:id        - Get branch by ID
PUT    /api/branches/:id        - Update branch
DELETE /api/branches/:id        - Delete branch
```

### Zones
```
GET    /api/zones               - Get all zones
POST   /api/zones               - Create zone
GET    /api/zones/:id           - Get zone by ID
PUT    /api/zones/:id           - Update zone
DELETE /api/zones/:id           - Delete zone
GET    /api/zones/camera/:id    - Get zones by camera
```

### People Count
```
GET    /api/people-count                    - Get count logs
POST   /api/people-count                    - Create count entry
GET    /api/people-count/stats              - Get statistics
GET    /api/people-count/current-occupancy  - Get current occupancy
GET    /api/people-count/hourly             - Get hourly statistics
```

### Alerts
```
GET    /api/alerts                  - Get alert logs
POST   /api/alerts/threshold        - Create alert threshold
GET    /api/alerts/threshold/:id    - Get threshold by ID
PUT    /api/alerts/threshold/:id    - Update threshold
DELETE /api/alerts/threshold/:id    - Delete threshold
PUT    /api/alerts/:id/resolve      - Resolve alert
```

### Dashboard
```
GET    /api/dashboard/stats         - Get dashboard statistics
GET    /api/dashboard/occupancy     - Get occupancy trends
GET    /api/dashboard/alerts        - Get recent alerts
```

### Reports
```
POST   /api/reports/generate        - Generate report
GET    /api/reports/occupancy       - Get occupancy report
GET    /api/reports/alerts          - Get alert report
GET    /api/reports/export          - Export report (PDF/Excel)
```

## 🗄️ Database Schema

### Core Tables

**tenants**
- tenant_id (PK)
- tenant_name
- tenant_code (Unique)
- contact_email
- subscription_type
- is_active

**branches**
- branch_id (PK)
- tenant_id (FK)
- branch_name
- branch_code
- address, city, state
- timezone
- is_active

**users**
- user_id (PK)
- tenant_id (FK)
- username, email (Unique)
- password_hash
- role (super_admin, admin, manager, viewer)
- is_active

**cameras**
- camera_id (PK)
- tenant_id (FK)
- branch_id (FK)
- camera_name, camera_code
- camera_type (IP, RTSP, USB, etc.)
- stream_url
- fps, resolution
- is_active

**zone_configs**
- zone_id (PK)
- camera_id (FK)
- zone_name
- polygon_json (Counting zone coordinates)
- entry_direction
- is_active

**people_count_logs**
- log_id (PK)
- camera_id (FK)
- zone_id (FK)
- direction (IN/OUT)
- detection_time
- confidence_score

**current_occupancy**
- occupancy_id (PK)
- camera_id (FK)
- current_count
- total_entries
- total_exits
- last_updated

**alert_thresholds**
- threshold_id (PK)
- camera_id (FK)
- max_occupancy
- alert_enabled
- notification_email

**alert_logs**
- alert_id (PK)
- threshold_id (FK)
- current_occupancy
- alert_time
- status (triggered/resolved)

## 🔐 Authentication Flow

1. **Login**: POST `/api/auth/login` with credentials
2. **Receive Tokens**: Get `accessToken` and `refreshToken`
3. **Use Access Token**: Include in Authorization header
4. **Refresh**: Use refresh token when access token expires

```javascript
// Request Headers
Authorization: Bearer <access_token>
```

## 👥 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full system access, manage all tenants |
| **Admin** | Manage tenant settings, users, cameras |
| **Manager** | View/edit cameras, zones, reports |
| **Viewer** | Read-only access to dashboards |

## 📦 NPM Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm start                # Start production server

# Database
npm run db:sync          # Sync tables (safe mode)
npm run db:sync:alter    # Update existing tables
npm run db:sync:force    # Drop and recreate all tables (⚠️ data loss)
npm run db:seed          # Seed with test data
npm run db:reset         # Force sync + seed (complete reset)

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Fix code style issues
```

## 🎨 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── cameraController.js
│   │   ├── branchController.js
│   │   └── ...
│   ├── models/
│   │   ├── index.js             # Model associations
│   │   ├── Camera.js
│   │   ├── Tenant.js
│   │   └── ...
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── camera.routes.js
│   │   └── ...
│   ├── services/
│   │   ├── cameraService.js     # Business logic
│   │   ├── aiIngestService.js
│   │   └── ...
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── validators/
│   │   └── index.js             # Joi validation schemas
│   ├── utils/
│   │   ├── logger.js            # Winston logger
│   │   └── responseHandler.js   # Response utilities
│   └── server.js                # Entry point
├── scripts/
│   ├── syncDatabase.js          # DB sync script
│   └── seedDatabase.js          # DB seeder
├── logs/                        # Application logs
├── uploads/                     # File uploads
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🧪 Testing

### Default Test Credentials

After running `npm run db:seed`:

| Username | Password | Role |
|----------|----------|------|
| superadmin | admin123 | Super Admin |
| admin | admin123 | Admin |
| manager | admin123 | Manager |
| viewer | admin123 | Viewer |

### Test API

```bash
# Health Check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"admin123"}'
```

## 🚀 Deployment

### Production Build

1. Update environment variables for production
2. Set `NODE_ENV=production`
3. Configure proper database credentials
4. Use process manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/server.js --name smarteye-ai

# View logs
pm2 logs smarteye-ai

# Restart
pm2 restart smarteye-ai
```

### Docker Deployment

```bash
# Build image
docker build -t smarteye-ai .

# Run container
docker run -p 3000:3000 --env-file .env smarteye-ai
```

## 🔧 Configuration

### Environment Variables

Key configurations in `.env`:

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DB_HOST=your-db-host
DB_NAME=smarteye_ai
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# Security
JWT_SECRET=your-very-secure-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AI Processing
AI_MODEL_PATH=./models/yolov5s.pt
AI_CONFIDENCE_THRESHOLD=0.5
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check MySQL is running
sudo systemctl status mysql

# Verify credentials in .env
# Ensure database exists
mysql -u root -p -e "CREATE DATABASE smarteye_ai;"
```

**Module Alias Not Working**
```bash
# Ensure module-alias is installed
npm install module-alias

# Check package.json has _moduleAliases
```

**Camera Stream Not Working**
- Verify stream URL is correct
- Check camera is accessible on network
- Ensure firewall allows RTSP traffic

## 📝 License

MIT License - see LICENSE file for details

## 👤 Author

Your Name - [@yourhandle](https://twitter.com/yourhandle)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For support, email support@smarteye-ai.com or open an issue.

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

**Built with ❤️ using Node.js, React, and AI**