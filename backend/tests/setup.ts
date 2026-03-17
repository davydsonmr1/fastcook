// Stub temporário de env configs para não quebrar nos testes sem .env
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.HOST = '127.0.0.1';
process.env.CORS_ORIGIN = '*';
process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key_ignore_this';
process.env.GROQ_API_KEY = 'test_groq_api_ignore_this';
