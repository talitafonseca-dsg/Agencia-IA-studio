
export enum CreationType {
  SOCIAL_POST = 'Post para Redes Sociais',
  STUDIO_PHOTO = 'Foto de Estúdio com IA',
  MASCOT = 'Criar Mascote com IA',
  CREATIVE_BACKGROUND = 'Fundo Criativo / PPT',
  YOUTUBE_THUMB = 'Thumbnail para YouTube',
  MOCKUP = 'Criar Mockup Profissional'
}

export enum VisualStyle {
  MODERN = 'Moderno',
  PROFESSIONAL = 'Profissional',
  CREATIVE = 'Criativo',
  CLEAN = 'Clean',
  DARK = 'Dark',
  LUXURY = 'Luxo',
  MINIMALIST = 'Minimalista',
  TECH = 'Tecnológico',
  INFANTIL = 'Infantil',
  UGC_INSTAGRAM = 'UGC Instagram',
  EDITORIAL = 'Editorial',
  COMMERCIAL_PREMIUM = 'Comercial Premium',
  GLOW_BEAUTY = 'Glow Beauty',
  DESIGNI_PD_PRO = 'Design Pro',
  RELIGIOUS = 'Religioso',
  DELIVERY = 'Delivery & Food'
}

export enum StudioStyle {
  EXECUTIVO_PRO = 'Executivo Pro',
  EDITORIAL_VOGUE = 'Editorial Vogue',
  FITNESS_PRO = 'Fitness Pro',
  CYBERPUNK_NEON = 'Cyberpunk Neon',
  MINIMALIST_ZEN = 'Minimalist Zen',
  LUXURY_GOLD = 'Luxury Gold',
  URBAN_STREET = 'Urban Street',
  VINTAGE_FILM = 'Vintage Film',
  FUTURISTA_LAB = 'Futurista Lab',
  GLOW_BEAUTY = 'Glow Beauty',
  OLD_MONEY = 'Old Money',
  NATURE_FRESH = 'Eco Nature',
  INDUSTRIAL_CHIC = 'Industrial Chic',
  POP_ART = 'Pop Art Studio',
  COASTAL_LUXE = 'Coastal Luxe',
  // PROFISSÕES POPULARES
  CHEF_BUFFET = 'Chef de Buffet',
  CORRETOR_IMOVEIS = 'Corretor de Imóveis',
  VENDEDOR_CARROS = 'Vendedor de Carros',
  MEDICO_DENTISTA = 'Médico / Dentista',
  ADVOGADO = 'Advogado',
  PERSONAL_TRAINER = 'Personal Trainer',
  CABELEIREIRO = 'Cabeleireiro / Barbeiro',
  ARQUITETO = 'Arquiteto / Design Int.',
  TATUADOR = 'Tatuador',
  FOTOGRAFO = 'Fotógrafo',

  // NEW PROFESSIONS
  DESIGNER_GRAFICO = 'Designer Gráfico',
  MAQUIADORA = 'Maquiadora',
  NUTRICIONISTA = 'Nutricionista',
  ENGENHEIRO = 'Engenheiro Civil',
  PSICOLOGO = 'Psicólogo',

  // FAMILY STYLES
  FAMILY_STUDIO_CLEAN = 'Família: Estúdio Clean',
  FAMILY_LIFESTYLE_HOME = 'Família: Em Casa',
  FAMILY_GOLDEN_HOUR = 'Família: Pôr do Sol',
  FAMILY_BEACH = 'Família: Praia',
  FAMILY_CHRISTMAS = 'Família: Especial Natal'
}

export enum MascotStyle {
  PIXAR_3D = 'Estilo Disney/Pixar 3D',
  CARTOON_2D = 'Cartoon Clássico 2D',
  ANIME_MODERN = 'Anime Moderno',
  CLAYMATION = 'Massinha (Claymation)',
  FUNKO_POP = 'Boneco Funko Pop',
  HAND_DRAWN = 'Sketch / Desenhado à Mão',
  RETRO_PIXEL = 'Pixel Art Retrô',
  REALISTIC_PLUSHD = 'Pelúcia Realista'
}

