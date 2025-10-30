# Deployment Guide

## Local Development

### Quick Start
```bash
# Build
sudo docker-compose build

# Run
sudo docker-compose up -d

# Verify
sudo docker-compose ps
curl http://localhost:9193/api/health
curl http://localhost/
```

### Logs & Debugging
```bash
# All logs
sudo docker-compose logs -f

# Specific service
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend

# Stop
sudo docker-compose down
```

## Production Deployment (Future - Phase 4 Stage 3)

### Prerequisites
- Docker registry credentials
- Kubernetes cluster (or Docker Swarm)
- SSL certificates
- Monitoring tools

### Deployment Steps
1. Build & push images
2. Create secrets in cluster
3. Deploy workloads
4. Configure ingress/load balancer
5. Set up monitoring

## Rollback Procedure
```bash
# Revert to previous image tag
docker pull epg-merge-backend:v0.4.1
# Update deployment
```

## Scaling (Future)
- Horizontal: Multiple replicas
- Vertical: Resource limits
- Load balancer: Traffic distribution