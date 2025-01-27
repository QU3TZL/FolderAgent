# Deployment Guide

## Render.com Configuration

### Environment Setup
- Node Version: 18.19.0
- Port: 10000 (fixed port to prevent Next.js port detection issues)

### Build Command
```bash
export NODE_VERSION=18.19.0 && export NODE_OPTIONS=--max_old_space_size=4096 && export PORT=10000 && npm install && npm run build && echo "Build complete. Contents of .next:" && ls -la .next && pwd
```

### Start Command
```bash
cd /opt/render/project/src/chat-ui && npx next start -p 10000
```

### Environment Variables
Required environment variables in render.com:
```yaml
NODE_ENV: production
PORT: 10000
NEXT_PUBLIC_API_URL: https://upgrade-alpha-api.onrender.com
NEXT_PUBLIC_VECTORIA_URL: https://upgrade-vectoria.onrender.com
NEXT_PUBLIC_SUPABASE_URL: https://totvojqjmqpojjablvyv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY: [your-key-here]
```

### Build Filters
Include paths:
```
chat-ui/**
```

Ignore paths:
```
**/*.py
**/requirements.txt
src/**
wsgi.py
```

## Important Notes
1. The fixed port (10000) is crucial for stable deployment on Render.com with Next.js
2. The explicit `cd` in the start command ensures we're in the correct directory
3. Memory settings (`max_old_space_size=4096`) prevent build OOM issues
4. Build verification steps help debug deployment issues if they occur 