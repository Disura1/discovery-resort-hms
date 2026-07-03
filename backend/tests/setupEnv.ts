process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/hms_test";
process.env.REDIS_URL = "redis://localhost:6379/1";
process.env.JWT_ACCESS_SECRET = "test_access_secret_1234567890";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_1234567890";
process.env.CORS_ORIGIN = "*";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";
