// js/utils.js

/**
 * Gera as iniciais a partir de um nome.
 * @param {string} name - O nome completo (ex: "Otacílio Júnior")
 * @returns {string} As iniciais (ex: "OJ")
 */
export function getInitials(name) {
    if (!name) return '?';
    
    const words = name.trim().split(' ');
    
    // Se for um nome, pega a primeira letra
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    
    // Se for nome composto, pega a primeira letra das duas primeiras palavras
    const firstInitial = words[0][0];
    const secondInitial = words[1] ? words[1][0] : '';
    
    return `${firstInitial}${secondInitial}`.toUpperCase();
}

/**
 * Gera uma cor de fundo com base num texto (hash).
 * @param {string} text - O texto para gerar a cor (ex: "Otacílio Júnior")
 * @returns {string} Um código de cor HSL (ex: "hsl(120, 50%, 60%)")
 */
export function generateColorHash(text) {
    if (!text) return 'hsl(200, 50%, 60%)'; // Cor padrão

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Limita o 'hue' (matiz) para cores agradáveis (evita amarelos muito claros, etc.)
    const hue = hash % 360;
    
    // Usamos saturação e luminosidade fixas para consistência
    const saturation = 50; // Saturação em %
    const lightness = 60;  // Luminosidade em %

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}