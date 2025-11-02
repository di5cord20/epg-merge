#!/bin/bash
set -e

echo "🚀 Setting up EPG Merge dev environment..."

# Backend setup
echo "📦 Backend: Installing Python dependencies..."
cd /workspace/backend
pip install -q --upgrade pip
pip install -q -r requirements.txt
pip install -q pytest pytest-cov black pylint

# Frontend setup
echo "📦 Frontend: Installing Node dependencies..."
cd /workspace/frontend
npm ci --silent
npm install -g --silent @vue/cli

# Create directories
echo "📁 Creating data directories..."
mkdir -p /workspace/backend/data
mkdir -p /workspace/backend/logs
chmod 755 /workspace/backend/data /workspace/backend/logs

# Create .env if missing
echo "⚙️  Checking environment configuration..."
if [ ! -f /workspace/.env ]; then
  cp /workspace/.env.example /workspace/.env
  echo "   Created .env from template - update as needed"
else
  echo "   ✓ .env already configured"
fi

# Display info
echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Available commands:"
echo "   cd backend && python main.py          # Run backend"
echo "   cd frontend && npm start              # Run frontend dev server"
echo "   npm test                              # Run tests"
echo "   docker compose up -d                  # Start full stack"
echo ""
echo "🌐 Access points:"
echo "   Frontend:  http://localhost:3000      (dev server)"
echo "   Backend:   http://localhost:9193      (API)"
echo "   Nginx:     http://localhost           (production)"
echo ""