# Dockerized 3-Tier Web Application with CI/CD and Azure Deployment

## Project Overview

This project demonstrates a **production-ready 3-tier web application** architecture using:

- **Frontend:** Vue.js / React.js served via Nginx  
- **Backend:** Node.js API  
- **Database:** MySQL  
- **Cache:** Redis  
- **Deployment:** Docker, Docker Compose, Azure Linux VM  
- **CI/CD:** GitHub Actions  
- **Networking:** Only port 80 is publicly exposed; backend, database, and cache are internal

The goal is to deploy a secure, scalable web application accessible via: http://20.90.13.194/

with **no ports other than 80 exposed**.

## Architecture
Internet
↓
Azure Public IP :80
↓
Frontend (Nginx container)
↓
Backend (Node.js container, internal only)
↓
MySQL (internal only)
↓
Redis (internal only)


# Key Design Decisions:

- Frontend exposes port 80  
- Backend, MySQL, Redis are internal only  
- Docker internal networking handles inter-service communication  
- Nginx reverse proxy handles `/api` requests to backend  
- CI/CD automates build, push, and deployment  

---

# Prerequisites

- Docker & Docker Compose installed locally
- Docker Hub account
- Azure subscription
- GitHub account for CI/CD
- SSH key pair for VM access

---

# Step 1: Backend Dockerization

Create `backend/Dockerfile`:

dockerfile
FROM node:20-alpine
WORKDIR /app
COPY ./code/package*.json ./
RUN npm install
COPY ./code .
CMD ["npm", "start"]

Purpose:

Creates a portable backend container

Ensures consistent Node.js runtime

Avoids “works on my machine” issues

Step 2: Frontend Dockerization (Multi-stage)

Create frontend/Dockerfile:

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY ./code/package*.json ./
RUN npm install
COPY ./code .
COPY .env .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./code/nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

Purpose:

Multi-stage reduces image size

Nginx serves static frontend files

Prepares for reverse proxy with backend

Step 3: Nginx Reverse Proxy Configuration

frontend/code/nginx/nginx.conf:

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/nginx/access.log main;

    upstream backend {
        server backend:3000;
    }

    server {
        listen 80;
        server_name _;

        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api/ {
            proxy_pass http://backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}

Purpose:

All /api/ requests are forwarded to the backend container internally

Frontend static files served to browser

Only port 80 exposed

Step 4: Docker Compose Configuration

docker-compose.yml:

version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

  backend:
    build:
      context: ./backend
    expose:
      - "3000"
    env_file:
      - ./backend/.env
    depends_on:
      - mysql
      - redis
    restart: always

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: admin123
      MYSQL_DATABASE: schooldb
      MYSQL_USER: admin
      MYSQL_PASSWORD: admin123
    volumes:
      - ./mysql_data:/var/lib/mysql
    expose:
      - "3306"
    restart: always

  redis:
    image: redis:alpine
    volumes:
      - ./redis_data:/data
    expose:
      - "6379"
    restart: always

Notes:

Frontend is the only public-facing service

Backend, MySQL, Redis are internal

Volumes persist database and cache data

Step 5: Build & Push Docker Images
Build Images Locally:
docker build -t <username>/school-backend:v1 ./backend
docker build -t <username>/school-frontend:v1 ./frontend
Login to Docker Hub:
docker login
Push Images:
docker push <username>/school-backend:v1
docker push <username>/school-frontend:v1
Step 6: Provision Azure Linux VM
az vm create \
  --resource-group three-tier-app \
  --name schoolVM \
  --image Ubuntu2204 \
  --admin-username azureuser \
  --ssh-key-value ~/.ssh/school_vm_key.pub

Open port 80 only:

az vm open-port --resource-group three-tier-app --name schoolVM --port 80
Step 7: Deploy on VM Using Docker Compose

SSH into VM:

ssh -i ~/.ssh/school_vm_key azureuser@<public-ip>

Pull images from Docker Hub:

docker pull <username>/school-backend:v1
docker pull <username>/school-frontend:v1

Use production docker-compose:

# Replace build: with image: in prod file
frontend:
  image: <username>/school-frontend:v1
  ports: "80:80"
backend:
  image: <username>/school-backend:v1

Start services:

docker-compose -f docker-compose.prod.yml up -d
Step 8: Environment Variables

Backend .env:

DB_HOST=mysql
DB_USER=admin
DB_PASSWORD=admin123
DB_NAME=schooldb
REDIS_URL=redis://redis:6379

Frontend .env:

VITE_API_URL=/api
VITE_ENV=production

Backend secrets never exposed to frontend

Step 9: CI/CD with GitHub Actions

.github/workflows/deploy.yml:

Checkout code

Login to Docker Hub

Build images

Push images to Docker Hub

SSH into Azure VM

Pull images & restart containers

GitHub Secrets Required:

DOCKER_USERNAME

DOCKER_PASSWORD

VM_IP

SSH_PRIVATE_KEY

Step 10: Verification

Open browser:

http://<public-ip>

Test API endpoint:

http://<public-ip>/api/health

Only port 80 should be open publicly

Step 11: Security Best Practices

Only frontend port exposed

Backend, MySQL, Redis internal

Environment secrets not hardcoded in repo

Nginx reverse proxy enforces internal routing

Docker networks isolate services

Step 12: Folder Structure
project-root/
├─ backend/
│  ├─ Dockerfile
│  ├─ code/
│  └─ .env
├─ frontend/
│  ├─ Dockerfile
│  ├─ code/
│  ├─ nginx/
│  │  └─ nginx.conf
│  └─ .env
├─ docker-compose.yml
├─ docker-compose.prod.yml
├─ mysql_data/
├─ redis_data/
└─ .github/
   └─ workflows/
      └─ deploy.yml
Step 13: Conclusion

This project demonstrates:

Containerization using Docker

Multi-tier architecture with proper internal/external separation

CI/CD automation with GitHub Actions

Deployment to a secure Azure VM

Production-level reverse proxy with Nginx

Accessible via:

http://<public-ip>

Only port 80 is open publicly, ensuring a secure, production-ready deployment.

Author:
Ugochukwu Samuel
Cloud Engineer|DevOps Enthusiast
