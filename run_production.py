#!/usr/bin/env python3
"""
Production entry point for WebTimer using Gunicorn
"""

import os
import sys
from app import app, init_db

# Initialize database
init_db()

# Create the WSGI application
application = app

if __name__ == "__main__":
    # This will be called when running with gunicorn
    print("WebTimer production server starting...")
    print(f"Database path: {os.environ.get('DB_PATH', 'timers.db')}")
    print("Listening on 0.0.0.0:5000")