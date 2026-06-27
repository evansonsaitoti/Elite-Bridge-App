# Elite Bridge Mobile App

This is the separate Expo / React Native mobile app for Elite Bridge employers.

## Run locally

```bash
cd mobile-app
npm install
npm start
```

Then scan the QR code with Expo Go on your phone.

## Important

Update the backend API URL in `app.json`:

```json
"apiUrl": "https://YOUR-BACKEND-URL.vercel.app/api"
```

After the backend is deployed, replace the placeholder with the real backend URL.

## Screens included

- Welcome
- Sign In
- Create Account
- Employer Dashboard
- Post Shift
