// Quatre Coins — code partagé entre l'écran TV (index.html) et les téléphones (joueur.html)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { initializeAuth, browserLocalPersistence, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
// L'identifiant anonyme est gardé dans le localStorage : il survit au rechargement et à la mise en veille
const auth = initializeAuth(app, { persistence: browserLocalPersistence });
export const db = getDatabase(app);

export async function connexion() {
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
    return auth.currentUser.uid;
}

// Heure du serveur Firebase, corrigée du décalage de l'horloge locale
let decalage = 0;
onValue(ref(db, '.info/serverTimeOffset'), s => { decalage = s.val() || 0; });
export const heureServeur = () => Date.now() + decalage;

// Clés localStorage
export const CLE_HOTE = 'quatreCoins.hote';
export const CLE_JOUEUR = 'quatreCoins.partie';

export function lireStockage(cle) {
    try { return localStorage.getItem(cle); } catch { return null; }
}

export function ecrireStockage(cle, valeur) {
    try {
        if (valeur === null) localStorage.removeItem(cle);
        else localStorage.setItem(cle, valeur);
    } catch { /* navigation privée : la reconnexion repose alors sur l'identifiant Firebase seul */ }
}

// Les quatre coins : une couleur et une forme chacun, pour répondre sans lire
export const COINS = [
    { nom: 'Rond', couleur: '#C8401F', texte: '#F1E7D0', forme: '<circle cx="24" cy="24" r="16"/>' },
    { nom: 'Carré', couleur: '#E3A21A', texte: '#221C15', forme: '<rect x="9" y="9" width="30" height="30"/>' },
    { nom: 'Triangle', couleur: '#2A4A7A', texte: '#F1E7D0', forme: '<path d="M24 6L42 39H6Z"/>' },
    { nom: 'Croix', couleur: '#7E3A58', texte: '#F1E7D0', forme: '<path d="M12 12L36 36M36 12L12 36" fill="none" stroke="currentColor" stroke-width="9"/>' }
];

export function formeSVG(i) {
    return `<svg class="forme" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${COINS[i].forme}</svg>`;
}

// Couleurs proposées aux joueurs (même palette que La Grille)
export const PALETTE_JOUEURS = [
    { nom: 'Tomate', hex: '#C8401F' },
    { nom: 'Ocre', hex: '#E3A21A' },
    { nom: 'Prusse', hex: '#2A4A7A' },
    { nom: 'Prune', hex: '#7E3A58' },
    { nom: 'Ciel', hex: '#8FC0CF' },
    { nom: 'Sapin', hex: '#1F6A5C' },
    { nom: 'Rose', hex: '#D97A8C' },
    { nom: 'Olive', hex: '#8A9A2B' },
    { nom: 'Brou', hex: '#6E4B2F' },
    { nom: 'Lavande', hex: '#9C8AC4' }
];

// Score : 1000 points pour une réponse immédiate, 500 au dernier moment
export function pointsRapidite(tempsMs, dureeMs) {
    const t = Math.min(Math.max(tempsMs / dureeMs, 0), 1);
    return Math.round(1000 - 500 * t);
}

// Bonus de série : +100 à la 3e bonne réponse d'affilée, +200 à la 4e… plafonné à +500
export function bonusSerie(serie) {
    return serie >= 3 ? Math.min(100 * (serie - 2), 500) : 0;
}

// Codes de partie : 4 lettres, sans I ni O qu'on confond avec 1 et 0
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function genererCode() {
    return Array.from({ length: 4 }, () => LETTRES[Math.floor(Math.random() * LETTRES.length)]).join('');
}

export function classer(scores) {
    return Object.entries(scores || {})
        .map(([id, s]) => ({ id, ...s }))
        .sort((a, b) => b.total - a.total);
}

// Rang avec ex æquo : deux joueurs à égalité partagent la même place
export function rangDe(id, scores) {
    const moi = scores?.[id]?.total ?? 0;
    return 1 + Object.values(scores || {}).filter(s => s.total > moi).length;
}

export const ordinal = n => n === 1 ? '1er' : `${n}e`;

export function echapper(texte) {
    return String(texte ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
