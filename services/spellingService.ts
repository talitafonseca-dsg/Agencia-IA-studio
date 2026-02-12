// spellingService.ts - Portuguese spelling enforcement for AI-generated text

export const SPELLING_ENFORCEMENT_RULES = {
    pt_BR: {
        // Palavras com acentos obrigatórios
        'biblicas': 'bíblicas',
        'bíblicas': 'bíblicas', // Ensure accented input is firmly mapped to itself for checking
        'biblica': 'bíblica',
        'bíblica': 'bíblica',
        'cronologica': 'cronológica',
        'cronológica': 'cronológica',
        'cronologico': 'cronológico',
        'biblia': 'bíblia',
        'bíblia': 'bíblia',
        'ebf': 'EBF', // Common acronym in this context
        'ebd': 'EBD',
        'magica': 'mágica',
        'magico': 'mágico',
        'publico': 'público',
        'publica': 'pública',
        'historia': 'história',
        'historias': 'histórias',
        'grafica': 'gráfica',
        'grafico': 'gráfico',
        'comercio': 'comércio',
        'comercial': 'comercial',
        'coracoes': 'corações',
        'coracao': 'coração',
        'promocao': 'promoção',
        'promocoes': 'promoções',
        'educacao': 'educação',
        'atividade': 'atividade',
        'atividades': 'atividades',
        'devocional': 'devocional',
        'avaliacao': 'avaliação',
        'comunicacao': 'comunicação',
        'pedagogico': 'pedagógico',
        'pedagogica': 'pedagógica',
        'tecnologico': 'tecnológico',
        'tecnologica': 'tecnológica',
        'numero': 'número',
        'numeros': 'números',
        'unico': 'único',
        'unica': 'única',
        'pratico': 'prático',
        'pratica': 'prática',
        'saude': 'saúde',
        'voce': 'você',
        'tambem': 'também',
        'ate': 'até',
        'ja': 'já',
        'entao': 'então',
        'nao': 'não',
        'mae': 'mãe',
        'pao': 'pão',
        'cafe': 'café',
        'gratis': 'grátis',
        'aqui': 'aqui',
        'facil': 'fácil',
        'dificil': 'difícil',
        'possivel': 'possível',
        'impossivel': 'impossível',
        'incrivel': 'incrível',
        'maximo': 'máximo',
        'minimo': 'mínimo',
        'otimo': 'ótimo',
        'pessimo': 'péssimo',
        'necessario': 'necessário',
        'necessaria': 'necessária',
        'exclusivo': 'exclusivo',
        'exclusiva': 'exclusiva',
        'limitado': 'limitado',
        'limitada': 'limitada',
        // Common words with ção/ão endings (AI frequently renders ãn instead of ão)
        'porcao': 'porção',
        'acao': 'ação',
        'informacao': 'informação',
        'inscricao': 'inscrição',
        'inscricoes': 'inscrições',
        'alimentacao': 'alimentação',
        'apresentacao': 'apresentação',
        'atencao': 'atenção',
        'celebracao': 'celebração',
        'contribuicao': 'contribuição',
        'criacao': 'criação',
        'dedicacao': 'dedicação',
        'descricao': 'descrição',
        'devocao': 'devoção',
        'doacao': 'doação',
        'emocao': 'emoção',
        'estacao': 'estação',
        'fundacao': 'fundação',
        'geracao': 'geração',
        'gratidao': 'gratidão',
        'habitacao': 'habitação',
        'inovacao': 'inovação',
        'inspiracao': 'inspiração',
        'intencao': 'intenção',
        'locacao': 'locação',
        'motivacao': 'motivação',
        'nacao': 'nação',
        'nutricao': 'nutrição',
        'oportunidade': 'oportunidade',
        'oracao': 'oração',
        'oracoes': 'orações',
        'organizacao': 'organização',
        'protecao': 'proteção',
        'realizacao': 'realização',
        'refeicao': 'refeição',
        'salvacao': 'salvação',
        'situacao': 'situação',
        'solucao': 'solução',
        'transformacao': 'transformação',
        'vocacao': 'vocação',
        'visuals': 'visuais',
        'proximo': 'próximo',
    } as Record<string, string>
};

/**
 * Validates and corrects Portuguese text BEFORE sending to the AI.
 * Applies accent corrections from the dictionary.
 */
export function enforceCorrectSpelling(text: string): string {
    let correctedText = text;

    // Normalize for comparison (remove accents to find unaccented versions)
    Object.entries(SPELLING_ENFORCEMENT_RULES.pt_BR).forEach(([wrong, correct]) => {
        // Skip if wrong === correct (no correction needed)
        if (wrong === correct) return;

        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        correctedText = correctedText.replace(regex, (match) => {
            // Preserve capitalization
            if (match === match.toUpperCase()) {
                return correct.toUpperCase();
            }
            if (match[0] === match[0].toUpperCase()) {
                return correct.charAt(0).toUpperCase() + correct.slice(1);
            }
            return correct;
        });
    });

    return correctedText;
}

/**
 * Breaks a text into a character-by-character representation.
 * This helps AI models render text more accurately by forcing letter-level attention.
 * Example: "porção" → "p-o-r-ç-ã-o"
 */
function charByCharBreakdown(text: string): string {
    return text.split(' ').map(word => {
        return [...word].join('-');
    }).join('  ');
}

/**
 * Creates spelling enforcement rules to embed in the AI prompt.
 * Uses character-by-character breakdown to force accurate rendering.
 */
export function buildSpellingPromptSection(headline: string, ctaText?: string): string {
    const correctedHeadline = enforceCorrectSpelling(headline);
    const correctedCta = ctaText ? enforceCorrectSpelling(ctaText) : '';

    // Character breakdown for precise rendering
    const headlineChars = charByCharBreakdown(correctedHeadline);
    const ctaChars = correctedCta ? charByCharBreakdown(correctedCta) : '';

    // Find accented words
    const accentedWords = correctedHeadline.split(/\s+/)
        .concat(correctedCta ? correctedCta.split(/\s+/) : [])
        .filter(word => /[áéíóúãõçâêôàü]/i.test(word));

    let section = `
=== SPELLING REFERENCE (STRICT) ===
TARGET SENTENCE: "${correctedHeadline}"
Character Map: ${headlineChars}
${correctedCta ? `CTA Button Text: "${correctedCta}"
CTA Character Map: ${ctaChars}` : ''}

INSTRUCTION: 
1. The "Character Map" shows the EXACT spelling required.
2. DO NOT change, add, or remove any letters.
3. Write the text EXACTLY as shown in the TARGET SENTENCE.
`;

    if (accentedWords.length > 0) {
        section += `Attention: Using Portuguese Accents: ${accentedWords.map(w => `"${w}"`).join(', ')}`;
    }

    return section;
}
