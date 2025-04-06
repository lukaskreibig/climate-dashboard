# Use the official Python 3.10.16 slim image as a base image
FROM python:3.13.2-slim-bookworm

# Set the working directory in the container
WORKDIR /app

# Install build dependencies (optional: you might need these for some packages)
RUN apt-get update && apt-get install -y gcc build-essential

# Copy the requirements file to the container
COPY requirements.txt .

# Upgrade pip and install dependencies from requirements.txt
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code to the container
COPY . .

# Expose the port that Uvicorn will run on (adjust as needed)
EXPOSE 8000