export enum MockupStyle {
  TSHIRT = 'Camiseta / Vestuário',
  BRANDING = 'Identidade Visual / Papelaria',
  VEHICLE = 'Envelopamento de Veículo',
  MUG = 'Caneca / Cerâmica',
  PACKAGING = 'Embalagem / Caixa',
  SIGNAGE = 'Placa / Fachada',
  TOTE_BAG = 'Ecobag / Sacola',
  STATIONERY = 'Caderno / Agenda'
}

export const MockupStyleMeta: Record<MockupStyle, { description: string, color: string, imageUrl: string }> = {
  [MockupStyle.TSHIRT]: {
    description: 'Estampa em Modelo Real',
    color: 'from-blue-500/20',
    imageUrl: '/mockup-styles/tshirt.png'
  },
  [MockupStyle.BRANDING]: {
    description: 'Cartão, Envelope e Pasta',
    color: 'from-slate-500/20',
    imageUrl: '/mockup-styles/branding.png'
  },
  [MockupStyle.VEHICLE]: {
    description: 'Adesivagem Comercial',
    color: 'from-red-500/20',
    imageUrl: '/mockup-styles/vehicle.png'
  },
  [MockupStyle.MUG]: {
    description: 'Caneca Personalizada',
    color: 'from-orange-500/20',
    imageUrl: '/mockup-styles/mug.png'
  },
  [MockupStyle.PACKAGING]: {
    description: 'Design de Embalagem',
    color: 'from-green-500/20',
    imageUrl: '/mockup-styles/packaging.png'
  },
  [MockupStyle.SIGNAGE]: {
    description: 'Letreiro e Fachada',
    color: 'from-yellow-500/20',
    imageUrl: '/mockup-styles/signage.png'
  },
  [MockupStyle.TOTE_BAG]: {
    description: 'Sacola de Tecido',
    color: 'from-indigo-500/20',
    imageUrl: '/mockup-styles/tote-bag.png'
  },
  [MockupStyle.STATIONERY]: {
    description: 'Caderno e Anotações',
    color: 'from-pink-500/20',
    imageUrl: '/mockup-styles/stationery.png'
  }
}

export const MascotStyleMeta: Record<MascotStyle, { description: string, color: string, imageUrl: string }> = {
  [MascotStyle.PIXAR_3D]: {
    description: '3D Fofo & Expressivo',
    color: 'from-blue-500/20',
    imageUrl: '/mascot-styles/pixar-3d.png'
  },
  [MascotStyle.CARTOON_2D]: {
    description: 'Traços Planos & Vibrantes',
    color: 'from-red-500/20',
    imageUrl: '/mascot-styles/cartoon-2d.png'
  },
  [MascotStyle.ANIME_MODERN]: {
    description: 'Estilo Japonês Moderno',
    color: 'from-pink-500/20',
    imageUrl: '/mascot-styles/anime-modern.png'
  },
  [MascotStyle.CLAYMATION]: {
    description: 'Textura de Massinha',
    color: 'from-orange-500/20',
    imageUrl: '/mascot-styles/claymation.png'
  },
  [MascotStyle.FUNKO_POP]: {
    description: 'Cabeçudo & Colecionável',
    color: 'from-indigo-500/20',
    imageUrl: '/mascot-styles/funko-pop.png'
  },
  [MascotStyle.HAND_DRAWN]: {
    description: 'Artístico & Riscado',
    color: 'from-emerald-500/20',
    imageUrl: '/mascot-styles/hand-drawn.png'
  },
  [MascotStyle.RETRO_PIXEL]: {
    description: '8-bit Nostalgia',
    color: 'from-purple-500/20',
    imageUrl: '/mascot-styles/retro-pixel.png'
  },
  [MascotStyle.REALISTIC_PLUSHD]: {
    description: 'Pelúcia Fofinha',
    color: 'from-yellow-500/20',
    imageUrl: '/mascot-styles/realistic-plush.png'
  }
};

