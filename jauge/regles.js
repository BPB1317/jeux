// La Jauge — règles partagées par la TV et les téléphones : points, filtre de l'indice, dessin de la jauge.
//
// À chaque manche, un joueur fait deviner : il voit en secret une cible sur une jauge à deux extrémités
// (« Froid ↔ Chaud ») et donne un indice. Les autres placent leur curseur. Aucun chiffre n'est affiché :
// le jeu mesure tout en coulisses, sur une échelle de 0 (à gauche) à 100 (à droite).

export const LONGUEUR_MAX = 24;

// Zones autour de la cible : écart maximal, points, mention affichée
export const ZONES = [
    { ecart: 4, points: 3, mention: 'Pile !' },
    { ecart: 10, points: 2, mention: 'Tout près' },
    { ecart: 18, points: 1, mention: 'Proche' }
];
export const RATE = { points: 0, mention: 'Raté' };

export function pointsDevineur(valeur, cible) {
    const ecart = Math.abs(Number(valeur) - Number(cible));
    return ZONES.find(z => ecart <= z.ecart) || RATE;
}

// Celui qui fait deviner : la moyenne des devineurs qui ont joué, arrondie au plus proche,
// +1 si tous ont marqué. Un indice compris d'un seul complice rapporte donc peu.
export function pointsEclaireur(pointsDevineurs) {
    if (!pointsDevineurs.length) return { points: 0, moyenne: null, bonus: false };
    const moyenne = pointsDevineurs.reduce((s, p) => s + p, 0) / pointsDevineurs.length;
    const bonus = pointsDevineurs.every(p => p > 0);
    return { points: Math.round(moyenne) + (bonus ? 1 : 0), moyenne, bonus };
}

// Deux cibles par manche : la seconde sert à la relance, assez loin de la première
export function tirerCibles() {
    const tirer = () => 5 + Math.floor(Math.random() * 91);
    const c1 = tirer();
    let c2 = tirer();
    while (Math.abs(c2 - c1) < 15) c2 = tirer();
    return [c1, c2];
}

// ---------- Filtre de l'indice : ni nombre, ni position sur la jauge ----------

const NOMBRES = new Set(['zero', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize',
    'quatorze', 'quinze', 'seize', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'septante', 'huitante', 'nonante',
    'cent', 'cents', 'mille', 'moitie', 'demi', 'quart', 'quarts', 'tiers', 'pourcent']);
const POSITIONS = new Set(['gauche', 'droite', 'milieu', 'centre', 'bout', 'extreme', 'moyen', 'moyenne', 'max', 'maximum', 'min', 'minimum']);

// Renvoie '' si l'indice est accepté, sinon la raison du refus
export function verifierIndice(texte) {
    const t = String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (!t) return 'Écris un indice.';
    if (/[0-9%]/.test(t)) return 'Pas de chiffre dans l’indice.';
    for (const mot of t.split(/[^a-z]+/).filter(Boolean)) {
        if (NOMBRES.has(mot)) return `« ${mot} » est un nombre : trouve autre chose.`;
        if (POSITIONS.has(mot)) return `« ${mot} » indique une position : trouve autre chose.`;
    }
    return '';
}

// ---------- Dessin de la jauge (SVG) ----------

const CX = 380, CY = 384, R = 330;
const ENCRE = '#221C15', CARTON = '#F1E7D0', FILET = '#CDBB94';
const COULEURS_ZONES = ['#C8401F', '#E3A21A', '#F2D48C'];

const f = n => n.toFixed(1);

function point(r, v) {
    const a = Math.PI * (1 - v / 100);
    return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

function part(v1, v2) {
    v1 = Math.max(0, v1);
    v2 = Math.min(100, v2);
    if (v2 <= v1) return '';
    const a = point(R, v1), b = point(R, v2);
    return `M${CX} ${CY} L${f(a[0])} ${f(a[1])} A${R} ${R} 0 0 1 ${f(b[0])} ${f(b[1])} Z`;
}

// Texte foncé sur les couleurs claires (ciel, ocre…), clair sur les foncées
export function texteSur(hex) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? ENCRE : CARTON;
}

