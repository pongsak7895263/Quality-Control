#!/bin/bash
echo "⬇️  Pulling latest code..."
git pull origin main

echo "📦 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "🚀 Restarting Backend..."
cd backend
npm install
pm2 restart qc-backend
cd ..

echo "✅ Update Complete!"
