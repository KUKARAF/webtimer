# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install curl and gevent for health checks and async workers
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Set environment variable for the database path
ENV DB_PATH=/data/timers.db

# Set environment variables for production
ENV FLASK_ENV=production
ENV FLASK_DEBUG=false

# Run Gunicorn when the container launches
CMD ["gunicorn", "--config", "gunicorn.conf.py", "run_production:application"]