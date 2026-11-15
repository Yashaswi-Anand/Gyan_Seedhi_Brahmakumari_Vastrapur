/* Firebase connection (project: gyan-seedhi, Firestore in asia-south1 / Mumbai).
   These web config values are public identifiers, not secrets: Firebase expects them
   to ship in the app. Access is controlled by the rules in /firestore.rules. */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyChta4H7IJciIQw-ZeiLSZFTuwAz6zykKo',
  authDomain: 'gyan-seedhi.firebaseapp.com',
  projectId: 'gyan-seedhi',
  storageBucket: 'gyan-seedhi.firebasestorage.app',
  messagingSenderId: '934408970922',
  appId: '1:934408970922:web:42c79cd9f9589c0931a6d3',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
