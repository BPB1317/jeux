// Game Hub — code partagé par tous les jeux en ligne (Carré d'As, Le Juste Chiffre, Le Mot commun) et par le salon de soirée.
//
// Une partie vit dans « parties/CODE » (voir regles.json). Une soirée est une partie qui dure :
// les joueurs la rejoignent une fois, puis les jeux s'y succèdent. Entre deux jeux, l'état vaut { phase: 'salon' } ;
// pendant un jeu, il porte le nom du jeu (etat.jeu) et chaque page (TV ou téléphone) rejoint la page de ce jeu.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { initializeAuth, browserLocalPersistence, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, onValue, get, update, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
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

// ---------- Stockage local ----------

export function lireStockage(cle) {
    try { return localStorage.getItem(cle); } catch { return null; }
}

export function ecrireStockage(cle, valeur) {
    try {
        if (valeur === null) localStorage.removeItem(cle);
        else localStorage.setItem(cle, valeur);
    } catch { /* navigation privée : la reconnexion repose alors sur l'identifiant Firebase seul */ }
}

// ---------- Joueurs, codes, classements ----------

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

// Classement avec ex æquo : deux joueurs à égalité partagent la même place
export function classementAvecRangs(scores) {
    const liste = classer(scores);
    liste.forEach((s, k) => { s.rang = k > 0 && s.total === liste[k - 1].total ? liste[k - 1].rang : k + 1; });
    return liste;
}

export function rangDe(id, scores) {
    const moi = scores?.[id]?.total ?? 0;
    return 1 + Object.values(scores || {}).filter(s => s.total > moi).length;
}

export const ordinal = n => n === 1 ? '1er' : `${n}e`;