export const StudioStyleMeta: Record<StudioStyle, { description: string, color: string, imageUrl: string }> = {
  [StudioStyle.EXECUTIVO_PRO]: {
    description: 'Liderança & Autoridade',
    color: 'from-blue-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.EDITORIAL_VOGUE]: {
    description: 'Alta Moda & Contraste',
    color: 'from-purple-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.FITNESS_PRO]: {
    description: 'Performance & Força',
    color: 'from-red-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.CYBERPUNK_NEON]: {
    description: 'Futurismo & Cor',
    color: 'from-cyan-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.MINIMALIST_ZEN]: {
    description: 'Pureza & Luz Suave',
    color: 'from-stone-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.LUXURY_GOLD]: {
    description: 'Elegância & Opulência',
    color: 'from-amber-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.URBAN_STREET]: {
    description: 'Streetwear & Atitude',
    color: 'from-zinc-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.VINTAGE_FILM]: {
    description: 'Nostalgia & Granulado',
    color: 'from-orange-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.FUTURISTA_LAB]: {
    description: 'Inovação & Tech',
    color: 'from-indigo-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.GLOW_BEAUTY]: {
    description: 'Pele & Close-up',
    color: 'from-pink-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.OLD_MONEY]: {
    description: 'Herança & Elegância Discreta',
    color: 'from-amber-800/20',
    imageUrl: 'https://images.unsplash.com/photo-1550928431-ee0ec6db30d3?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.NATURE_FRESH]: {
    description: 'Orgânico & Sustentável',
    color: 'from-emerald-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.INDUSTRIAL_CHIC]: {
    description: 'Modern Loft & Concreto',
    color: 'from-gray-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.POP_ART]: {
    description: 'Cores Vibrantes & Plana',
    color: 'from-yellow-500/20',
    imageUrl: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.COASTAL_LUXE]: {
    description: 'Brisa do Mar & Verão',
    color: 'from-sky-500/20',
    imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80'
  },
  // PROFISSÕES POPULARES
  [StudioStyle.CHEF_BUFFET]: {
    description: 'Gastronomia & Eventos',
    color: 'from-orange-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.CORRETOR_IMOVEIS]: {
    description: 'Imóveis & Negócios',
    color: 'from-emerald-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.VENDEDOR_CARROS]: {
    description: 'Automóveis & Vendas',
    color: 'from-red-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.MEDICO_DENTISTA]: {
    description: 'Saúde & Bem-estar',
    color: 'from-teal-500/20',
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.ADVOGADO]: {
    description: 'Direito & Advocacia',
    color: 'from-amber-800/20',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.PERSONAL_TRAINER]: {
    description: 'Fitness & Saúde',
    color: 'from-lime-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.CABELEIREIRO]: {
    description: 'Beleza & Estilo',
    color: 'from-fuchsia-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.ARQUITETO]: {
    description: 'Arquitetura & Design',
    color: 'from-slate-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.TATUADOR]: {
    description: 'Arte & Tattoo',
    color: 'from-violet-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.FOTOGRAFO]: {
    description: 'Fotografia & Criação',
    color: 'from-rose-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=400&q=80'
  },

  // NOVOS PRESETS
  [StudioStyle.DESIGNER_GRAFICO]: {
    description: 'Criação Visual & Cores',
    color: 'from-purple-500/20',
    imageUrl: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.MAQUIADORA]: {
    description: 'Beleza & Make-up',
    color: 'from-pink-500/20',
    imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.NUTRICIONISTA]: {
    description: 'Nutrição & Saúde',
    color: 'from-green-500/20',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.ENGENHEIRO]: {
    description: 'Obras & Engenharia',
    color: 'from-orange-500/20',
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.PSICOLOGO]: {
    description: 'Terapia & Bem-estar',
    color: 'from-teal-500/20',
    imageUrl: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=400&q=80'
  },

  // FAMILY STYLES
  [StudioStyle.FAMILY_STUDIO_CLEAN]: {
    description: 'Fundo Branco & Clássico',
    color: 'from-gray-300/20',
    imageUrl: 'https://images.unsplash.com/photo-1581952976147-5a2d15560349?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.FAMILY_LIFESTYLE_HOME]: {
    description: 'Conforto de Casa',
    color: 'from-amber-100/20',
    imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.FAMILY_GOLDEN_HOUR]: {
    description: 'Pôr do Sol Emocional',
    color: 'from-orange-400/20',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.FAMILY_BEACH]: {
    description: 'Férias na Praia',
    color: 'from-cyan-400/20',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'
  },
  [StudioStyle.FAMILY_CHRISTMAS]: {
    description: 'Especial de Natal',
    color: 'from-red-600/20',
    imageUrl: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=400&q=80'
  }
};

