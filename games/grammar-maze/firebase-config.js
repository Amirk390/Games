/* Englishia Grammar Maze — Firebase web config.
   Replace every YOUR_... value from the Firebase console (Project settings → your web app).
   This is the public web config, not a secret key. Database rules limit what it can do.
   Leave the YOUR_ placeholders in place until the project exists. */
try {
  window.FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
} catch (e) {}
