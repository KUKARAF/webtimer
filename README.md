# WebTimer - Simple Timer API

A Flask-based web application that provides a simple timer API with SQLite storage and Docker support.

## Features

### Core Features
- **Create timers** with optional names via POST request
- **Get timer status** (including time left) by ID or name
- **Delete timers** by ID or name
- **List all active timers**
- **Persistent storage** using SQLite database
- **Dockerized** with volume for data persistence
- **Automatic cleanup** of expired timers
- **Alarm system** with audio notifications when timers expire

### Web Interface Features
- **HTMX-based UI** for real-time updates
- **Visual alarm indicators** for expired timers
- **Audio alarms** using Web Audio API
- **Mute button** to stop all active alarms
- **Dark mode** with automatic system preference detection
- **Persistent theme preference** using localStorage
- **Responsive design** for mobile and desktop

### Production Features
- **Health check endpoint** (`/health`) for monitoring
- **Rate limiting** to prevent abuse (200/day, 50/hour)
- **CORS support** for web client integration
- **Security headers** (XSS protection, CSP, etc.)
- **Comprehensive logging** with file rotation
- **Environment-based configuration** (dev/prod)
- **Docker health checks** for container orchestration
- **Reverse proxy ready** with proper header handling

## API Endpoints

### GET `/health` - Health Check

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00",
  "service": "webtimer"
}
```

### POST `/timers` - Create a new timer

**Request:**
```json
{
  "duration_seconds": 60,
  "name": "optional_timer_name"
}
```

**Response:**
```json
{
  "id": "generated-uuid",
  "name": "optional_timer_name",
  "duration_seconds": 60,
  "created_at": "2023-01-01T12:00:00",
  "expires_at": "2023-01-01T12:01:00"
}
```

### GET `/timers/<identifier>` - Get timer information

**Response:**
```json
{
  "id": "timer-uuid",
  "name": "timer_name",
  "duration_seconds": 60,
  "created_at": "2023-01-01T12:00:00",
  "expires_at": "2023-01-01T12:01:00",
  "time_left_seconds": 30
}
```

### DELETE `/timers/<identifier>` - Delete a timer

**Response:**
```json
{
  "message": "Timer deleted successfully"
}
```

### GET `/timers` - List all timers

**Response:**
```json
[
  {
    "id": "timer-uuid-1",
    "name": "timer_name_1",
    "duration_seconds": 60,
    "created_at": "2023-01-01T12:00:00",
    "expires_at": "2023-01-01T12:01:00",
    "time_left_seconds": 30
  },
  {
    "id": "timer-uuid-2",
    "name": "timer_name_2",
    "duration_seconds": 120,
    "created_at": "2023-01-01T12:05:00",
    "expires_at": "2023-01-01T12:07:00",
    "time_left_seconds": 90
  }
]
```

## Installation & Usage

### Prerequisites

- Docker
- Docker Compose

### Quick Start

1. **Clone the repository or copy the files**

2. **Build and start the container:**
   ```bash
   docker compose build
   docker compose up -d
   ```

3. **The API will be available at** `http://localhost:5000`

### Example Usage

```bash
# Create a timer
curl -X POST -H "Content-Type: application/json" -d '{"duration_seconds": 60, "name": "coffee_timer"}' http://localhost:5000/timers

# Check timer status
curl http://localhost:5000/timers/coffee_timer

# Delete timer
curl -X DELETE http://localhost:5000/timers/coffee_timer

# List all timers
curl http://localhost:5000/timers
```

## Configuration

The application uses environment variables for configuration:

- `DB_PATH`: Path to the SQLite database file (default: `/data/timers.db`)
- `FLASK_ENV`: Set to `production` or `development` (default: `production`)
- `FLASK_DEBUG`: Set to `true` or `false` (default: `false`)

### Production Configuration

For production deployment, create a `.env.production` file:

```env
FLASK_ENV=production
FLASK_DEBUG=false
DB_PATH=/data/timers.db
```

Then use it with Docker Compose:

```bash
docker compose --env-file .env.production up -d
```

## Data Persistence

The application uses a Docker volume named `timer_data` to persist the SQLite database across container restarts. The database file is stored at `/data/timers.db` inside the container.

## Production Deployment with Gunicorn

The application now uses **Gunicorn** as the production WSGI server instead of Flask's development server.

### Running in Production

```bash
docker compose build
docker compose up -d
```

The application will automatically use Gunicorn with the following configuration:
- **4 worker processes** using gevent for better I/O performance
- **Production-ready WSGI server** with proper process management
- **Automatic logging** to stdout/stderr
- **Graceful shutdown** support

### Key Files

- **`gunicorn.conf.py`**: Gunicorn configuration
- **`run_production.py`**: Production entry point
- **`run_development.py`**: Development entry point (for local testing)

### Running in Development

For development with auto-reload:

```bash
# Using the development script
python run_development.py

# Or with environment variables
FLASK_ENV=development FLASK_DEBUG=true python app.py
```

### Technical Differences

**Production (Gunicorn):**
- Uses `run_production.py` entry point
- Multiple worker processes for better performance and reliability
- Proper WSGI server with production-grade features
- No auto-reload (better for stability)
- Gevent workers for async I/O operations

**Development (Flask):**
- Uses `run_development.py` or direct `app.py`
- Single process with auto-reload
- Development server with debugging features
- Slower but easier for development

### Reverse Proxy Configuration

For production deployment with a reverse proxy (e.g., Nginx, Traefik, Caddy), ensure your proxy is configured to:

1. **Forward headers**: Pass `X-Forwarded-For`, `X-Forwarded-Proto`, and `Host` headers
2. **Handle WebSockets**: If needed for future functionality
3. **Enable HTTPS**: Terminate SSL at the proxy level
4. **Set appropriate timeouts**: Especially for long-running requests

### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name timer.osmosis.page;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        send_timeout 60s;
    }
    
    # Health check endpoint (optional)
    location /health {
        proxy_pass http://localhost:5000/health;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

### Docker Production Deployment

```bash
# Build production image
docker compose build

# Start in production mode
docker compose --env-file .env.production up -d

# View logs
docker compose logs -f

# Check health status
docker compose ps
```

### Scaling Considerations

For higher traffic, consider:

1. **Use a production WSGI server** like Gunicorn or uWSGI
2. **Add Redis for rate limiting** instead of in-memory storage
3. **Implement database connection pooling**
4. **Add monitoring and alerting** for the health endpoint
5. **Set up log rotation** for the application logs

## Development

To run the application locally without Docker:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

The application will be available at `http://localhost:5000` and will use a local `timers.db` file.

## Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Invalid input (missing duration, negative duration)
- **404 Not Found**: Timer not found
- **500 Internal Server Error**: Database or server errors

## License

This project is open source and available under the MIT License.