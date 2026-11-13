// Le Mot commun — regroupement des mots en piles et calcul des points, partagés par la TV et les téléphones.
//
// Chaque joueur écrit un mot sur un thème. Les mots identiques forment une pile.
// Mode « Tous ensemble » : 1 point par autre joueur sur sa pile.
// Mode « Le troupeau » : seule la plus grosse pile marque 1 point (rien si deux piles sont à égalité en tête),
// et le seul joueur isolé prend le mouton noir, qui coûte 2 points à celui qui l'a encore à la fin.

export const PENALITE_MOUTON = 2;
export const LONGUEUR_MAX = 24;

export const NOMS_MODES = { ensemble: 'Tous ensemble', troupeau: 'Le troupeau' };

// Clé de comparaison : sans majuscules, accents, article ni pluriel.
// « Les Bananes », « banane » et « une banane » tombent sur la même pile.
export function normaliser(mot) {
    let m = String(mot || '').toLowerCase()
        .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[’'`]/g, "' ")
        .replace(/[^a-z0-9' ]+/g, ' ')
        .replace(/\s+/g, ' ').trim();
    m = m.replace(/^(?:(?:le|la|les|un|une|des|du|de la|de|au|aux) |(?:l|d)' )/, '');
    return m.replace(/'/g, ' ').split(' ').filter(Boolean)
        .map(w => w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w)
        .join(' ');
}

// Le mot tel qu'on l'affiche sur la pile : en minuscules, sans espaces en trop
export function affichage(mot) {
    return String(mot || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Piles à partir des réponses { uid: { mot } } : [{ cle, mot, joueurs: [uid…] }], de la plus grosse à la plus petite.
// « fusions » : { cle: cleCible } pour les piles que la TV a réunies à la main.
export function construirePiles(reponses, fusions = {}) {
    const racine = cle => {
        const vues = new Set();
        while (fusions[cle] && !vues.has(cle)) { vues.add(cle); cle = fusions[cle]; }
        return cle;
    };
    const parCle = new Map();
    Object.entries(reponses || {}).forEach(([id, r]) => {
        const brute = normaliser(r?.mot);
        if (!brute) return;
        const cle = racine(brute);
        if (!parCle.has(cle)) parCle.set(cle, { cle, joueurs: [], formes: new Map(), arrivee: Infinity });
        const pile = parCle.get(cle);
        pile.joueurs.push(id);
        pile.arrivee = Math.min(pile.arrivee, r.a || 0);
        const forme = affichage(r.mot);
        pile.formes.set(forme, (pile.formes.get(forme) || 0) + 1);
    });
    return [...parCle.values()]
        .map(p => ({
            cle: p.cle,
            // La forme la plus écrite donne son nom à la pile (à égalité, la plus courte)
            mot: [...p.formes.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0],
            joueurs: p.joueurs,
            arrivee: p.arrivee
        }))
        .sort((a, b) => b.joueurs.length - a.joueurs.length || a.arrivee - b.arrivee);
}

// Points de la manche. « sansPapier » : joueurs présents qui n'ont rien écrit (isolés, eux aussi, en mode troupeau).
// Renvoie { gains: { uid: points }, gainsPiles: [points par joueur de chaque pile], mouton, nouveauMouton }.
export function compter(piles, mode, moutonAvant = null, sansPapier = []) {
    const gains = {};
    let gainsPiles;
    if (mode === 'troupeau') {
        const max = Math.max(0, ...piles.map(p => p.joueurs.length));
        const enTete = piles.filter(p => p.joueurs.length === max);
        const gagnante = max >= 2 && enTete.length === 1 ? enTete[0] : null;
        gainsPiles = piles.map(p => p === gagnante ? 1 : 0);
    } else {
        gainsPiles = piles.map(p => p.joueurs.length - 1);
    }
    piles.forEach((p, k) => p.joueurs.forEach(id => { gains[id] = gainsPiles[k]; }));
    let mouton = moutonAvant;
    let nouveauMouton = false;
    if (mode === 'troupeau') {
        const isoles = [...piles.filter(p => p.joueurs.length === 1).map(p => p.joueurs[0]), ...sansPapier];
        if (isoles.length === 1) {
            nouveauMouton = isoles[0] !== moutonAvant;
            mouton = isoles[0];
        }
    }
    return { gains, gainsPiles, mouton, nouveauMouton };
}
