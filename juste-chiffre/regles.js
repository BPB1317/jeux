// Le Juste Chiffre — règles de score et mise en forme des nombres, partagées par la TV et les téléphones.
// Une question (ou etat.question côté téléphone) a un « type » : quantite (par défaut), date ou pourcentage,
// et une « unite » facultative (m, km, pièces…).

// Marge d'une question : l'écart qui fait tomber à 0 point en mode Précision.
// Une question peut fixer la sienne (« marge ») : utile pour les dates que tout le monde connaît.
export function marge(question, anneeCourante) {
    if (question.marge > 0) return question.marge;
    if (question.type === 'date') return 10 + Math.abs(anneeCourante - question.reponse) / 4;
    if (question.type === 'pourcentage') return 25;
    return Math.max(Math.abs(question.reponse) / 2, 1);
}

// Bonus. Précision : +200 au plus proche, +100 de plus si c'est pile. Le plus proche : +1 point si c'est pile.
export const BONUS_PROCHE = 200;
export const BONUS_PILE = 100;
export const BONUS_PILE_SERIE = 1;

// Mode Précision : 1000 points pile, 0 quand l'écart atteint la marge (les bonus s'ajoutent à part)
export function pointsPrecision(ecart, m) {
    return Math.round(1000 * Math.max(0, 1 - ecart / m));
}

// Mode « Le plus proche » : 1 point, 2 dès 3 victoires d'affilée, 3 dès 5, 4 dès 7…
export function pointsSerie(serie) {
    return Math.ceil(serie / 2);
}

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function uniteDe(question) {
    return question.type === 'pourcentage' ? '%' : question.unite || '';
}

// 330 · 330 m · 1889 · 52 av. J.-C. · 71 %
export function formaterValeur(v, question, avecUnite = false) {
    if (question.type === 'date') return v < 0 ? `${-v} av. J.-C.` : String(v);
    const u = uniteDe(question);
    return avecUnite && u ? `${nf.format(v)} ${u}` : nf.format(v);
}

export function formaterEcart(e, question) {
    if (question.type === 'date') return `${nf.format(e)} ${e > 1 ? 'ans' : 'an'}`;
    if (question.type === 'pourcentage') return `${nf.format(e)} ${e > 1 ? 'points' : 'point'}`;
    const u = uniteDe(question);
    return u ? `${nf.format(e)} ${u}` : nf.format(e);
}

const NOMS_UNITES = {
    m: 'mètres', km: 'kilomètres', cm: 'centimètres', mm: 'millimètres', kg: 'kilos', g: 'grammes', t: 'tonnes',
    '°C': 'degrés Celsius', '°F': 'degrés Fahrenheit', '€': 'euros', h: 'heures', min: 'minutes', s: 'secondes'
};

// Ce qu'on attend comme réponse : « Réponse en mètres », « Réponse : une année », « Réponse : un nombre de pièces »
export function consigne(question) {
    if (question.type === 'date') return 'Réponse : une année';
    if (question.type === 'pourcentage') return 'Réponse en %';
    const u = question.unite;
    if (!u) return 'Réponse : un nombre';
    if (NOMS_UNITES[u]) return `Réponse en ${NOMS_UNITES[u]}`;
    if (/^[a-z]+\/[a-z]+$/i.test(u)) return `Réponse en ${u}`;
    return `Réponse : un nombre ${/^[aeiouyhéèêâ]/i.test(u) ? "d'" : 'de '}${u}`;
}
