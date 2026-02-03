// Configuración de Firebase para Spanish with Ignacio
import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCqteri0GZQIBDpQ5xwRs20YmfnpbYrTZc",
  authDomain: "spanish-with-ignacio.firebaseapp.com",
  projectId: "spanish-with-ignacio",
  storageBucket: "spanish-with-ignacio.firebasestorage.app",
  messagingSenderId: "15189021159",
  appId: "1:15189021159:web:ec153bb429c5214368ed42",
  measurementId: "G-Z9NJ6PYYQW"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Obtener referencia a Firebase Functions
export const functions = getFunctions(app);
