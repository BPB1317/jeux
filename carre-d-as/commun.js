// Carré d'As — code partagé entre l'écran TV (index.html) et les téléphones (joueur.html).
// Firebase, joueurs, classements et soirée viennent du module commun du hub.

export * from '../hub.js';

// Clé localStorage de la TV (partie hors soirée)
export const CLE_HOTE = 'carreDAs.hote';

// Les quatre réponses : une couleur et une forme chacun, pour répondre sans lire
export const COINS = [
    { nom: 'Rond', couleur: '#C8401F', texte: '#F1E7D0', forme: '<circle cx="24" cy="24" r="16"/>' },
    { nom: 'Carré', couleur: '#E3A21A', texte: '#221C15', forme: '<rect x="9" y="9" width="30" height="30"/>' },
    { nom: 'Triangle', couleur: '#2A4A7A', texte: '#F1E7D0', forme: '<path d="M24 6L42 39H6Z"/>' },
    { nom: 'Croix', couleur: '#7E3A58', texte: '#F1E7D0', forme: '<path d="M12 12L36 36M36 12L12 36" fill="none" stroke="currentColor" stroke-width="9"/>' }
];

export function formeSVG(i) {
    return `<svg class="forme" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${COINS[i].forme}</svg>`;
}

// Score : 1000 points pour une réponse immédiate, 500 au dernier moment
export function pointsRapidite(tempsMs, dureeMs) {
    const t = Math.min(Math.max(tempsMs / dureeMs, 0), 1);
    return Math.round(1000 - 500 * t);
}

// Bonus de série : +100 à la 3e bonne réponse d'affilée, +200 à la 4e… plafonné à +500
export function bonusSerie(serie) {
    return serie >= 3 ? Math.min(100 * (serie - 2), 500) : 0;
}
