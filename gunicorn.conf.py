import os

# Gunicorn configuration for WebTimer production deployment

# Server Socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker Processes
workers = 4  # Typically 2-4 x number of CPU cores
worker_class = "gevent"  # Use gevent for async workers (better for I/O bound apps)
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
graceful_timeout = 30
keepalive = 2

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process Name
proc_name = "webtimer"

# Security
def post_fork(server, worker):
    # Worker process initialization
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def pre_fork(server, worker):
    # Master process initialization
    pass

def pre_exec(server):
    # Master process initialization
    server.log.info("Master spawned (pid: %s)", os.getpid())

# Environment
raw_env = [
    "FLASK_ENV=production",
    "FLASK_DEBUG=false"
]

# Performance
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190