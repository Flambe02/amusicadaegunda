# Push API - Vercel Functions

Backend API for Web Push notifications for Música da Segunda PWA.

## Deployment on Vercel

1. **Create new Vercel project** from this folder
2. **Set environment variables**:
   - `VAPID_PUBLIC_KEY` - Your VAPID public key
   - `VAPID_PRIVATE_KEY` - Your VAPID private key

## Generate VAPID Keys

Run locally to generate keys:

```bash
node -e "import('web-push').then(({default:wp})=>{const k=wp.generateVAPIDKeys();console.log(k);})"
```

## Environment Setup

1. Copy the **public key** to your main app's `.env`:
   ```
   VITE_VAPID_PUBLIC_KEY=<publicKeyFromGeneration>
   ```

2. Copy both keys to Vercel project environment:
   ```
   VAPID_PUBLIC_KEY=<publicKeyFromGeneration>
   VAPID_PRIVATE_KEY=<privateKeyFromGeneration>
   ```

3. After deployment, set in main app `.env`:
   ```
   VITE_PUSH_API_BASE=https://<your-vercel-project>.vercel.app/api
   ```

## API Endpoints

- `POST /api/push/subscribe` - Subscribe to push notifications
- `POST /api/push/send` - Send push notification to all subscribers

## Test Push Notification

```bash
curl -X POST "https://<your-vercel-project>.vercel.app/api/push/send" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nouvelle chanson 🎵","body":"Clique pour écouter","url":"/playlist"}'
```

## Notes

- Currently uses in-memory storage (replace with database in production)
- Subscriptions are deduplicated by endpoint
- Invalid subscriptions are automatically cleaned up