export function echapper(texte) {
    return String(texte ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function melanger(liste) {
    for (let i = liste.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [liste[i], liste[j]] = [liste[j], liste[i]];
    }
    return liste;
}

// ---------- Soirée ----------

export const JEUX = {
    'carre-d-as': { titre: "Carré d'As", couleur: '#C8401F', texte: '#F1E7D0', resume: 'Quiz à 4 réponses' },
    'juste-chiffre': { titre: 'Le Juste Chiffre', couleur: '#2A4A7A', texte: '#F1E7D0', resume: 'Estimations sur la règle' },
    'mot-commun': { titre: 'Le Mot commun', couleur: '#1F6A5C', texte: '#F1E7D0', resume: 'Pense comme les autres' }
};

// Clé locale de la TV qui anime une soirée
export const CLE_SOIREE = 'hub.soiree';
// Clé locale du téléphone : la partie ou la soirée rejointe, quel que soit le jeu
export const CLE_JOUEUR = 'hub.partie';

// Dossier de la page qui correspond à l'état : le salon entre deux jeux, sinon le jeu en cours.
// (Une partie hors soirée n'a pas de « jeu » : c'est une partie de Carré d'As d'avant les soirées.)
export function dossierAttendu(etat) {
    if (!etat || etat.phase === 'salon' || etat.phase === 'finSoiree') return 'soiree';
    return etat.jeu || 'carre-d-as';
}

// Adresse d'une page du hub depuis n'importe quel dossier de jeu.
// Les téléphones passent le code en « code », la TV en « soiree ».
export function urlPage(dossier, role, code) {
    const page = role === 'tv' ? 'index.html' : 'joueur.html';
    const param = role === 'tv' ? 'soiree' : 'code';
    return new URL(`../${dossier}/${page}?${param}=${code}`, location.href).href;
}

// Points de soirée d'une partie, avec N joueurs : 1er N+3, 2e N+1, 3e N, 4e N−1… (le dernier en a toujours 3)
export function pointsSoiree(rang, n) {
    return n + 3 - rang + (rang === 1 ? 1 : 0);
}

// Entrées à ajouter à l'écriture qui termine une partie de soirée (même écriture que la phase « fin » :
// si la TV recharge, les points ne sont jamais comptés deux fois)
export async function gainsDeSoiree(code, scores, jeu, titre) {
    const soiree = (await get(ref(db, `parties/${code}/soiree`))).val() || {};
    const liste = classementAvecRangs(scores);
    const gains = {};
    liste.forEach(s => { gains[s.id] = pointsSoiree(s.rang, liste.length); });
    const maj = {};
    Object.entries(gains).forEach(([id, pts]) => { maj[`soiree/points/${id}`] = (soiree.points?.[id] || 0) + pts; });
    const n = Object.keys(soiree.parties || {}).length;
    maj[`soiree/parties/${n}`] = { jeu, titre: titre || '', gains };
    maj['etat/partieSoiree'] = n;
    return maj;
}

// Fin d'un jeu : on vide ses données et la soirée revient au salon
export function retourAuSalon(code) {
    return update(ref(db, `parties/${code}`), {
        etat: { phase: 'salon' }, secret: null, scores: null, resultats: null, reponses: null
    });
}

// ---------- Téléphone : rejoindre une partie ou une soirée ----------
// La page fournit le formulaire (#formRejoindre, #champCode, #champPseudo, #palette, #erreurRejoindre, #btnRejoindre).

export function brancherRejoindre(uid, entrer) {
    const $ = id => document.getElementById(id);
    let couleur = null;
    let couleursPrises = new Set();
    let arreterCouleurs = null;

    function rendrePalette() {
        if (couleursPrises.has(couleur)) couleur = null;
        if (!couleur) couleur = PALETTE_JOUEURS.find(c => !couleursPrises.has(c.hex))?.hex || PALETTE_JOUEURS[0].hex;
        $('palette').innerHTML = PALETTE_JOUEURS.map(c => `
            <button type="button" data-couleur="${c.hex}" style="background:${c.hex}" aria-label="${c.nom}"
                aria-pressed="${c.hex === couleur}" ${couleursPrises.has(c.hex) ? 'disabled' : ''}></button>`).join('');
    }

    // Couleurs réservées dans la partie, suivies en direct : une couleur prise se grise aussitôt
    function suivreCouleurs(c) {
        if (arreterCouleurs) arreterCouleurs();
        arreterCouleurs = null;
        couleursPrises = new Set();
        rendrePalette();
        if (c.length !== 4) return;
        arreterCouleurs = onValue(ref(db, `parties/${c}/couleurs`), s => {
            const reservees = s.val() || {};
            couleursPrises = new Set(Object.keys(reservees).filter(hex => reservees[hex] !== uid).map(hex => '#' + hex));
            rendrePalette();
        }, () => { couleursPrises = new Set(); rendrePalette(); });
    }

    $('champCode').addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
        suivreCouleurs(e.target.value);
    });

    $('palette').addEventListener('click', e => {
        const bouton = e.target.closest('[data-couleur]');
        if (!bouton || bouton.disabled) return;
        couleur = bouton.dataset.couleur;
        rendrePalette();
    });

    $('formRejoindre').addEventListener('submit', async e => {
        e.preventDefault();
        const c = $('champCode').value;
        const pseudo = $('champPseudo').value.trim();
        const erreur = message => { $('erreurRejoindre').textContent = message; $('erreurRejoindre').hidden = false; };
        $('erreurRejoindre').hidden = true;
        if (c.length !== 4) return erreur('Le code fait 4 lettres.');
        if (!pseudo) return erreur('Choisis un pseudo.');
        $('btnRejoindre').disabled = true;
        try {
            const meta = (await get(ref(db, `parties/${c}/meta`))).val();
            if (!meta) throw new Error();
        } catch {
            $('btnRejoindre').disabled = false;
            return erreur('Aucune partie avec ce code.');
        }
        // La fiche et la réservation de la couleur sont écrites ensemble :
        // si quelqu'un vient de prendre la couleur, Firebase refuse les deux.
        // (La palette en direct peut changer « couleur » entre-temps : on garde celle demandée.)
        const tentee = couleur;
        try {
            await update(ref(db, `parties/${c}`), {
                [`joueurs/${uid}`]: { pseudo, couleur: tentee, arrive: serverTimestamp(), enLigne: true },
                [`couleurs/${tentee.slice(1)}`]: uid
            });
            if (arreterCouleurs) arreterCouleurs();
            arreterCouleurs = null;
            entrer(c);
        } catch {
            $('btnRejoindre').disabled = false;
            // La réservation de l'autre joueur arrive par le suivi en direct : on lui laisse un instant
            for (let i = 0; i < 15 && !couleursPrises.has(tentee); i++) await new Promise(r => setTimeout(r, 100));
            erreur(couleursPrises.has(tentee) ? 'Cette couleur vient d\'être prise, choisis-en une autre.' : 'Impossible de rejoindre la partie.');
        }
    });

    // Affiche le formulaire, prérempli avec le code de l'adresse (QR code)
    return function afficherFormulaire() {
        const codeUrl = new URLSearchParams(location.search).get('code');
        if (codeUrl) $('champCode').value = codeUrl.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        rendrePalette();
        if ($('champCode').value.length === 4) {
            suivreCouleurs($('champCode').value);
            $('champPseudo').focus();
        }
    };
}

// Présence : la TV grise les joueurs déconnectés et ne les attend pas
export function signalerPresence(code, uid) {
    const base = `parties/${code}/joueurs/${uid}`;
    onValue(ref(db, '.info/connected'), s => {
        if (s.val() !== true) return;
        onDisconnect(ref(db, `${base}/enLigne`)).set(false);
        update(ref(db, base), { enLigne: true }).catch(() => {});
    });
}

// Quitter : on retire sa fiche et on libère sa couleur pour les suivants
export async function quitter(code, uid, couleur) {
    try {
        const maj = { [`joueurs/${uid}`]: null };
        if (couleur) maj[`couleurs/${couleur.slice(1)}`] = null;
        await update(ref(db, `parties/${code}`), maj);
    } catch { /* tant pis */ }
}

// L'écran du téléphone reste allumé (si le téléphone le permet)
export function garderEcranAllume() {
    const demander = async () => { try { await navigator.wakeLock?.request('screen'); } catch { /* non supporté */ } };
    demander();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') demander(); });
}
