(function () {
  window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
    apiKey: "AIzaSyCDebi6IG_BEUTOkaGDd4FgkkCSSTUwQ8g",
    authDomain: "sginvest-dashboard.firebaseapp.com",
    projectId: "sginvest-dashboard",
    storageBucket: "sginvest-dashboard.firebasestorage.app",
    messagingSenderId: "234600933348",
    appId: "1:234600933348:web:94f478eba774a5fcd749f1",
    measurementId: "G-JTEQB84QKN"
  };

  if (!window.firebase) {
    console.error("Firebase SDK is not loaded.");
    return;
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(window.FIREBASE_CONFIG);
  }

  window.firebaseAuth = window.firebase.auth();
  window.firebaseDb = window.firebase.firestore();

  try {
    if (typeof window.firebase.analytics === "function") {
      window.firebaseAnalytics = window.firebase.analytics();
    }
  } catch (err) {
    console.warn("Firebase Analytics is not available in this environment.");
  }
})();
