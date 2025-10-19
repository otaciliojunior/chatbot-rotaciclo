// frontend/js/modules/utils.js

/**
 * Retorna a saudação apropriada (Bom dia, Boa tarde, Boa noite) baseada na hora atual.
 * @returns {string} A saudação.
 */
export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
}

/**
 * Gera as iniciais a partir de um nome completo.
 * @param {string} name - O nome completo.
 * @returns {string} As iniciais em maiúsculo.
 */
export function getInitials(name) {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
}