#!/usr/bin/env bash
# Exit the script if any command fails
set -o errexit

echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "🎨 Collecting static files..."
python manage.py collectstatic --no-input

echo "🛠️ Running database migrations..."
python manage.py migrate --noinput
