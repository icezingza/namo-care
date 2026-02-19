/**
 * Firebase Configuration — NaMo Care
 * 
 * For MVP, this module provides a simulated Firebase setup.
 * Replace the config values with your real Firebase project credentials
 * when connecting to a live backend.
 */

// Placeholder Firebase config — replace with real values for production
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "namo-care.firebaseapp.com",
    projectId: "namo-care",
    storageBucket: "namo-care.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000",
};

// --- Simulated Firebase Services for MVP ---

// Simulated Auth
export const auth = {
    currentUser: null,
    signInWithLINE: async () => {
        // Simulate LINE Login
        const mockUser = {
            uid: "line_somsri_001",
            displayName: "คุณยาย สมศรี",
            photoURL: null,
            provider: "line.me",
        };
        auth.currentUser = mockUser;
        return mockUser;
    },
    signOut: async () => {
        auth.currentUser = null;
    },
};

// Simulated Firestore
export const db = {
    collection: (name) => ({
        doc: (id) => ({
            get: async () => ({ exists: true, data: () => ({}) }),
            set: async (data) => console.log(`[Firestore Mock] Set ${name}/${id}:`, data),
            update: async (data) => console.log(`[Firestore Mock] Update ${name}/${id}:`, data),
        }),
        add: async (data) => {
            console.log(`[Firestore Mock] Add to ${name}:`, data);
            return { id: "mock_doc_id_" + Date.now() };
        },
    }),
};

export default firebaseConfig;