export enum SocialClass {
  POPULAR = 'Popular / Simples',
  MIDDLE = 'Classe Média',
  LUXURY = 'Alta Renda / Luxo'
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT_3_4 = '3:4',
  STORY_9_16 = '9:16',
  LANDSCAPE_16_9 = '16:9',
  CLASSIC_4_3 = '4:3'
}

export enum ColorPalette {
  VIBRANT_RETAIL = 'Varejo Vibrante (Vermelho/Amarelo)',
  TECH_DARK = 'Tech Dark (Roxo/Neon)',
  LUXURY_GOLD = 'Luxo Gold (Preto/Dourado)',
  FRESH_NATURE = 'Fresh Nature (Verde/Branco)',
  MINIMAL_BW = 'Minimal Black & White',
  SUMMER_POP = 'Summer Pop (Laranja/Azul)',
  CORPORATE_BLUE = 'Corporate Blue (Azul Escuro/Cinza)'
}

export enum UGCEnvironment {
  HOME = 'Casa / Interior',
  OUTDOOR = 'Rua / Cidade',
  OFFICE = 'Escritório / Trabalho',
  STORE = 'Mercado / Loja',
  GYM = 'Academia / Esportes',
  NATURE = 'Parque / Natureza'
}

export enum UGCModel {
  WOMAN_20_30 = 'Mulher (20-30 anos)',
  WOMAN_30_40 = 'Mulher (30-40 anos)',
  MAN_20_30 = 'Homem (20-30 anos)',
  MAN_30_40 = 'Homem (30-40 anos)',
  CHILD = 'Criança (5-10 anos)',
  TEEN = 'Jovem / Teen (15-18 anos)',
  SENIOR = 'Idoso / Senior (60+ anos)'
}

export interface GenerationConfig {
  type: CreationType;
  style: VisualStyle;
  studioStyle?: StudioStyle;
  mascotStyle?: MascotStyle;
  mockupStyle?: MockupStyle;
  aspectRatio: AspectRatio;
  colorPalette?: ColorPalette;
  productDescription: string;
  copyText?: string;
  editPrompt?: string; // New: For Magic Edit instructions
  ctaText?: string;
  targetAudience?: string;
  socialClass?: SocialClass;
  ugcEnvironment?: UGCEnvironment;
  customEnvironment?: string;
  ugcModel?: UGCModel;
  designCount?: number;
  slideCount?: number;
  useAiAvatar?: boolean;
  isEditableMode?: boolean;
  useBoxLayout?: boolean;
  brandColors?: string[]; // New: Store hex codes for strict branding
}

export interface GeneratedImage {
  id: string;
  url: string;
  originalUrl?: string; // Clean background without baked text
  variation: number;
  slides?: string[];
  layoutMode?: 'default' | 'box';
}
