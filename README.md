# Messaging App - Microservices Architecture

A scalable, secure messaging application built with microservices architecture, featuring end-to-end encryption, real-time message delivery, and comprehensive message management.

## 🚀 Features

### Core Functionality
- ✅ **User Authentication**: JWT-based authentication with secure password hashing
- ✅ **Unique Client Identification**: Each client has a unique ID and username
- ✅ **Private 1:1 Messaging**: Send and receive encrypted messages between users
- ✅ **Chat Management**: List all active chats and messages within each chat
- ✅ **End-to-End Encryption**: RSA-based message encryption (client-side implementation)

### Bonus Features
- ✅ **Real-time Delivery**: WebSocket-based soft real-time message delivery
- ✅ **Idempotent Message Ingestion**: Prevent duplicate messages with client-side message IDs
- ✅ **Message Status Tracking**: Sent/Delivered/Read status for all messages
- ✅ **Pagination**: Efficient pagination for chats and messages
- ✅ **Caching Layer**: Redis caching for improved performance
- ✅ **Health Monitoring**: Health check endpoints for all services

## 🏗️ Architecture

The application follows a microservices architecture pattern with the following services:

```
                        ┌─────────────┐
                        │    Nginx    │
                        │   Gateway   │
                        │   (Port 80) │
                        └──────┬──────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       │                                               │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│    Auth     │     │    User     │     │  Messaging  │     │  Real-time  │
│   Service   │     │   Service   │     │   Service   │     │   Service   │
│   (3001)    │     │   (3002)    │     │   (3003)    │     │   (3004)    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                    ┌────▼────┐            ┌──────▼──────┐
                    │         │            │             │
                    │  Redis  │            │ PostgreSQL  │
                    │  (6379) │            │   (5432)    │
                    └─────────┘            └─────────────┘
```

### API Gateway (Nginx)

All services are accessible through the **Nginx API Gateway on port 80**, which provides:

- **Unified Entry Point**: Single endpoint for all services
- **Load Balancing**: Ready for horizontal scaling
- **Sticky Sessions**: IP-hash based session persistence for WebSocket connections
- **Security**: Real-time service (port 3004) is not exposed externally
- **Request Routing**: Intelligent routing to appropriate microservices
- **Health Checks**: Consolidated health monitoring

### Service Responsibilities

1. **Auth Service** (Internal port 3001, accessible via `/auth/*`)
   - User registration and login
   - JWT token generation and validation
   - Password hashing and verification
   - Rate limiting on authentication endpoints

2. **User Service** (Internal port 3002, accessible via `/users/*`)
   - User profile management
   - Public key storage and retrieval
   - User listing and search
   - Redis caching for performance

3. **Messaging Service** (Internal port 3003, accessible via `/messages/*` and `/chats/*`)
   - Message sending and storage
   - Chat management and listing
   - Message status updates
   - Idempotency handling with client message IDs

4. **Real-time Service** (Internal port 3004, **only accessible via Nginx WebSocket proxy**)
   - WebSocket connections management with sticky sessions
   - Real-time message delivery
   - Online status tracking
   - Message status notifications
   - **Security Note**: Port 3004 is not exposed externally for security

## 🛠️ Technology Stack

- **Language**: TypeScript/Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Real-time**: Socket.io
- **Authentication**: JWT
- **Encryption**: RSA (Node.js crypto module)
- **Containerization**: Docker & Docker Compose
- **API Gateway**: Nginx with sticky sessions for WebSocket
- **Testing**: Jest & Supertest (90% coverage threshold)
- **Code Quality**: ESLint & Prettier
- **Logging**: Winston with daily rotation
- **Rate Limiting**: Redis-backed rate limiting

## 📋 Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd messaging-app
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration if needed
```

### 3. Start all services with Docker Compose
```bash
docker-compose up --build
```

#### Development Mode (Optional - Exposed Ports)
```bash
# To expose all service ports for debugging
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```
This exposes all service ports (3001-3004) directly for easier debugging

This will start:
- PostgreSQL database
- Redis cache
- Nginx API Gateway (port 80)
- Auth Service (internal)
- User Service (internal)
- Messaging Service (internal)
- Real-time Service (internal, WebSocket only via Nginx)

### 4. Run database migrations
```bash
# First time setup
docker-compose exec auth-service npx prisma migrate dev
```

### 5. Verify services are running
```bash
# Quick health check via Nginx Gateway
curl http://localhost/health/auth
curl http://localhost/health/users
curl http://localhost/health/messaging
curl http://localhost/health/realtime

# Or check Nginx gateway health
curl http://localhost/nginx-health
```

## 🧪 Testing

### Run Integration Tests
```bash
# Install dependencies
npm install

# Run integration tests
npm run test:integration
```

### Run Unit Tests
```bash
# Run tests for all services
npm test

# Run tests for specific service
cd auth-service && npm test
```

### Test Coverage
```bash
# Run tests with coverage report
npm run test:coverage

# Coverage thresholds: 60% branches, functions, lines, statements
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123!",
  "publicKey": "-----BEGIN PUBLIC KEY-----..."
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "username": "john_doe",
      "publicKey": "...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": { ... }
  }
}
```

### User Endpoints

#### Get User by Username
```http
GET /users/:username
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "user-id",
    "username": "john_doe",
    "publicKey": "...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Get User's Public Key
