const names = [
    "はると",
    "ゆうき",
    "さくら",
    "ひなた",
    "あおい",
    "みずき",
    "かなで",
    "ゆい",
    "そら",
    "りく",
    "なつみ",
    "ことは",
    "ひかる",
    "しおり",
    "はるか",
    "けいた",
    "たくみ",
    "あかり",
    "ゆうた",
    "みなと",
];

export function pickRandomNames(count: number): string[] {
    const pool = [...names];
    return Array.from({ length: count }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
}
