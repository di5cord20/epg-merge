# Troubleshooting Guide

## Docker Issues

### Container won't start
```bash
# Check logs
sudo docker-compose logs backend

# Common causes:
# 1. Port already in use
sudo lsof -ti :9193 | xargs kill -9

# 2. Permission denied on /config
# → Check Dockerfile has: RUN mkdir -p /config && chown -R appuser:appuser /config

# 3. FastAPI not installed
# → Verify: pip install -r requirements.txt
```

### Health check failing
```bash
# Check endpoint
curl http://localhost:9193/api/health

# Increase start_period in docker-compose.yml
healthcheck:
  start_period: 15s  # Was 5s
```

## Frontend Issues

### Blank page or 404
```bash
# Check nginx logs
sudo docker-compose logs frontend

# Verify build succeeded
docker exec epg-merge-frontend ls -la /usr/share/nginx/html/

# Check API connectivity
docker exec epg-merge-frontend curl http://backend:9193/api/health
```

### API connection errors
```bash
# Verify REACT_APP_API_BASE
docker exec epg-merge-frontend env | grep REACT_APP

# Should be: http://backend:9193
```

## Test Issues

### Tests failing locally
```bash
# Regenerate lock file
cd frontend
rm package-lock.json
npm install
npm test
```

### Permission denied during build
```bash
# Run with sudo
sudo docker-compose build --no-cache

# Or fix permissions
sudo chown -R $(whoami) .
```

## Performance Issues

### Slow builds
```bash
# Use cache
docker-compose build

# No cache (slower)
docker-compose build --no-cache

# Check disk space
df -h
```

### Memory/CPU issues
```bash
# Monitor usage
docker stats

# Limit resources in docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
```