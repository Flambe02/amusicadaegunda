# 🚀 Supabase Web Push Setup Guide - Música da Segunda

## 📋 Overview
Complete implementation of Web Push notifications using Supabase Edge Functions with Brazilian Portuguese (pt-BR) defaults.

## 🏗️ What's Been Implemented

### ✅ **Files Created**
- `supabase/functions/push/index.ts` - Edge Function with 3 routes
- `supabase/functions/push/README.md` - Function documentation
- `supabase/config.toml` - Supabase configuration
- `supabase/migrations/20241230000000_create_push_subscriptions.sql` - Database schema
- `env.example` - Environment variables template
- `deploy-push.ps1` - PowerShell deployment script
- `SUPABASE_PUSH_SETUP.md` - This setup guide

### ✅ **Features Implemented**
- **3 API Routes**: subscribe, unsubscribe, send
- **pt-BR Defaults**: Brazilian Portuguese notifications
- **Full CORS Support**: Configurable origins
- **Database Integration**: Supabase table with indexes
- **Error Handling**: Automatic cleanup of invalid subscriptions
- **Locale Support**: pt-BR, fr, en

## 🔑 VAPID Keys (Already Generated)

```env
# Frontend (.env file)
VITE_VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw

# Supabase (secrets)
VAPID_PRIVATE_KEY=8_BfV3CxPoLgiCq4UnprD94oa6BYaRyRhentLVCRFlA
```

## 🚀 **DEPLOYMENT STEPS**

### **Step 1: Install Supabase CLI**
```bash
npm install -g supabase
```

### **Step 2: Initialize Supabase Project**
```bash
supabase init
```

### **Step 3: Set Environment Secrets**
```bash
# Replace <project> with your actual Supabase project reference
supabase secrets set SUPABASE_URL=https://<project>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
supabase secrets set ALLOWED_ORIGIN=https://amusicadasegunda.com
supabase secrets set VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
supabase secrets set VAPID_PRIVATE_KEY=8_BfV3CxPoLgiCq4UnprD94oa6BYaRyRhentLVCRFlA
supabase secrets set PUSH_DEFAULT_LOCALE=pt-BR
```

### **Step 4: Deploy the Function**
```bash
supabase functions deploy push --no-verify-jwt
```

### **Step 5: Create Database Table**
Run the migration SQL in your Supabase dashboard:
```sql
-- The complete SQL is in: supabase/migrations/20241230000000_create_push_subscriptions.sql
```

### **Step 6: Update Frontend Environment**
Create `.env` file:
```env
VITE_VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
VITE_PUSH_API_BASE=https://<PROJECT-REF>.functions.supabase.co
```

## 🧪 **TESTING**

### **Test Send Notification**
```bash
curl -X POST "https://<PROJECT-REF>.functions.supabase.co/push/send" \
  -H "Content-Type: application/json" \
  -d '{"topic":"new-song","locale":"pt-BR","url":"/playlist"}'
```

### **Expected Response**
```json
{
  "ok": true,
  "sent": 0
}
```

## 🌍 **API Endpoints**

### **POST /push/subscribe**
- **Purpose**: Subscribe to push notifications
- **Body**: `{ subscription, topic, locale, vapidKeyVersion }`
- **Response**: `{ ok: true }`

### **DELETE /push/unsubscribe**
- **Purpose**: Unsubscribe from push notifications
- **Body**: `{ endpoint }`
- **Response**: `{ ok: true }`

### **POST/GET /push/send**
- **Purpose**: Send push notifications
- **Body**: `{ title?, body?, url?, tag?, topic?, locale?, icon?, badge? }`
- **Response**: `{ ok: true, sent: number }`

## 🎯 **Localization**

| Locale | Title | Body |
|--------|-------|------|
| **pt-BR** (default) | `"Música da Segunda"` | `"Nova música no ar 🎶"` |
| **fr** | `"Música da Segunda"` | `"Nouvelle chanson en ligne 🎶"` |
| **en** | `"Música da Segunda"` | `"New song is live 🎶"` |

## 🔧 **Configuration Options**

### **CORS Origins**
- **Production**: `https://amusicadasegunda.com`
- **Development**: Add `http://localhost:3000` if needed

### **Default Settings**
- **Locale**: `pt-BR`
- **Topic**: `new-song`
- **Tag**: `nova-musica`
- **URL**: `/playlist`

## 🚨 **Troubleshooting**

### **Common Issues**
1. **Function not found**: Check deployment status
2. **CORS errors**: Verify ALLOWED_ORIGIN setting
3. **Database errors**: Ensure table exists and migration ran
4. **VAPID errors**: Verify keys are correctly set

### **Debug Commands**
```bash
# Check function status
supabase functions list

# View function logs
supabase functions logs push

# Check secrets
supabase secrets list
```

## 📱 **Frontend Integration**

### **Already Configured**
- ✅ Service Worker handlers in `public/sw.js`
- ✅ Push utility in `src/lib/push.js`
- ✅ Push CTA component in `src/components/PushCTA.jsx`
- ✅ Brazilian Portuguese localization

### **No Changes Required**
- Frontend automatically uses new Supabase backend
- Service Worker handles notifications
- Users receive pt-BR notifications by default

## 🎉 **Success Indicators**

- ✅ Function deploys without errors
- ✅ Database table created successfully
- ✅ Frontend connects to new API
- ✅ Push notifications received in Portuguese
- ✅ iOS PWA users can subscribe (when installed)
- ✅ Android/Desktop users can subscribe immediately

## 🔄 **Rollback Plan**

### **Quick Disable**
```bash
supabase functions delete push
```

### **Restore Vercel Functions**
1. Re-enable push-api project on Vercel
2. Update environment variables back to Vercel URLs
3. No frontend changes needed

---

## 🏆 **IMPLEMENTATION COMPLETE!**

Your Música da Segunda PWA now has a complete Supabase-based Web Push system with:
- 🇧🇷 **Brazilian Portuguese defaults**
- 🚀 **Supabase Edge Functions**
- 🗄️ **Database persistence**
- 🔒 **VAPID security**
- 📱 **iOS/Android compatibility**
- 🌍 **Multi-language support**

**Ready for production deployment! 🎵**
