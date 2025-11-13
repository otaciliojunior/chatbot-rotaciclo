// frontend/js/modules/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp, getDocs, limit, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- (NOVO) IMPORTAÇÃO DE AUTENTICAÇÃO ---
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";


// SUAS CONFIGURAÇÕES DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyC1rzlA51ICexuzyMjHkbk6HnRb2lLwk9Y",
    authDomain: "rotaciclo.firebaseapp.com",
    projectId: "rotaciclo",
    storageBucket: "rotaciclo.firebasestorage.app",
    messagingSenderId: "490741633811",
    appId: "1:90741633811:web:7b1115381d58bb23e3c0e6",
    measurementId: "G-G2R6G1S8DK"
};

// INICIALIZAÇÃO
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- (NOVO) INICIALIZAÇÃO DA AUTENTICAÇÃO ---
const auth = getAuth(app);


// EXPORTAÇÃO DE TUDO QUE SERÁ USADO NO PROJETO
export {
    // Funções do Firestore
    db,
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    getDocs,
    limit,
    deleteDoc,
    getDoc,

    // --- (NOVO) Funções de Autenticação ---
    auth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
};