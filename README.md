# urNext

A web application that allows couples to share and manage their watchlist of movies and TV shows. Built with React, TypeScript, and Firebase.

## Features

- Shared watchlist for couples
- Turn-based movie/TV show selection
- Currently watching section
- Google authentication
- Real-time updates
- Email invitations for partners
- Rating and commenting system

## Tech Stack

- React
- TypeScript
- Material-UI
- Firebase (Authentication, Firestore, Functions, Hosting)
- SendGrid for email notifications

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd functions && npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_TMDB_API_KEY=your_tmdb_api_key
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

## License

MIT
