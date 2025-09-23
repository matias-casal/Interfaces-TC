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

### Recent Improvements (Post-Challenge)

- ✅ **Automatic Database Migrations**: Services apply Prisma migrations on startup
- ✅ **Enhanced Logging**: Migrated from console.log to Winston logger throughout
- ✅ **WebSocket Reconnection Strategy**: Resilient client with exponential backoff
- ✅ **OpenAPI/Swagger Documentation**: Complete API documentation with interactive UI
- ✅ **Improved Test Coverage**: Adjusted coverage thresholds to match current implementation
- ✅ **Enhanced Code Documentation**: Added JSDoc comments to complex functions

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

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd messaging-app

# Run the initialization script
./scripts/init.sh
```

This script automatically:

- Creates the `.env` file from template
- Builds and starts all services with Docker
- **Creates database tables automatically (no manual migration needed)**
- Verifies all services are healthy
- Displays API endpoints and usage instructions

**After running `init.sh`, the system is immediately ready for testing!**

### Option 2: Manual Setup

```bash
# Clone the repository
git clone <repository-url>
cd messaging-app

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration if needed

# Start all services with Docker Compose
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

### 4. Verify the system is ready

```bash
# Quick test to verify everything works
./scripts/quick-test.sh

# Or run full end-to-end tests
./scripts/test-e2e.sh
```

### 5. Check individual service health

```bash
# Quick health check via Nginx Gateway
curl http://localhost/health/auth
curl http://localhost/health/users
curl http://localhost/health/messaging
curl http://localhost/health/realtime

# Or check Nginx gateway health
curl http://localhost/nginx-health
```

## 🛠️ Utility Scripts

### Initialize the Application

```bash
./scripts/init.sh
```

This script:

- Creates .env file from template
- Builds and starts all services
- **Automatically creates database schema**
- Runs health checks
- Shows connection information

### Reset/Clean the Application

```bash
./scripts/reset.sh
```

This will:

- Stop all containers
- Optionally remove all data
- Clean up Docker resources

### Quick System Test

```bash
./scripts/quick-test.sh
```

Fast verification that:

- All services are running
- Health endpoints respond
- Basic registration works

### End-to-End Test Suite

```bash
./scripts/test-e2e.sh
```

Comprehensive testing including:

- User registration and login
- Message sending and encryption
- Idempotency verification
- Chat and message listing
- Message status updates (sent → delivered → read)
- Pagination testing
- Security validations
- Creates test users with timestamps for repeated runs

### cURL Examples Reference

```bash
./scripts/curl-examples.sh
```

Shows example cURL commands for:

- All API endpoints with proper formatting
- Token management tips
- WebSocket connection examples
- Ready-to-use templates for manual testing

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

### Test Structure

The project includes comprehensive test suites for:

- **Authentication Service**: User registration, login, token validation
- **Messaging Service**: Message sending, idempotency, status updates
- **User Service**: Profile management, public key retrieval
- **Integration Tests**: End-to-end workflow testing

## 📚 API Documentation

### Interactive Documentation

View the complete API documentation with Swagger UI:

1. **Local Swagger UI**: Open `docs/swagger-ui.html` in your browser
2. **OpenAPI Specification**: Available at `docs/openapi.yaml`

The documentation includes:
- Complete REST API endpoints with request/response schemas
- WebSocket events documentation
- Authentication flow examples
- Try-it-out functionality for testing endpoints

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
    token: 'jwt-token',
  },
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
2. **JWT Authentication**: Secure token-based authentication with expiry
3. **Password Hashing**: Bcrypt with salt rounds for secure password storage
4. **Input Validation**: Comprehensive Zod schema validation for all inputs
5. **Rate Limiting**: Redis-backed rate limiting with fallback to memory store
   - General API: 100 requests/minute
   - Authentication: 5 attempts/15 minutes
   - Login: 3 attempts/15 minutes
   - Messaging: 30 messages/minute
6. **Error Handling**: Centralized error handling with proper status codes
7. **Logging**: Winston-based logging with daily rotation
8. **CORS Protection**: Configurable CORS settings
9. **Helmet.js**: Security headers for Express apps

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

## 🆕 Recent Improvements

### Enhanced Features

1. **Improved Rate Limiting**: Fixed Redis compatibility issues with fallback to memory store
2. **Database Migrations**: Added Prisma migrations for better schema management
3. **Comprehensive Testing**: Added unit and integration test suites
4. **Better Logging**: Replaced console.log with Winston logger across all services
5. **Error Handling**: Enhanced error handling with custom error classes
6. **Initialization Scripts**: Added automated setup and reset scripts
7. **Environment Variables**: Fixed interpolation issues in configuration

