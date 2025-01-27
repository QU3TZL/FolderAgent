# FolderAgent

FolderAgent is a Next.js application that provides a chat interface for UpGrade folders, allowing users to have conversations about their documents using AI.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## API Documentation

The API is documented using OpenAPI (Swagger) specification. You can find the full API documentation in `openapi.yaml`.

### Key Endpoints

- `POST /api/chat`: Send queries to chat about folder contents
- `GET /api/folder/{folder_id}/vectorization-status`: Check document processing status
- `GET /health`: Service health check

### Authentication

All endpoints require a Bearer token obtained from UpGrade authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Environment Variables

Create a `.env.local` file for development:

```env
# Development Environment
VECTORIA_INTERNAL_URL=http://localhost:3000
NEXT_PUBLIC_UPGRADE_URL=http://localhost:8000
NEXT_PUBLIC_UPGRADE_API_URL=http://localhost:8000
BASE_PATH=/chat
PORT=3000
NODE_ENV=development
```

For production, these are configured in Render.com.

## Deployment

This application is deployed on Render.com. The deployment configuration is in `render.yaml`.

### Requirements

- Node.js 18+
- Access to UpGrade and Vectoria services
- Google Drive API credentials

### Production Setup

1. Create a new Web Service in Render
2. Connect your repository
3. The `render.yaml` will automatically configure:
   - Build and start commands
   - Environment variables
   - Health checks
   - Service connections

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

- [UpGrade Documentation](https://tryupgrade.live/docs)
- [Render.com Documentation](https://render.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
