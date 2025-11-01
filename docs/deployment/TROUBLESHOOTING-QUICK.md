# Quick Troubleshooting

## Docker Issues

### Port already in use
```bash
sudo lsof -ti :9193 | xargs kill -9
sudo docker-compose up -d
```

### Container won't start
```bash
sudo docker-compose logs backend
sudo docker-compose logs frontend
```

### Permission denied on /config
→ Already fixed in Dockerfile, shouldn't happen

## Test Issues

### Tests failing locally
```bash
cd frontend
rm package-lock.json
npm install
npm test
```

### 64 tests should pass
```bash
npm test                    # All tests
npm test -- --coverage     # With coverage
npm test -- frontend.test.js # Frontend only
npm test -- integration.test.js # Integration only
```

## Git Issues

### Need to revert commit
```bash
git reset --soft HEAD~1
```

### Wrong branch
```bash
git checkout main
```

### Uncommitted changes blocking
```bash
git stash
git stash pop  # Later
```