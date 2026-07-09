process.env.NODE_ENV = "test";
process.env.PORT = "4000";

process.env.DATABASE_URL = "postgresql://hms_user:Chathu@localhost:5432/hms_dev";
process.env.REDIS_URL = "redis://localhost:6379/1";

process.env.JWT_ACCESS_SECRET = "test-secret-access-token-key";
process.env.JWT_REFRESH_SECRET = "test-secret-refresh-token-key";
process.env.ACCESS_TOKEN_TTL = "15m";
process.env.REFRESH_TOKEN_TTL_DAYS = "30";

process.env.JWT_GUEST_ACCESS_SECRET = "test-secret-guest-access-key";
process.env.JWT_GUEST_REFRESH_SECRET = "test-secret-guest-refresh-key";
process.env.GUEST_ACCESS_TOKEN_TTL = "30m";
process.env.GUEST_REFRESH_TOKEN_TTL_DAYS = "90";
process.env.GUEST_OTP_TTL_MINUTES = "10";

process.env.SMTP_HOST = "";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.SMTP_FROM =
  "Discovery-Resort-Muwanthanna <no-reply@discoveryresortmuwanthanna.test>";
process.env.SMTP_SECURE = "false";

process.env.STRIPE_SECRET_KEY = "";
process.env.STRIPE_WEBHOOK_SECRET = "";
process.env.CORS_ORIGIN = "*";

process.env.S3_ENDPOINT = "http://localhost:9000";
process.env.S3_REGION = "us-east-1";
process.env.S3_BUCKET = "hms-media-test";
process.env.S3_ACCESS_KEY_ID = "minioadmin";
process.env.S3_SECRET_ACCESS_KEY = "minioadmin";
process.env.S3_FORCE_PATH_STYLE = "true";
process.env.S3_PUBLIC_BASE_URL = "http://localhost:9000/hms-media-test";