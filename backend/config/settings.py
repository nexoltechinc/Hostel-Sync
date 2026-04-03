import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def dedupe(values):
    seen = set()
    items = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            items.append(value)
    return items


def normalize_origin(value):
    if not value:
        return None

    origin = value.strip().rstrip("/")
    if not origin or origin.startswith("/"):
        return None
    if "://" in origin:
        return origin
    return f"https://{origin}"


def parse_database_url(database_url):
    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("DATABASE_URL must start with postgres:// or postgresql://")

    config = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path.lstrip("/")),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or ""),
    }

    query_options = {key: value for key, value in parse_qsl(parsed.query)}
    if query_options:
        config["OPTIONS"] = query_options

    return config

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = dedupe(
    env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
    + [
        host
        for host in (
            os.getenv("VERCEL_URL"),
            os.getenv("VERCEL_PROJECT_PRODUCTION_URL"),
        )
        if host
    ]
)


INSTALLED_APPS = [
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    "accounts",
    "hostels",
    "members",
    "rooms",
    "allotments",
    "billing",
    "attendance",
    "notifications",
    "reports",
    "system_settings",
    "audit",
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


database_engine = os.getenv("DATABASE_ENGINE", "postgresql").lower()
database_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

if database_url:
    DATABASES = {
        "default": parse_database_url(database_url),
    }
elif database_engine == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / os.getenv("SQLITE_DB_NAME", "db.sqlite3"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "hostel_manager"),
            "USER": os.getenv("POSTGRES_USER", "postgres"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "postgres"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.getenv("HOSTEL_TIMEZONE", "UTC")

USE_I18N = True

USE_TZ = True


STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

CORS_ALLOWED_ORIGINS = dedupe(
    env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
    + [
        origin
        for origin in (
            normalize_origin(os.getenv("FRONTEND_URL")),
            normalize_origin(os.getenv("VERCEL_URL")),
            normalize_origin(os.getenv("VERCEL_PROJECT_PRODUCTION_URL")),
        )
        if origin
    ]
)
CSRF_TRUSTED_ORIGINS = dedupe(
    env_list("CSRF_TRUSTED_ORIGINS", "http://localhost:3000")
    + [
        origin
        for origin in (
            normalize_origin(os.getenv("FRONTEND_URL")),
            normalize_origin(os.getenv("VERCEL_URL")),
            normalize_origin(os.getenv("VERCEL_PROJECT_PRODUCTION_URL")),
        )
        if origin
    ]
)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": False,
}