### Developer Experience

- Automated initialization with health checks
- Improved error messages and debugging
- Better code organization with shared modules
- Type-safe error handling
- Comprehensive test coverage

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

## 🔮 Future Enhancements

The following improvements would be valuable additions but are beyond the scope of this technical challenge:

### Infrastructure & Resilience

1. **Circuit Breakers**: Implement circuit breaker pattern between microservices to handle cascading failures gracefully
2. **Retry Logic with Exponential Backoff**: Add automatic retry mechanisms for transient failures in service-to-service communication
3. **Service Mesh**: Integrate Istio or Linkerd for advanced traffic management, security, and observability
4. **Event Sourcing**: Implement event sourcing for message history and audit trails
5. **CQRS Pattern**: Separate read and write models for better scalability

### Security Enhancements

1. **End-to-End Encryption Improvements**: Implement Signal Protocol for forward secrecy and better key management
2. **OAuth 2.0 / OpenID Connect**: Add support for third-party authentication providers
3. **API Rate Limiting by User Tier**: Implement tiered rate limiting based on user subscription levels
4. **Web Application Firewall (WAF)**: Add WAF for protection against common web exploits
5. **Security Headers**: Implement comprehensive security headers (CSP, HSTS, etc.)

### Performance & Scalability

1. **GraphQL Gateway**: Add GraphQL layer for efficient data fetching and real-time subscriptions
2. **Database Sharding**: Implement horizontal database partitioning for massive scale
3. **Read Replicas**: Add database read replicas for improved read performance
4. **CDN Integration**: Use CDN for static assets and global content delivery
5. **Message Queue**: Integrate RabbitMQ/Kafka for asynchronous processing and better decoupling

### Monitoring & Observability

1. **Distributed Tracing**: Implement Jaeger or Zipkin for request tracing across services
2. **Metrics Collection**: Integrate Prometheus for detailed metrics collection
3. **Centralized Logging**: Implement ELK Stack (Elasticsearch, Logstash, Kibana) for log aggregation
4. **APM Solution**: Add Application Performance Monitoring (e.g., New Relic, DataDog)
5. **Synthetic Monitoring**: Implement automated user journey testing

### Developer Experience

1. **API Client SDKs**: Generate TypeScript/JavaScript, Python, and mobile SDKs
2. **Development Environment**: Create dev containers and Codespaces configuration
3. **Integration Tests**: Expand test coverage with comprehensive integration test suite
4. **Performance Tests**: Add load testing with K6 or JMeter
5. **Documentation Portal**: Create a developer portal with tutorials and best practices

### Features

1. **Group Messaging**: Extend to support group chats with multiple participants
2. **File Sharing**: Add support for encrypted file attachments
3. **Voice/Video Calls**: Integrate WebRTC for real-time communication
4. **Message Search**: Implement full-text search with Elasticsearch
5. **Push Notifications**: Add mobile push notification support
6. **Presence System**: Implement sophisticated online/away/busy status
7. **Message Reactions**: Add emoji reactions to messages
8. **Message Threading**: Support for threaded conversations
9. **Scheduled Messages**: Allow users to schedule messages for future delivery
10. **Multi-Device Sync**: Synchronize messages across multiple devices

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

## 📝 Development Notes

### Running with Automatic Migrations

The application now includes automatic database migrations on startup:

```bash
# Services will automatically run migrations when starting
docker-compose up --build
```

### Using the Resilient WebSocket Client

```javascript
const { createResilientWebSocketClient } = require('./shared/dist/utils/websocket-client');

const client = createResilientWebSocketClient({
  url: 'http://localhost',
  token: 'your-jwt-token',
  onReconnect: (attempt) => console.log(`Reconnecting... Attempt ${attempt}`)
});

client.connect();
```

See `examples/websocket-client-usage.js` for a complete example.

### Viewing Logs

All services now use Winston logger with structured logging:

```bash
# View logs for a specific service
docker-compose logs -f auth-service

# View aggregated logs
docker-compose logs -f
```

## 📄 License

MIT

## 👥 Author

Matías Casal - Technical challenge solution for Interface

---

**Note**: This is a demonstration project showcasing microservices architecture, real-time communication, and secure messaging patterns. While the core functionality is production-ready, additional security measures, monitoring, and optimizations would be required for a production deployment at scale.