```http
GET /users/:username/public-key
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "publicKey": "-----BEGIN PUBLIC KEY-----..."
  }
}
```

### Messaging Endpoints

#### Send Message
```http
POST /messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "receiverUsername": "jane_doe",
  "encryptedText": "base64-encrypted-content",
  "clientMessageId": "unique-client-id"
}

Response:
{
  "success": true,
  "data": {
    "id": "message-id",
    "senderId": "sender-id",
    "receiverId": "receiver-id",
    "encryptedText": "...",
    "status": "sent",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### List Chats
```http
GET /chats?limit=50&offset=0
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "chatId": "user1-user2",
      "participants": ["user1-id", "user2-id"],
      "lastMessage": { ... },
      "unreadCount": 2
    }
  ]
}
```

#### Get Chat Messages
```http
GET /chats/:chatId/messages?limit=50&offset=0
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "message-id",
      "senderId": "sender-id",
      "receiverId": "receiver-id",
      "encryptedText": "...",
      "status": "read",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Update Message Status
```http
PATCH /messages/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "delivered" | "read"
}
```

### WebSocket Events

#### Connection (via Nginx Gateway)
```javascript
const socket = io('http://localhost', {
  auth: {
    token: 'jwt-token'
  }
});
```

#### Events

**Incoming Events:**
- `new_message` - Receive new message
- `message_status` - Message status update
- `user_typing` - Typing indicator

**Outgoing Events:**
- `mark_delivered` - Mark messages as delivered
- `mark_read` - Mark messages as read
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

## 🔐 Security Features

1. **End-to-End Encryption**: Messages are encrypted on the client-side using RSA
2. **JWT Authentication**: Secure token-based authentication
3. **Password Hashing**: Bcrypt with salt rounds for password storage
4. **Input Validation**: Zod schema validation for all inputs
5. **Rate Limiting**: (Recommended for production)
6. **HTTPS**: (Recommended for production)

## 🎯 Design Decisions & Trade-offs

### Why Microservices?
- **Scalability**: Each service can be scaled independently
- **Maintainability**: Separation of concerns makes code easier to maintain
- **Resilience**: Service failures are isolated
- **Trade-off**: Increased complexity and network overhead

### Why PostgreSQL + Redis?
- **PostgreSQL**: ACID compliance, complex queries for chat management
- **Redis**: Fast caching and pub/sub for real-time features
- **Trade-off**: Two databases to maintain vs single database simplicity

### Why Node.js/TypeScript?
- **Node.js**: Excellent for I/O operations and real-time features
- **TypeScript**: Type safety and better maintainability
- **Trade-off**: Single-threaded vs multi-threaded languages

### Why Simple RSA Encryption?
- **Simplicity**: Easy to implement and understand
- **Security**: Adequate for demonstration purposes
- **Trade-off**: No forward secrecy or key rotation (production would need Signal Protocol)

## 📈 Performance Optimizations

1. **Caching Strategy**: User profiles and public keys cached for 5 minutes
2. **Database Indexing**: Composite indexes on sender/receiver pairs
3. **Pagination**: All list endpoints support pagination
4. **Connection Pooling**: Database connection pooling via Prisma
5. **Redis Pub/Sub**: Efficient real-time message delivery

## 🚧 Production Considerations

For production deployment, consider:

1. **Container Orchestration**: Kubernetes or Docker Swarm for scaling
2. **Service Discovery**: Consul or service mesh for microservice communication
3. **Monitoring**: Prometheus + Grafana for metrics
4. **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
5. **Message Queue**: RabbitMQ or Kafka for async operations
6. **Enhanced Security**: HTTPS/TLS certificates with Let's Encrypt
7. **Secrets Management**: HashiCorp Vault or AWS Secrets Manager
8. **Database Replication**: Master-slave replication for PostgreSQL
9. **Distributed Tracing**: Jaeger or Zipkin for debugging
10. **CI/CD Pipeline**: GitHub Actions with automated deployments

## 🧩 Project Structure

```
messaging-app/
├── auth-service/          # Authentication service
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Auth, error, rate limiting
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API routes
│   │   ├── utils/         # JWT, crypto utilities
│   │   └── __tests__/     # Unit tests
│   └── prisma/            # Database schema
├── user-service/          # User management service
├── messaging-service/     # Message handling service
├── real-time-service/     # WebSocket service
├── shared/                # Shared utilities and types
├── nginx/                 # API Gateway configuration
├── docker-compose.yml     # Main Docker orchestration
├── docker-compose.dev.yml # Development overrides
├── docker-compose.prod.yml # Production config
├── test-integration.js    # Integration tests
└── README.md             # Documentation
```

## 📝 Development Workflow

1. **Make changes** to the code
2. **Run linting**: `npm run lint`
3. **Run tests**: `npm test`
4. **Build services**: `docker-compose build`
5. **Test locally**: `docker-compose up`
6. **Run integration tests**: `node test-integration.js`

## 🤝 Contributing

1. Follow the existing code style (enforced by ESLint/Prettier)
2. Write tests for new features
3. Update documentation
4. Ensure all tests pass
5. Keep commits atomic and descriptive

## 📄 License

MIT

## 👥 Author

Matías Casal - Technical challenge solution for Interface

---

**Note**: This is a demonstration project showcasing microservices architecture, real-time communication, and secure messaging patterns. For production use, additional security measures and optimizations would be required.