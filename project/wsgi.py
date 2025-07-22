"""
WSGI config for project project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
os.environ.setdefault('DJANGO_ALLOWED_HOSTS', '.vercel.app')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
application = get_wsgi_application()

# Vercel expects a variable named 'app'
app = application