const echapperSvg = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// options :
//   cible       : position de la cible (affiche ses zones), ou null
//   aiguilles   : [{ valeur, couleur, initiale }] — les curseurs des joueurs, avec leur initiale au bout
//   curseur     : { valeur, couleur } — une seule grande aiguille, sans initiale (téléphone)
//   trait       : épaisseur des traits (1 sur la TV, plus épais sur un petit écran)
//   etiquette   : texte pour les lecteurs d'écran
export function cadran({ cible = null, aiguilles = [], curseur = null, trait = 1, etiquette = 'Jauge' } = {}) {
    const face = part(0, 100);
    let zones = '';
    if (cible !== null && cible !== undefined) {
        const c = Number(cible);
        const [z3, z2, z1] = ZONES;
        zones += `<path d="${part(c - z1.ecart, c + z1.ecart)}" fill="${COULEURS_ZONES[2]}"/>`;
        zones += `<path d="${part(c - z2.ecart, c + z2.ecart)}" fill="${COULEURS_ZONES[1]}"/>`;
        zones += `<path d="${part(c - z3.ecart, c + z3.ecart)}" fill="${COULEURS_ZONES[0]}"/>`;
        // Chiffre des points au milieu de chaque bande, si elle est assez large pour l'afficher
        const bandes = [
            [c - z1.ecart, c - z2.ecart, z1.points], [c - z2.ecart, c - z3.ecart, z2.points], [c - z3.ecart, c + z3.ecart, z3.points],
            [c + z3.ecart, c + z2.ecart, z2.points], [c + z2.ecart, c + z1.ecart, z1.points]
        ];
        bandes.forEach(([a, b, pts]) => {
            const a2 = Math.max(0, a), b2 = Math.min(100, b);
            if (b2 - a2 < 4.5) return;
            const p = point(R - 74, (a2 + b2) / 2);
            zones += `<text x="${f(p[0])}" y="${f(p[1])}" text-anchor="middle" dominant-baseline="central" font-family="Chivo, sans-serif" font-weight="900" font-size="26" fill="${pts === 3 ? CARTON : ENCRE}">${pts}</text>`;
        });
        const t = point(R + 2, c), g = point(R + 24, c - 1.7), d = point(R + 24, c + 1.7);
        zones += `<polygon points="${f(t[0])},${f(t[1])} ${f(g[0])},${f(g[1])} ${f(d[0])},${f(d[1])}" fill="${ENCRE}"/>`;
    }
    const m1 = point(R - 8, 50), m2 = point(R - 120, 50);
    const L = R - 80;
    // Aiguilles voisines : leurs pastilles s'échelonnent le long de l'aiguille pour rester lisibles
    const niveaux = [];
    let precedente = -100, niveauPrecedent = 0;
    aiguilles.map((a, k) => ({ v: Number(a.valeur), k })).sort((x, y) => x.v - y.v).forEach(({ v, k }) => {
        const niveau = v - precedente < 6 ? (niveauPrecedent + 1) % 4 : 0;
        niveaux[k] = niveau;
        precedente = v;
        niveauPrecedent = niveau;
    });
    // Toutes les aiguilles d'abord, puis toutes les pastilles par-dessus : aucune initiale n'est cachée par une aiguille voisine
    const traits = aiguilles.map((a, k) => {
        const p = point(L, a.valeur);
        return `<g class="aiguille" style="--i:${k}">
            <line x1="${CX}" y1="${CY}" x2="${f(p[0])}" y2="${f(p[1])}" stroke="${ENCRE}" stroke-width="${12 * trait}" stroke-linecap="round"/>
            <line x1="${CX}" y1="${CY}" x2="${f(p[0])}" y2="${f(p[1])}" stroke="${echapperSvg(a.couleur)}" stroke-width="${6 * trait}" stroke-linecap="round"/>
        </g>`;
    }).join('');
    const pastilles = aiguilles.map((a, k) => {
        const q = point(L + 24 - niveaux[k] * 50, a.valeur);
        return `<g class="aiguille" style="--i:${k}">
            <circle cx="${f(q[0])}" cy="${f(q[1])}" r="${21 * Math.min(trait, 1.3)}" fill="${echapperSvg(a.couleur)}" stroke="${ENCRE}" stroke-width="${3 * trait}"/>
            <text x="${f(q[0])}" y="${f(q[1])}" text-anchor="middle" dominant-baseline="central" font-family="Chivo, sans-serif" font-weight="900" font-size="${20 * Math.min(trait, 1.3)}" fill="${texteSur(a.couleur)}">${echapperSvg(a.initiale)}</text>
        </g>`;
    }).join('');
    const lesAiguilles = traits + pastilles;
    let leCurseur = '';
    if (curseur) {
        const p = point(R - 50, curseur.valeur);
        leCurseur = `<line x1="${CX}" y1="${CY}" x2="${f(p[0])}" y2="${f(p[1])}" stroke="${ENCRE}" stroke-width="${12 * trait}" stroke-linecap="round"/>
            <line x1="${CX}" y1="${CY}" x2="${f(p[0])}" y2="${f(p[1])}" stroke="${echapperSvg(curseur.couleur)}" stroke-width="${6 * trait}" stroke-linecap="round"/>`;
    }
    return `<svg class="cadran" viewBox="0 0 760 412" role="img" aria-label="${echapperSvg(etiquette)}">
        <path d="${face}" fill="${CARTON}"/>
        <path d="M${f(m1[0])} ${f(m1[1])}L${f(m2[0])} ${f(m2[1])}" stroke="${FILET}" stroke-width="${4 * trait}" stroke-linecap="round" stroke-dasharray="${6 * trait} ${6 * trait}"/>
        <g class="zones">${zones}</g>
        <path d="${face}" fill="none" stroke="${ENCRE}" stroke-width="${4 * trait}" stroke-linejoin="round"/>
        <g class="aiguilles">${lesAiguilles}</g>
        ${leCurseur}
        <rect x="22" y="${CY}" width="716" height="24" rx="4" fill="${ENCRE}"/>
        <circle cx="${CX}" cy="${CY}" r="30" fill="${ENCRE}"/>
        <circle cx="${CX}" cy="${CY}" r="12" fill="${curseur ? echapperSvg(curseur.couleur) : '#E3A21A'}"/>
    </svg>`;
}
