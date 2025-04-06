# Use the official Python 3.13.2 Alpine image as a base image
FROM python:3.13.2-alpine3.21

# Set the working directory in the container
WORKDIR /app

# Update apk and install build dependencies
RUN apk update && apk add --no-cache gcc musl-dev build-base

# Copy the requirements file to the container
COPY requirements.txt .

# Upgrade pip and install dependencies from requirements.txt
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code to the container
COPY . .

# # Set the command to run your FastAPI application using Uvicorn
# CMD ["uvicorn", "main:app", "--host", "::", "--port", "8000"]
