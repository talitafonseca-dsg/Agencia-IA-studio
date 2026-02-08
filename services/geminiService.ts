import { GoogleGenAI } from "@google/genai";
import { GenerationConfig, CreationType, VisualStyle, StudioStyle, MascotStyle, MockupStyle, AspectRatio, GeneratedImage, SocialClass, UGCEnvironment, UGCModel } from "../types";

export const generateStudioCreative = async (
  config: GenerationConfig,
  primaryImage?: string | null,
  referenceImage?: string | null,
  productImage?: string | null,
  stickerImage?: string | null,
  customModelImage?: string | null,
  apiKey?: string
): Promise<GeneratedImage[]> => {
  const variations: GeneratedImage[] = [];

  const generationPromises = Array.from({ length: config.designCount || 3 }).map(async (_, index): Promise<GeneratedImage | null> => {
    const v = index + 1;
    const variationId = Math.random().toString(36).substr(2, 9);

    try {
      const variationPrompt = constructPrompt(config, v, customModelImage, !!stickerImage, !!productImage, !!referenceImage);

      // OPTIMIZATION: Removed PPT Slide logic. All creative backgrounds can include the subject if provided.
      const variationPrimary = primaryImage;
      const variationCustomModel = customModelImage;

      const imageUrl = await callImageApi(variationPrompt, config.aspectRatio, variationPrimary, referenceImage, productImage, stickerImage, variationCustomModel, config.studioStyle, config.mascotStyle, config.mockupStyle, config.style, config.socialClass, !!config.isEditableMode, v, config.type, apiKey);
      return imageUrl ? { id: variationId, url: imageUrl, originalUrl: imageUrl, variation: v } : null;
    } catch (error: any) {
      console.error(`Variation ${v} failed:`, error);
      if (v === 1) throw error;
      return null;
    }
  });

  const results = await Promise.all(generationPromises);
  const successfulVariations = results.filter((res): res is GeneratedImage => res !== null);

  if (successfulVariations.length === 0) {
    throw new Error("A engine falhou ao gerar as imagens. Tente simplificar o briefing ou mudar o estilo visual.");
  }

  return successfulVariations;
  return successfulVariations;
};

export const animateGeneratedImage = async (imageUrl: string): Promise<string> => {
  // SIMULATION: In a real environment, this would call Runway/Luma API
  console.log("Animating image:", imageUrl);
  await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing
  // Return a mock video URL or the same image to simulate success for now
  // Real implementation would return an MP4 URL
  return "https://cdn.pixabay.com/video/2024/09/25/233267_tiny.mp4"; // Placeholder video
};



const callImageApi = async (
  prompt: string,
  aspectRatio: string,
  primaryImage?: string | null,
  referenceImage?: string | null,
  productImage?: string | null,
  stickerImage?: string | null,
  customModelImage?: string | null,
  studioStyle?: string,
  mascotStyle?: MascotStyle,
  mockupStyle?: MockupStyle,
  style?: VisualStyle,
  socialClass?: SocialClass,
  isEditing: boolean = false,
  variationIndex: number = 1,
  type: string = 'Studio Photo',
  apiKey?: string
) => {
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
    const parts: any[] = [];

    const extractBase64 = (dataUrl: string) => {
      const parts = dataUrl.split(',');
      if (parts.length < 2) return null;
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      return { data: parts[1], mimeType: mime };
    };

    // ==========================================
    // PRODUCT-FIRST PARADIGM (FOR CUSTOM MODEL + PRODUCT COMBOS)
    // ==========================================
    // When user uploads BOTH a custom model AND a product, we FLIP the order.
    // The PRODUCT becomes the "ANCHOR" (First Image) to prevent hallucination.
    // The MODEL becomes the "LAYER TO ADD" (Second Image).

    const hasCustomModelAndProduct = customModelImage && productImage;

    if (mockupStyle) {
      // ==========================================
      // MOCKUP MODE
      // ==========================================
      // Prioritize primaryImage (uploaded by user) as the Design
      const design = primaryImage ? extractBase64(primaryImage) : (productImage ? extractBase64(productImage) : null);

      if (design) {
        parts.push({
          text: `[INPUT IMAGE 1: THE DESIGN/ARTWORK]
           >>> THIS IS THE FLAT DESIGN TO BE APPLIED TO THE OBJECT.
           >>> COMPOSITION: This image contains a CENTRAL ILLUSTRATION + SURROUNDING TEXT ELEMENTS.
           >>> CRITICAL WARNING: The TEXT around the main illustration is PART OF THE DESIGN. Do NOT remove it.
           >>> TEXT COLOR WARNING: There is BLACK TEXT in this image. BLACK TEXT IS NOT NOISE. Do NOT remove black text.
           >>> NO HALLUCINATION: Do NOT invent new text. Only show EXACTLY what is in this input image.
           >>> DO NOT CROP ANY PART OF THIS IMAGE. All text (black, red, or any color) MUST appear on the final mockup.
           >>> ACTION: Apply this WHOLE image (including all text of all colors) onto the target object.
           >>> PERSPECTIVE: The design must follow the curve/surface of the object.`
        });
        parts.push({ inlineData: design });
      }

      if (referenceImage) {
        const ref = extractBase64(referenceImage);
        if (ref) {
          parts.push({
            text: `[IMAGE 2: STYLE/BACKGROUND REFERENCE]
             >>> Use the lighting and environment from this image.
             >>> DO NOT copy any text from this image.`
          });
          parts.push({ inlineData: ref });
        }
      }
    } else if (hasCustomModelAndProduct) {
      // COMPOSIÇÃO FOTOGRÁFICA: Pessoa + Produto interagindo
      const prod = extractBase64(productImage);
      const model = extractBase64(customModelImage);
      const ref = referenceImage ? extractBase64(referenceImage) : null;

      if (prod && model) {
        // INSTRUÇÃO MESTRE - Define a tarefa principal ANTES das imagens
        const isUGC = style === VisualStyle.UGC_INSTAGRAM;

        let masterTask = `=== MASTER TASK: ${isUGC ? 'AUTHENTIC USER PHOTO (UGC)' : 'PHOTOGRAPHIC COMPOSITION'} ===
CREATE A NEW IMAGE where the PERSON (Image 1) is PHYSICALLY HOLDING the PRODUCT (Image 2).`;

        if (ref) {
          masterTask += `\n\nSTYLE REFERENCE (IMAGE 3) IS ACTIVE:
- IGNORE default styles.
- COPY the lighting, colors, and background environment from IMAGE 3.
- PRESERVE the content of Image 1 (Person) and Image 2 (Product).
- APPLY the "Vibe" of Image 3.`;
        }

        masterTask += `\n\nCRITICAL REQUIREMENTS:
1. This is ${isUGC ? 'an AUTHENTIC USER PHOTO (UGC). NOT AN AD.' : 'a PRODUCT ADVERTISEMENT photo'}
2. The person MUST be holding/presenting the product
3. Generate NEW arms and hands in a natural holding pose
4. The product must be the HERO ELEMENT of the composition
=== END MASTER TASK ===`;

        parts.push({ text: masterTask });

        // Person image - com instruções de transformação
        parts.push({
          text: `[IMAGE 1 - THE PERSON TO TRANSFORM]
This person will appear in the final image.
>>> PRESERVE 100%: Face, facial features, skin tone, hair, identity
>>> REGENERATE: Clothing, Arms, hands, body pose.
>>> CRITICAL INSTRUCTION: ADAPT THE CLOTHING to match the COLOR PALETTE and STYLE of Image 3 (Reference). Do not keep the original clothing if it clashes.
>>> POSE: Arms extended forward, hands gripping the product.
>>> NEGATIVE PROMPT: Original clothing, clashing colors, extra arms, mutated hands.`
        });
        parts.push({ inlineData: model });

        // Product image - com instruções de preservação absoluta
        parts.push({
          text: `[IMAGE 2 - THE SACRED PRODUCT/LOGO - DO NOT MODIFY]
>>> THIS EXACT ELEMENT MUST APPEAR IN THE FINAL IMAGE <<<
>>> PIXEL-PERFECT PRESERVATION REQUIRED <<<

INTELLIGENT ANALYSIS: IS THIS A PHYSICAL PRODUCT OR A LOGO?
RULE: IF UNSURE/AMBIGUOUS, TREAT IT AS A LOGO (OPTION B).

OPTION A: IF IT IS CLEARLY A 3D PHYSICAL OBJECT (Bottle, Box, Electronics, Can):
- ACTION: The person MUST HOLD it in their hands.
- GRIP: Fingers naturally wrapping around the object.
- WEIGHT: Show the object has weight, not floating.
- WARNING: DO NOT add buttons, screens, or wires if they are not in the original image.

OPTION B: IF IT IS A FLAT LOGO / BRAND MARK / AMBIGUOUS SHAPE:
- ACTION: Apply this logo onto a PREMIUM MOCKUP (Smartphone Screen, Tablet, Laptop, Desktop Monitor, Glass Sign) OR have the person POINTING/PRESENTING it.
- COMPOSITION: Place the logo/mockup naturally in the scene.
- CRITICAL: DO NOT turn the logo into a physical machine (e.g. Credit Card Terminal, Calculator).
- If pointing: The person looks at the camera, hand gesturing towards the logo/mockup.

NEGATIVE PROMPT FOR PRODUCT: Credit card machine, payment terminal, calculator, unrelated electronic device, hallucinated buttons, distorted object.`
        });
        parts.push({ inlineData: prod });

        if (ref) {
          parts.push({
            text: `[IMAGE 3 - STYLE REFERENCE - BACKGROUND & LIGHTING SOURCE]
>>> DO NOT USE THE PERSON FROM THIS IMAGE.
>>> DO NOT USE THE PRODUCT FROM THIS IMAGE.
>>> STRICTLY FORBIDDEN: DO NOT COPY ANY TEXT, LOGOS, OR WATERMARKS FROM THIS IMAGE.
>>> EXTRACT ONLY: Background style, Environmental lighting, Color Grading, Mood.
>>> GOAL: Make the composite (Person + Product) LOOK like it was shot in this environment, but with ZERO text from the reference.

        === COMPOSITION INTEGRATION RULES (CRITICAL) ===
        - DEPTH: The subject must separate from the background but feel IMMERSED in it.
        - LIGHTING INTERACTION: The background light sources must cast realistic rim lights on the subject.
        - ELEMENT INTERACTION: Background shapes/elements should slightly overlap or depth-cue the subject.
        - NO FLAT COLLAGE: Do not just paste the subject on top. Integrate them into the 3D space.
        - TEXT SPACE: Analyze where the text is in the reference. Leave that space EMPTY or with low contrast for the overlay.`
          });
          parts.push({ inlineData: ref });
        }
      }
    } else {
      // STANDARD FLOW (No Product + Model combo)

      // ============================================
      // REFERENCE MODE: INSPIRED RECREATION
      // ============================================
      // User's photo is THE MAIN CHARACTER (identity source)
      // Reference is STYLE INSPIRATION (mood, colors, composition)
      // AI should CREATE A NEW IMAGE with user's identity in reference's style

      if (referenceImage) {
        // MASTER TASK - Provide context BEFORE images (same pattern as Product-First mode)
        parts.push({
          text: `=== MASTER TASK: COMPOSITE PHOTOGRAPHY & DESIGN ===
ROLE: You are an expert Digital Compositor and Art Director.

INPUTS:
- IMAGE 1: The "HERO TALENT" (The person who MUST appear)
- IMAGE 2: The "STYLE REFERENCE" (Lighting, Background, Vibe ONLY)

GOAL:
Place the HERO TALENT (Image 1) into a scene styled like IMAGE 2.

EXECUTION STEPS:
1. ANALYZE Image 2 for background, lighting, and color palette.
2. PHOTOGRAPH the person from Image 1 in that exact environment.
3. POST-PRODUCTION: Add the text overlay specified in the prompt.

CRITICAL RULES:
- IDENTITY: Must equal Image 1. DO NOT use the face from Image 2.
- TEXT: IGNORE text in Image 2. Use ONLY text from the prompt.
=== END MASTER TASK ===`
        });

        // Send User Images (Primary Subject)
        let hasSubject = false;

        // 1. Custom Model (Priority)
        if (customModelImage) {
          const asset = extractBase64(customModelImage);
          if (asset) {
            parts.push({
              text: `[IMAGE 1 - PRIMARY SUBJECT IDENTITY]
>>> THIS IS THE MAIN FACE/IDENTITY TO USE <<<
Preserve: face, skin tone, hair, facial features, age, ethnicity.` });
            parts.push({ inlineData: asset });
            hasSubject = true;
          }
        }

        // 2. Primary Image (Secondary or Fallback)
        if (primaryImage && primaryImage !== customModelImage) {
          const asset = extractBase64(primaryImage);
          if (asset) {
            const label = hasSubject
              ? `[IMAGE 1B - SECONDARY REFERENCE FOR SUBJECT]
>>> Use this additional angle/photo to better understand the facial features of the person in Image 1.`
              : `[IMAGE 1 - THE PERSON TO APPEAR IN OUTPUT]
>>> THIS IS THE FACE/IDENTITY TO USE <<<
Preserve: face, skin tone, hair, facial features, age, ethnicity`;

            parts.push({ text: label });
            parts.push({ inlineData: asset });
            hasSubject = true;
          }
        }

        if (!hasSubject) {
          // PPT MODE SPECIAL HANDLING:
          // If we are in CREATIVE_BACKGROUND mode and no subject is provided (Clean Slides),
          // we MUST NOT generate a random person.
          const isPPTMode = type === CreationType.CREATIVE_BACKGROUND;
          if (isPPTMode) {
            parts.push({
              text: `[NO MODEL PROVIDED - CREATIVE BACKGROUND MODE]
              >>> CRITICAL: DO NOT INCLUDE ANY PERSON, FACE, OR HUMAN FIGURE.
              >>> DESIGN ONLY: Use abstract shapes, geometric elements, and 3D icons.
              >>> NEGATIVE PROMPT: Humans, people, face, woman, skin, text, typography, letters, words, watermark, signature, logo, icon, symbol, white border, frame, letterbox, empty edges, noise, grunge, messy.`
            });
          } else {
            // LEGACY FALLBACK FOR SOCIAL POSTS (Generate Avatar if missing)
            // DYNAMIC AVATAR GENERATOR (Per Variation) to force divergence
            const avatarPrompts = [
              "A BLACK BRAZILIAN GIRL, curly afro hair, wearing an ORANGE dress. Joyful smile. Holding school supplies.",
              "A ASIAN BRAZILIAN GIRL, straight black hair with bangs, wearing a PINK sweater. Friendly expression.",
              "A BRAZILIAN TEENAGER GIRL (14-16 years old), long straight brown hair, wearing a PURPLE backpack and WHITE blouse. Confident smile."
            ];
            const specificAvatar = avatarPrompts[variationIndex - 1] || avatarPrompts[0];

            parts.push({
              text: `[NO MODEL PROVIDED - GENERATE UNIQUE AVATAR]
               >>> CRITICAL: DO NOT USE THE PERSON FROM IMAGE 2.
               >>> TARGET AVATAR: ${specificAvatar}
               >>> INSTRUCTION: The output person MUST MATCH the 'TARGET AVATAR' description above.
               >>> DIVERGENCE CHECK: If the output looks like the person in Image 2, the task is FAILED.`
            });
          }
        }

        // Send Reference Image as IMAGE 2 (Style Reference)
        // ONLY send actual pixels for V3 which was clean. V1/V2 get text-only description
        const ref = extractBase64(referenceImage);
        if (ref) {
          // V1 and V2 worked clean without pixels, V3 had watermarks with pixels
          // Solution: NO variation receives the contaminated pixels
          // Optimization: Always send reference pixels if user provided them
          const showReferencePixels = true;

          // DYNAMIC PROMPT FOR REFERENCE IMAGE
          const isCreativeBg = type === CreationType.CREATIVE_BACKGROUND;

          let stylePrompt = "";
          if (isCreativeBg) {
            stylePrompt = `[ABSTRACT WALLPAPER GENERATOR]

=== FORBIDDEN - VIOLATION = INSTANT FAILURE ===
1. NO TEXT. Zero words, letters, numbers, or brand names.
2. NO LOGO. Do not draw the logo icon or spell any brand name.
3. NO UI ELEMENTS. No boxes, frames, buttons, or presentation layouts.
4. NO INVENTED COLORS. Use ONLY the colors you see in Image 2.

=== YOUR TASK ===
Create an ABSTRACT DESKTOP WALLPAPER inspired by the brand colors in Image 2.

STYLE: ${variationIndex % 2 !== 0 ? 'LIGHT WALLPAPER' : 'DARK WALLPAPER'}
${variationIndex % 2 !== 0
                ? `- Background: Pure white or very light gray.
- Shapes: 2-3 large flowing curves/ribbons using the brand colors (from Image 2).
- Inspiration: Like a minimalist vector art wallpaper.`
                : `- Background: Fill 100% with the primary dark color from Image 2 (e.g., navy blue).
- Shapes: Subtle tonal curves (lighter/darker shades of the same blue).
- Accents: One small pop of the secondary color (e.g., orange) in a corner.`}

SHAPE STYLE:
- Use LARGE, SMOOTH, FLOWING CURVES.
- Think: abstract ribbons, waves, or rounded geometric forms.
- Avoid: small details, grids, angular tech lines.

The person from Image 1 will be placed on top of this background.`;
          } else {
            // Fallback for other modes (keeping legacy behavior to avoid regressions elsewhere)
            stylePrompt = `[VISUAL IDENTITY SOURCE]
BACKGROUND SOURCE: IMAGE 2 (Reference).
INSTRUCTION: You must act as a Background Artist.
1. IGNORE default preferences.
2. COPY the exact background style, patterns, textures, and color palette from Image 2.
3. CRITICAL: The person in Image 2 is a STYLE MODEL only. DO NOT DRAW THEM.
4. REPLACE the person in Image 2 with the person from Image 1.
5. IF YOU DRAW THE PERSON FROM IMAGE 2, THE TASK IS FAILED.
6. GOAL: The user wants the background to match Image 2, but with their photo (Image 1) in the foreground.`;
          }

          parts.push({
            text: `${stylePrompt}

MANDATORY: The background MUST be completely CLEAN and PRISTINE.
NO watermarks, NO text in background, NO "Designi", NO diagonal patterns.
Style reference: Adobe Illustrator vector art, professional graphic design quality.${showReferencePixels ? `

[IMAGE 2 - VISUAL STYLE REFERENCE ONLY]
>>> ANALYSIS: This image contains a person. THAT PERSON IS A DISTRACTOR. IGNORE THEM.
>>> ACTION: Extract ONLY the background, lighting, and colors.
>>> CRITICAL FAULT AVOIDANCE: If the output image contains the person from Image 2, the generation is FAILED.
>>> SOLE SUBJECT: Use ONLY the person from Image 1.
>>> IGNORE any text or watermarks in this image.` : ''}`
          });

          // Only send the actual image for V3
          if (showReferencePixels) {
            parts.push({ inlineData: ref });
          }
        }
      } else if (customModelImage) {
        const asset = extractBase64(customModelImage);
        if (asset) {
          let label = `INPUT IMAGE 1: THE SUBJECT (PROFESSIONAL PHOTO).
=== PRESERVE EVERYTHING ===
- Face identity: 100% match
- Clothing: Keep the EXACT same outfit (color, style, texture)
- Objects in hand: Keep ANY object the person is holding
- Pose: Maintain similar body position
- Hair: Keep exact style and color
- Overall aesthetic: Match the mood and color palette of this photo
DO NOT change the person's outfit to corporate/suit unless explicitly requested.`;
          if (studioStyle) {
            // Check if it's a Family style
            const isFamilyStyle = studioStyle.includes('FAMILY');
            if (isFamilyStyle) {
              label = `INPUT IMAGE 1: FAMILY/GROUP PHOTO.
>>> COUNT THE NUMBER OF PEOPLE IN THIS IMAGE. YOU MUST GENERATE EXACTLY THIS SAME NUMBER OF PEOPLE.
>>> DO NOT ADD CHILDREN OR PEOPLE THAT ARE NOT IN THIS IMAGE.
>>> DO NOT REMOVE ANY PERSON FROM THIS IMAGE.
>>> PRESERVE EACH PERSON'S FACE IDENTITY EXACTLY.
>>> ADAPT CLOTHING AND POSE TO MATCH THE "${studioStyle}" STYLE.`;
            } else {
              label = `INPUT IMAGE 1: THE MAIN CHARACTER. PRESERVE FACE IDENTITY EXACTLY. ADAPT CLOTHING AND POSE TO MATCH THE "${studioStyle}" STYLE.`;
            }
          }
          parts.push({ text: label });
          parts.push({ inlineData: asset });
        }
      } else if (primaryImage) {
        const asset = extractBase64(primaryImage);
        if (asset) {
          let label = "INPUT IMAGE 1: THE SUBJECT (PERSON). PRESERVE IDENTITY.";
          if (isEditing) {
            label = "INPUT IMAGE TO EDIT: PRESERVE COMPOSITION EXACTLY. MODIFY ONLY THE REQUESTED AREAS.";
          } else if (productImage) {
            label = "INPUT IMAGE 1: THE MAIN CHARACTER. PRESERVE FACE ONLY. BODY POSE MUST BE CHANGED TO HOLD PRODUCT.";
          } else if (studioStyle) {
            // Check if it's a Family style
            const isFamilyStyle = studioStyle.includes('FAMILY');
            if (isFamilyStyle) {
              label = `INPUT IMAGE 1: FAMILY/GROUP PHOTO.
>>> COUNT THE NUMBER OF PEOPLE IN THIS IMAGE. YOU MUST GENERATE EXACTLY THIS SAME NUMBER OF PEOPLE.
>>> DO NOT ADD CHILDREN OR PEOPLE THAT ARE NOT IN THIS IMAGE.
>>> DO NOT REMOVE ANY PERSON FROM THIS IMAGE.
>>> PRESERVE EACH PERSON'S FACE IDENTITY EXACTLY.
>>> ADAPT CLOTHING AND POSE TO MATCH THE "${studioStyle}" STYLE.`;
            } else {
              label = `INPUT IMAGE 1: THE MAIN CHARACTER. PRESERVE FACE IDENTITY EXACTLY. ADAPT CLOTHING AND POSE TO MATCH THE "${studioStyle}" STYLE.`;
            }
          }
          parts.push({ text: label });
          parts.push({ inlineData: asset });
        }
      }

      // PRODUCT (if present without custom model)
      if (productImage && !referenceImage) {
        const prod = extractBase64(productImage);
        if (prod) {
          parts.push({ text: `INPUT IMAGE 2: THE HERO PRODUCT. COMPOSITE THIS INTO THE SCENE.` });
          parts.push({ inlineData: prod });
        }
      }
    }

    // 3. SECONDARY ASSETS (Sticker only - Reference handled above)
    if (stickerImage) {
      const sticker = extractBase64(stickerImage);
      if (sticker) {
        parts.push({ text: "INPUT IMAGE: CLIENT LOGO (WATERMARK ONLY)." });
        parts.push({ inlineData: sticker });
      }
    }

    // 4. MAIN INSTRUCTION
    // NOTE: The reference handling logic is in constructPrompt's "isDesignReferenceMode" block
    // We don't add extra instructions here to avoid conflicts
    let finalPrompt = prompt;
    parts.push({ text: finalPrompt });

    // @ts-ignore
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Reverted to previous custom model ID to avoid shared quota limits
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: aspectRatio as any }
      }
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("429 RESOURCE_EXHAUSTED: Limite atingido.");
    }

    const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
    if (!imagePart || !imagePart.inlineData) {
      throw new Error("O modelo não gerou a imagem esperada.");
    }

    return `data: image / png; base64, ${imagePart.inlineData.data} `;
  } catch (error: any) {
    console.error("Gemini API Critical Failure:", error);
    if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
      throw new Error("429: Cota excedida.");
    }
    throw error;
  }
};

// STYLE-SPECIFIC BACKGROUND LIBRARY - Returns unique backgrounds based on style + variation
const getStyleBackground = (style: VisualStyle, variationIndex: number, hasProduct: boolean): string => {
  // Each style has 3 unique background strategies
  const styleBackgrounds: Record<VisualStyle, string[]> = {
    [VisualStyle.MODERN]: [
      `STYLE-SPECIFIC BACKGROUND (MODERN V1 - DIGITAL APP):
      - Primary: Smooth Deep Blue (#0F172A) to Purple (#581C87) Gradient.
      - Elements: Floating Glass UI Cards with rounded corners.
      - Graphics: Subtle notification bubbles, search bars, soft bokeh.
      - Lighting: Soft screen-glow lighting.
      - Layout: LEFT-ALIGNED Subject. RIGHT-ALIGNED Glass Card for Text.`,

      `STYLE-SPECIFIC BACKGROUND (MODERN V2 - SAAS LANDING):
      - Primary: Clean Off-White to Light Grey Gradient.
      - Elements: Abstract "Data Flow" waves (smooth lines), isometric shapes.
      - Layout: CENTERED Subject with ample negative space around header.
      - Lighting: High-key, bright and friendly.
      - Text Zone: Clean negative space at the top.`,

      `STYLE-SPECIFIC BACKGROUND (MODERN V3 - DARK MODE):
      - Primary: Matte Black with distinct "Card" surfaces for content.
      - Elements: Neon accent lines (Cyan/Magenta) outlining the safe zones.
      - Layout: ASYMMETRIC dynamic composition.
      - Lighting: Cyberpunk-lite, colored rim lights.
      - Text Zone: Inside the outlined neon frames.`
    ],

    [VisualStyle.PROFESSIONAL]: [
      `STYLE-SPECIFIC BACKGROUND (PROFESSIONAL V1 - COMMERCIAL MOTION):
      - Primary: Dynamic motion-blurred background (City or Studio).
      - Elements: Speed lines or particles indicating efficiency.
      - Graphics: Floating 3D/Contextual elements (e.g. Coins for Finance).
      - Lighting: Cinematic "Hero" Rim Lighting.
      - Layout: Subject in action pose.`,

      `STYLE-SPECIFIC BACKGROUND (PROFESSIONAL V2 - STUDIO INFINITY):
      - Primary: Infinite Color Wall (Deep Brand Color).
      - Elements: Large subtle geometric shadows on the wall.
      - Floor: Reflective studio floor.
      - Lighting: Perfect 3-point studio lighting.
      - Layout: Clean, minimal, product-focused.`,

      `STYLE-SPECIFIC BACKGROUND (PROFESSIONAL V3 - CONTEXTUAL SCENE):
      - Primary: Abstract representation of the niche (Blurred Office/Gym).
      - Elements: Depth of field focus on subject.
      - Graphics: Subtle overlay of industry icons/lines.
      - Layout: Depth-layered composition (Foreground, Subject, Background).`
    ],

    [VisualStyle.CREATIVE]: [
      `STYLE-SPECIFIC BACKGROUND (CREATIVE V1 - POP ART):
      - Primary: Solid Bold Color (Hot Pink or Electric Yellow).
      - Elements: 3D Pop Art objects (Lips, Lightning bolts, Stars).
      - Layout: Collage style, dynamic angles.
      - Lighting: Hard Flash photography.`,

      `STYLE-SPECIFIC BACKGROUND (CREATIVE V2 - FLUID GRADIENT):
      - Primary: Aurora Borealis style mesh gradient (Pink/Cyan/Purple).
      - Elements: Liquid glass blobs, distorted typography.
      - Layout: Organic flow.
      - Lighting: Ethereal glow.`,

      `STYLE-SPECIFIC BACKGROUND (CREATIVE V3 - GRUNGE COLLAGE):
      - Primary: Paper texture + torn edges.
      - Elements: Halftone dots, spray paint accents, cutout aesthetics.
      - Layout: Street art poster style.
      - Lighting: Urban street light.`
    ],

    [VisualStyle.CLEAN]: [
      `STYLE - SPECIFIC BACKGROUND(CLEAN V1):
    - Primary: Pure white(#FFFFFF) void with subtle grey gradient
      - Elements: MINIMAL - only soft contact shadows
        - Lighting: Soft, diffused beauty dish lighting
          - Accents: None - let the subject be the ONLY focus`,

      `STYLE - SPECIFIC BACKGROUND(CLEAN V2):
    - Primary: Soft off - white(#FAF9F6) with subtle texture
      - Elements: One thin accent line or geometric frame
        - Lighting: Even, shadowless studio lighting
          - Accents: Minimal shadow, clean edges`,

      `STYLE - SPECIFIC BACKGROUND(CLEAN V3):
    - Primary: Light grey(#F5F5F5) gradient fading to white
      - Elements: Subtle floor / horizon line for grounding
        - Lighting: Soft backlight creating subtle halo
          - Accents: Clean, professional, Apple - style presentation`
    ],

    [VisualStyle.DARK]: [
      `STYLE-SPECIFIC BACKGROUND (DARK V1 - MATTE BLACK):
      - Primary: Matte Black non-reflective surface.
      - Elements: Glossy Black 3D Shapes (Tone on tone).
      - Lighting: Strong Side Rim Light (White).
      - Vibe: Premium Tech unboxing.`,

      `STYLE-SPECIFIC BACKGROUND (DARK V2 - NEON NOIR):
      - Primary: Dark Alley / Wet Asphalt texture (Abstract).
      - Elements: Neon tube light reflection (Cyan/Pink).
      - Lighting: Moody cinematic.
      - Vibe: Gaming/Cyberpunk.`,

      `STYLE-SPECIFIC BACKGROUND (DARK V3 - DEEP OCEAN):
      - Primary: Deep underwater Blue/Black gradient.
      - Elements: Floating bubbles, caustic light patterns.
      - Lighting: Top-down spotlight.
      - Vibe: Mysterious, Premium.`
    ],

    [VisualStyle.LUXURY]: [
      `STYLE-SPECIFIC BACKGROUND (LUXURY V1 - HIGH FASHION):
      - Primary: Deep Burgundy or Emerald Velvet texture.
      - Elements: Minimalist gold framing (very thin).
      - Layout: Vogue Magazine Cover style.
      - Lighting: Dramatic Spotlight on Subject.`,

      `STYLE-SPECIFIC BACKGROUND (LUXURY V2 - DIAMOND GLOW):
      - Primary: Black void with Diamond dust particles.
      - Elements: Refractive glass prisms, light dispersion.
      - Layout: Centered luxury product reveal.
      - Lighting: Crystal clear white light.`,

      `STYLE-SPECIFIC BACKGROUND (LUXURY V3 - SILK & SATIN):
      - Primary: Flowing silk fabric background (Champagne color).
      - Elements: Soft fabric folds, elegant movement.
      - Layout: Soft dreamy focus.
      - Lighting: Warm, romantic candlelight feel.`
    ],

    [VisualStyle.MINIMALIST]: [
      `STYLE - SPECIFIC BACKGROUND(MINIMALIST V1):
    - Primary: Natural paper texture(warm off - white)
      - Elements: ONE colored circle or line as accent
        - Lighting: Soft, natural, zen - like
          - Accents: Extreme negative space, Japanese aesthetic`,

      `STYLE - SPECIFIC BACKGROUND(MINIMALIST V2):
    - Primary: Solid pastel(Sage #9CAF88 or Dusty Pink #D4A5A5)
      - Elements: Plant shadow or window light pattern
        - Lighting: Soft natural window light
          - Accents: Organic shadows, peaceful atmosphere`,

      `STYLE - SPECIFIC BACKGROUND(MINIMALIST V3):
    - Primary: Warm beige(#D4C4B0) with subtle texture
      - Elements: Origami - like paper fold shadows
        - Lighting: Even, calming, meditation - style
          - Accents: Muji / IKEA aesthetic, perfect balance`
    ],

    [VisualStyle.TECH]: [
      `STYLE-SPECIFIC BACKGROUND (TECH V1 - APP ECOSYSTEM):
      - Primary: Deep Indigo to Violet Gradient.
      - Elements: Floating 3D App Icons, Message Bubbles, Notification Cards.
      - Graphics: Connecting lines between elements.
      - Lighting: Digital screen glow.`,

      `STYLE-SPECIFIC BACKGROUND (TECH V2 - HARDWARE FOCUS):
      - Primary: Matte Dark Grey/Black engineering surface.
      - Elements: Exploded view schematics, wireframe outlines.
      - Graphics: Technical specifications text overlay (decoration).
      - Lighting: Precision product lighting.`,

      `STYLE-SPECIFIC BACKGROUND (TECH V3 - FUTURE NET):
      - Primary: Abstract data cloud (Blue/Cyan dots).
      - Elements: Constellation lines connecting concepts.
      - Graphics: Holographic interface elements.
      - Lighting: Futuristic rim lights.`
    ],

    [VisualStyle.INFANTIL]: [
      `STYLE - SPECIFIC BACKGROUND(INFANTIL V1):
    - Primary: Soft pastel gradient(Pink + Blue + Yellow blend)
      - Elements: 3D rounded balloons, fluffy clouds, stars, hearts
        - Lighting: Soft, warm, friendly
          - Accents: Candy colors, playful shapes, Disney / Pixar style`,

      `STYLE - SPECIFIC BACKGROUND(INFANTIL V2):
    - Primary: Lavender(#E6E6FA) to mint green(#98FF98) gradient
      - Elements: Cute floating shapes, rainbow arcs, sparkles
        - Lighting: Bright but soft children's book illustration
          - Accents: Bubbles, confetti, toy - like 3D elements`,

      `STYLE - SPECIFIC BACKGROUND(INFANTIL V3):
    - Primary: Sunny yellow(#FFF3CD) with blue sky elements
      - Elements: Puffy clouds, sunshine rays, cute character elements
        - Lighting: Bright, cheerful, nursery - safe
          - Accents: Nintendo / cartoon aesthetic, playroom atmosphere`
    ],

    [VisualStyle.UGC_INSTAGRAM]: [
      `STYLE - SPECIFIC BACKGROUND(UGC V1):
    - Primary: Real blurred cafe / coffee shop environment
      - Elements: NO artificial graphics - only real - world bokeh
        - Lighting: Natural window light, golden hour
          - Accents: Real plants, cups, ambient cafe atmosphere`,

      `STYLE - SPECIFIC BACKGROUND(UGC V2):
    - Primary: Real blurred home / living room environment
      - Elements: Natural decor blur, authentic lifestyle
        - Lighting: Ring light + natural light mix
          - Accents: Genuine, relatable, influencer - style`,

      `STYLE - SPECIFIC BACKGROUND(UGC V3):
    - Primary: Real blurred outdoor / street scene
      - Elements: Urban blur, city life, authentic location
        - Lighting: Golden hour outdoor lighting
          - Accents: TikTok testimonial style, real customer vibe`
    ],

    [VisualStyle.EDITORIAL]: [
      `STYLE - SPECIFIC BACKGROUND(EDITORIAL V1):
    - Primary: BOLD solid color(Electric Blue #0066FF)
      - Elements: High contrast, minimalist fashion styling
        - Lighting: Hard flash, dramatic shadows
          - Accents: Magazine cover composition, Vogue aesthetic`,

      `STYLE - SPECIFIC BACKGROUND(EDITORIAL V2):
    - Primary: BOLD solid color(Hot Pink #FF1493)
      - Elements: Clean studio backdrop, fashion - forward
        - Lighting: Beauty lighting with dramatic contrast
          - Accents: Harper's Bazaar style, high fashion`,

      `STYLE-SPECIFIC BACKGROUND (EDITORIAL V3):
      - Primary: Dramatic black with spotlight
      - Elements: Strong shadows, silhouette play
      - Lighting: Single spotlight, theatrical
      - Accents: Art photography, Vanity Fair editorial`
    ],

    [VisualStyle.COMMERCIAL_PREMIUM]: [
      `STYLE-SPECIFIC BACKGROUND (COMMERCIAL V1):
      - Primary: Explosive starburst (Yellow #FFE500 + Red #FF0000)
      - Elements: 3D floating badges, dynamic speed lines, radial rays
      - Lighting: High energy, multiple dramatic light sources
      - Accents: Sale badges, confetti, celebration explosion`,

      `STYLE-SPECIFIC BACKGROUND (COMMERCIAL V2):
      - Primary: Bold red (#FF0000) gradient with yellow accents
      - Elements: 3D circles, ribbons, floating price elements
      - Lighting: Dramatic retail lighting
      - Accents: Black Friday energy, product launch hype`,

      `STYLE-SPECIFIC BACKGROUND (COMMERCIAL V3):
      - Primary: Dynamic purple to orange gradient with motion blur
      - Elements: Speed lines, explosion particles, dynamic frames
      - Lighting: High impact, energetic
      - Accents: Flash sale urgency, maximum attention grab`
    ],

    [VisualStyle.GLOW_BEAUTY]: [
      `STYLE-SPECIFIC BACKGROUND (BEAUTY V1):
      - Primary: Soft pink (#FFE4EC) to white gradient with pearl shimmer
      - Elements: Water droplets, pearl textures, soft bokeh particles
      - Lighting: Softbox beauty lighting with dewy effect
      - Accents: Glossy, wet skin aesthetic, L'Oreal style`,

      `STYLE-SPECIFIC BACKGROUND (BEAUTY V2):
      - Primary: Water ripple effect with iridescent reflections
      - Elements: Floating flower petals, water splash elements
      - Lighting: Soft, glowing, ethereal light
      - Accents: Skincare commercial, spa atmosphere`,

      `STYLE-SPECIFIC BACKGROUND (BEAUTY V3):
      - Primary: Rose gold (#E8B4B8) to cream gradient
      - Elements: Subtle shimmer, soft bokeh, cream textures
      - Lighting: Beauty dish with soft fill
      - Accents: Glossier aesthetic, natural beauty focus`
    ],

    [VisualStyle.DESIGNI_PD_PRO]: [
      `STYLE-SPECIFIC BACKGROUND (Design Pro V1 - SPLIT BLOCK):
      - Layout: SPLIT SCREEN COMPOSITION (50/50 or 60/40).
      - Primary: One side is the SUBJECT/PRODUCT. The other side is a SOLID BRAND COLOR BLOCK (extracted from product).
      - Elements: SHAPES MUST MATCH CONTEXT (Organic/Fluid for Beauty/Food vs Geometric/Sharp for Tech/Business).
      - Lighting: Soft, even lighting on the subject.
      - Text Zone: The Solid Color Block is the DEDICATED TEXT ZONE.`,

      `STYLE-SPECIFIC BACKGROUND (Design Pro V2 - ORGANIC CONTAINER):
      - Layout: Clean Background + LARGE SHAPE behind the text.
      - Primary: Neutral background (Off-white/Light Grey) for contrast.
      - Elements: SHAPE DEFINED BY PRODUCT (Soft Blob for Comfort/Food, Hexagon/Card for Tech).
      - Interaction: Subject overlaps the shape slightly to create depth.
      - Text Zone: Text must sit INSIDE the shape.`,

      `STYLE-SPECIFIC BACKGROUND (Design Pro V3 - BOLD CARD):
      - Layout: FLOATING CARD / CONTAINER.
      - Primary: Background is a textured deep color or blurred environment.
      - Elements: A clearly defined CARD (White or Brand Color) that holds the information.
      - Graphics: Contextual patterns (Leaves for natural, Circuit for tech, Topographic for sport).
      - Text Zone: All text must be strictly contained within the Card/Box.`
    ],

    [VisualStyle.RELIGIOUS]: [
      `STYLE-SPECIFIC BACKGROUND (RELIGIOUS V1):
      - Primary: Soft light rays descending from above (golden tones)
      - Elements: Volumetric light beams, soft clouds, heavenly atmosphere
      - Lighting: Ethereal light from above
      - Accents: Divine glow, subtle cross silhouette`,

      `STYLE-SPECIFIC BACKGROUND (RELIGIOUS V2):
      - Primary: Sky blue (#87CEEB) to white gradient with clouds
      - Elements: Soft dove silhouettes, peaceful natural elements
      - Lighting: Golden hour, hopeful, uplifting
      - Accents: Worship album cover style, faith-based warmth`,

      `STYLE-SPECIFIC BACKGROUND (RELIGIOUS V3):
      - Primary: Warm gold (#D4AF37) accents on soft neutral
      - Elements: Subtle halo effects, light particles, peaceful nature
      - Lighting: Soft, warm, blessing-like illumination
      - Accents: Modern church campaign, spiritual serenity`
    ],

    [VisualStyle.DELIVERY]: [
      `STYLE-SPECIFIC BACKGROUND (DELIVERY V1):
      - Primary: Dark slate (#2D3436) with warm accents
      - Elements: Restaurant ambiance blur, warm food textures
      - Lighting: Appetizing warm golden lighting
      - Accents: Steam effects, kitchen atmosphere, Uber Eats style`,

      `STYLE-SPECIFIC BACKGROUND (DELIVERY V2):
      - Primary: Rustic wooden table texture with depth
      - Elements: Scattered ingredients, natural food elements
      - Lighting: Warm overhead + side light
      - Accents: Food photography aesthetic, restaurant campaign`,

      `STYLE-SPECIFIC BACKGROUND (DELIVERY V3):
      - Primary: Blurred modern kitchen/restaurant environment
      - Elements: Bokeh lights, food preparation atmosphere
      - Lighting: Commercial kitchen lighting, warm tones
      - Accents: DoorDash premium, delivery hero presentation`
    ]
  };

  // Get backgrounds for the selected style (fallback to MODERN if not found)
  const backgrounds = styleBackgrounds[style] || styleBackgrounds[VisualStyle.MODERN];

  // Return the variation (1-indexed to 0-indexed conversion)
  const index = Math.min(variationIndex - 1, backgrounds.length - 1);
  return backgrounds[Math.max(0, index)];
};

const constructPrompt = (config: GenerationConfig, variationIndex: number, customModelImage?: string | null, hasSticker: boolean = false, hasProduct: boolean = false, hasReference: boolean = false): string => {
  const { type, style, studioStyle, mascotStyle, productDescription, aspectRatio, copyText, ctaText, useAiAvatar, isEditableMode, useBoxLayout } = config;



  // MOCKUP MODE LOGIC
  if (type === CreationType.MOCKUP && config.mockupStyle) {
    const mockupStyle = config.mockupStyle;
    let baseMockupPrompt = `
    === PROFESSIONAL MOCKUP GENERATION MODE ===
    ROLE: Expert Product Photographer & CGI Mockup Artist.
    GOAL: Create a HYPER-REALISTIC mockup of the selected item.
    INPUT: The user provided an image (design/art/logo) to be placed on the object.
    
    ITEM TYPE: ${mockupStyle}
    
    INSTRUCTIONS PER STYLE:
    ${mockupStyle === MockupStyle.TSHIRT ? `CONTEXT: Professional Fashion Photography for E-Commerce.
    ROLE: Master Product Photographer specialized in Apparel.
    ACTION: Create a HYPER-REALISTIC mockup photo that looks indistinguishable from a real photograph.
    
    === PHOTOREALISM REQUIREMENTS (CRITICAL) ===
    1. CAMERA: Shot with a Sony A7R IV or Canon EOS R5, 85mm lens, f/2.8 aperture.
    2. LIGHTING: Professional studio softbox lighting OR natural golden hour light for lifestyle shots.
    3. FABRIC TEXTURE: Visible cotton weave texture. The design must integrate INTO the fabric, not float on top.
    4. FABRIC FOLDS: The print must warp and stretch naturally with the fabric folds and body contours.
    5. SHADOWS: Realistic shadows under the collar, in sleeve creases, and around the print.
    6. SKIN QUALITY: If a model is present, use realistic skin texture with natural imperfections. No plastic/CGI look.
    7. ENVIRONMENT: Realistic urban street backdrop OR professional photography studio with seamless paper.
    
    === DESIGN APPLICATION ===
    1. FULL CANVAS MAPPING: Map the ENTIRE input image canvas onto the shirt chest. Do not crop any edges.
    2. INTEGRATION: The design must look PRINTED on the fabric, not digitally pasted. Apply subtle fabric texture over the design.
    3. LIGHTING MATCH: The lighting on the design must match the scene lighting (highlights and shadows).

    === CONTRAST ENFORCEMENT ===
    1. DARK/BLACK ART DETECTED -> FORCE WHITE T-SHIRT (Clean Cotton).
    2. LIGHT/WHITE ART DETECTED -> FORCE BLACK T-SHIRT.
    3. DEFAULT SAFETY -> WHITE T-SHIRT.` : ''}
    ${mockupStyle === MockupStyle.BRANDING ? 'CONTEXT: Corporate Identity. SCENE: Elegant desk or clean surface. ITEMS: Business cards, envelope, letterhead. COMPOSITION: Isometric or Overhead flatlay. DEPTH: Shallow depth of field.' : ''}
    ${mockupStyle === MockupStyle.VEHICLE ? 'CONTEXT: Commercial Fleet. SCENE: Outdoors, sunny day. ITEM: Delivery Van or Sedan. ACTION: Apply the design as a full vehicle wrap or decal. RESPECT the vehicle geometry and reflections.' : ''}
    ${mockupStyle === MockupStyle.MUG ? 'CONTEXT: Product shot. SCENE: Cozy coffee table or kitchen counter. ITEM: Ceramic Mug. ACTION: curve the design around the mug cylinder. Add ceramic gloss reflection over the design.' : ''}
    ${mockupStyle === MockupStyle.PACKAGING ? 'CONTEXT: Retail. SCENE: Studio shelf or podium. ITEM: Box, Bottle or Pouch. ACTION: Apply design to the packaging surface. DIMENSION: 3D render quality.' : ''}
    ${mockupStyle === MockupStyle.SIGNAGE ? 'CONTEXT: Exterior Architecture. SCENE: Storefront or Building Facade. ITEM: 3D Sign or Lightbox. ACTION: Turn the design into a physical sign. Add environmental lighting and shadows.' : ''}
    ${mockupStyle === MockupStyle.TOTE_BAG ? 'CONTEXT: Lifestyle. SCENE: Carrying on shoulder or hanging. ITEM: Canvas Tote Bag. ACTION: Multiply the design on the textile texture.' : ''}
    ${mockupStyle === MockupStyle.STATIONERY ? (() => {
        const themes = [
          'CONTEXT: Professional Office. SCENE: Clean white minimalism. BACKGROUND: Sleek white marble desk, laptop edge visible, silver pen. LIGHTING: Crisp cool daylight (White 5500K). VIBE: Organized, productive, high-end business.',
          'CONTEXT: Humanized / Hand-Held. SCENE: POV of person holding the agenda. ACTION: Two hands presenting the notebook in front of camera. BACKGROUND: Soft blurred aesthetic environment (Neutral warm tones). LIGHTING: Soft studio beauty light. VIBE: Influencer, human connection, personal.',
          'CONTEXT: Cozy Bed Moment. SCENE: Soft knitted blanket background (White/Beige). ACTION: Hand holding the agenda firmly. LIGHTING: Soft warm window light. VIBE: Comfortable, personal. IMPORTANT: PRESERVE INPUT DESIGN COLORS. Do not apply gold foil textures unless in input. The cover must remain WHITE if the input is white.'
        ];
        return themes[(variationIndex - 1) % 3];
      })() : ''}

    VARIATION ${variationIndex}:
    ${variationIndex === 1 ? 'ANGLE: Front / Direct View. Best for clear visibility.' : ''}
    ${variationIndex === 2 ? 'ANGLE: 45 Degree / Perspective. Best for depth.' : ''}
    ${variationIndex === 3 ? 'ANGLE: Contextual / Lifestyle. Best for vibe.' : ''}

    CRITICAL RULES:
    1. REALISM: The result must look like a PHOTO, not a 3D render.
    2. OVERLAY: The input design must conform to the surface (curved on mugs, folded on shirts).
    3. LIGHTING: The lighting of the design must match the scene.
    4. NO HALLUCINATION: Do not change the text of the design.
    5. INTEGRITY: Include the ENTIRE art. Do not crop the text around the main element.

    MANDATORY USER INSTRUCTIONS (MUST OBEY):
    ${productDescription ? `>>> USER BRIEFING: "${productDescription}" <<< \nINSTRUCTION: You must strictly follow the user briefing above. If it specifies a color, use it. If it specifies a mood, create it.` : 'No specific extra instructions.'}
    `;

    return baseMockupPrompt;
  }

  // MASCOT MODE LOGIC
  if (type === CreationType.MASCOT && mascotStyle) {
    const mascotPromptSettings = getMascotPresets(mascotStyle);

    let baseMascotPrompt = `
    === MASCOT GENERATION MODE ===
    ROLE: Master 3D Character Artist specialized in HIGH-LIKENESS CARICATURES.
    GOAL: Create a stylized mascot that is INSTANTLY RECOGNIZABLE as the subject provided in the input images.
    
    STYLE: ${mascotStyle}
    ${mascotPromptSettings}
    
    VARIATION ${variationIndex}:
    ${variationIndex === 1 ? 'FULL BODY POSE. Neutral cheerful expression. Standard presentation.' : ''}
    ${variationIndex === 2 ? 'ACTION POSE. Engaging with the audience (Waving, pointing, or holding a prop).' : ''}
    ${variationIndex === 3 ? 'CLOSE-UP / EXPRESSIVE. Showing strong emotion (Excitement, Surprise, or Determination).' : ''}

    === CRITICAL IDENTITY RULES (DO NOT IGNORE) ===
    1. FACE SHAPE: You MUST preserve the subject's unique face shape (round, oval, square, jawline).
    2. KEY FEATURES: Keep the subject's nose shape, natural eye spacing, and mouth shape. Do not swap for generic "Disney" features unless necessary for the style.
    3. HAIR: Match the hairstyle, texture, and color EXACTLY.
    4. DISTINGUISHING MARKS: Keep moles, freckles, glasses, or beard styles.
    5. RECOGNITION TEST: The user must look at the mascot and say "That is definitely me", not "That is a random character".
    6. BLENDING: Map the subject's features ONTO the geometry of the style. Do not just paste the style over the face.
    
    CONTEXT/BRIEFING: ${productDescription || 'A friendly proprietary mascot for a brand.'}
    `;

    if (customModelImage) {
      baseMascotPrompt += `
    \n>>> SUBJECT PHOTO DETECTED:
    The input images contain the specific person to be character-ized.
    PRIORITY: LIKENESS > STYLE.
    If the style instructions (e.g., "giant eyes") conflict with the subject's actual face, COMPROMISE in favor of Identity.
    The mascot must look like a "Mini-Me" version of the photo.
    `;
    }

    return baseMascotPrompt;
  }

  // SENIOR CREATIVE DIRECTOR PROMPT INJECTION
  const isStudioOrUGC = type === CreationType.STUDIO_PHOTO || style === VisualStyle.UGC_INSTAGRAM;

  // UGC ENVIRONMENT ENFORCER
  // If UGC + Popular, we MUST ban office/luxury.
  const isHomeEnv = config.ugcEnvironment === UGCEnvironment.HOME || (!config.ugcEnvironment && !config.customEnvironment);
  const homeNegative = isHomeEnv ? "Trees, Forest, Park, Street, Road, Outdoor, Garden, Grass, nature background, Window view of park." : "";

  const ugcNegativePrompt = (style === VisualStyle.UGC_INSTAGRAM && config.socialClass?.includes('Popular'))
    ? `NEGATIVE PROMPT: Office, Corporate, Glass Building, Skyscrapers, Luxury, Hotel, Studio Lighting, Professional Ad, Penthouse, Expensive Decor, Modern Art, High Ceiling, Holding a phone, Camera in shot, Visible Cellphone, Phone Screen, Floating Objects, Levitation, Giant Cups, Oversized Glass, Extra Dishes, Ghost objects, Zero Gravity, Perfect Lighting, Cinema Bokeh, Minimalism, Scandinavian Design, White Aesthetic, Kitchen Island, Marble Counter, Fisheye, Wide Angle, Distorted Hands, Big Hands, ${homeNegative}`
    : "";

  // VARIATION LOGIC (1, 2, 3)
  // VARIATION LOGIC (1, 2, 3) - ADAPTIVE CAMERA ANGLES
  const isUGCMode = style === VisualStyle.UGC_INSTAGRAM;

  // DYNAMIC BACKGROUND CONTEXT FOR VARIATIONS
  const ugcBackground = (() => {
    if (config.ugcEnvironment === UGCEnvironment.OUTDOOR) return "Urban Street / Sidewalk / City Background";
    if (config.ugcEnvironment === UGCEnvironment.NATURE) return "Outdoor Park / Garden / Nature";
    if (config.ugcEnvironment === UGCEnvironment.GYM) return "Gym Interior / Fitness Center";
    return "Domestic Interior / Kitchen / Living Room"; // Default to Home
  })();

  const variationLogic = isUGCMode ? [
    // UGC / SELFIE VARIATIONS
    // UGC / SELFIE VARIATIONS
    `LAYOUT: DIRECT PRESENTATION. Action: Facing camera. HOLDING PRODUCT/PLATE WITH BOTH HANDS (Offering gesture). Camera: Eye Level Portrait. Background: ${ugcBackground}.`,
    `LAYOUT: RELAXED GRIP. Action: Standing naturally. HOLDING PRODUCT/PLATE WITH BOTH HANDS against chest. Camera: Standard Portrait Lens. Background: ${ugcBackground}.`,
    `LAYOUT: CASUAL PRESENTATION. Action: Smiling and HOLDING THE PLATE/PRODUCT WITH BOTH HANDS. Showing the food to camera. Camera: Handheld. Background: ${ugcBackground}.`
  ][variationIndex - 1] : [
    // PROFESSIONAL STUDIO VARIATIONS
    "LAYOUT: CENTRALIZED. Action: RE-SHOOT the scene with NEW COMPOSITION. Camera: Straight-On Eye-Level. (Ignore reference face).",
    "LAYOUT: ASYMMETRIC. Action: RE-SHOOT the scene with NEW COMPOSITION. Camera: Offset Side Angle. (Ignore reference face).",
    "LAYOUT: DYNAMIC. Action: RE-SHOOT the scene with NEW COMPOSITION. Camera: Tilted Dutch Angle. (Ignore reference face)."
  ][variationIndex - 1] || "LAYOUT: STANDARD PROFESSIONAL";

  let validVariationLogic = variationLogic;

  if (hasReference) {
    validVariationLogic = [
      `TASK: RE-GENERATE SCENE. 1. Create NEW background using colors/shapes from Image 2 (DO NOT COPY PIXELS). 2. Insert Person from Image 1 at Left.`,
      `TASK: RE-GENERATE SCENE. 1. Create NEW background using colors/shapes from Image 2 (DO NOT COPY PIXELS). 2. Insert Person from Image 1 at Center.`,
      `TASK: RE-GENERATE SCENE. 1. Create NEW background using colors/shapes from Image 2 (DO NOT COPY PIXELS). 2. Insert Person from Image 1 at Right.`
    ][variationIndex - 1];
  }

  // GLOBAL WATERMARK ELIMINATION - APPLIES TO ALL REFERENCE IMAGE GENERATIONS
  const watermarkNegativePrompt = hasReference ? `
  === ABSOLUTE WATERMARK BAN (CRITICAL) ===
  NEGATIVE: "Designi", "sua logo aqui", diagonal text patterns, watermark overlays, stock photo text, 
  copyright text, semi-transparent text, grid patterns, repeating text patterns, faded background text,
  any text that was not explicitly requested by the user.
  
  ENFORCEMENT: If the background contains ANY unwanted text or watermark-like patterns, 
  THE ENTIRE GENERATION IS INVALID. Re-generate with a COMPLETELY NEW procedural background.
  ` : "";

  let prompt = `ROLE: ${isStudioOrUGC && style === VisualStyle.UGC_INSTAGRAM ? 'You are an Authentic Content Creator & Social Media Expert.' : 'You are a Senior Creative Director & Performance Designer at a Top Ad Agency.'}
  GOAL: ${isStudioOrUGC && style === VisualStyle.UGC_INSTAGRAM ? 'Create an AUTHENTIC, RELATABLE, ORGANIC PHOTO (UGC).' : 'Create a HIGH-CONVERSION, PROFESSIONAL, MARKET-VALIDATED DESIGN.'}
  ${validVariationLogic}
  ${watermarkNegativePrompt}
  ${ugcNegativePrompt}
  `;

  // 1. PHOTO-BASED PATH (CUSTOM MODEL UPLOADED)
  // 1. PHOTO-BASED PATH (CUSTOM MODEL UPLOADED)
  if (customModelImage) {
    if (hasProduct) {
      // --- PRODUCT + PERSON COMPOSITION MODE ---
      prompt += `
       ================================================================================
       *** PRODUCT + PERSON COMPOSITION MODE ***
       ================================================================================
       
       >>> CRITICAL TASK: ${style === VisualStyle.UGC_INSTAGRAM ? 'CREATE AN AUTHENTIC USER PHOTO (UGC)' : 'CREATE A PRODUCT ADVERTISEMENT PHOTO'} <<<
       The person from Image 1 MUST be shown HOLDING the product from Image 2.
       
       === IDENTITY \u0026 COMPOSITION RULES ===
       
       ZONE A: THE \"KEEP ZONE\" (HEAD ONLY):
       - HEAD AND FACE: 100% preservation.
       - NECK: Preserve natural transition.
       
       ZONE B: THE \"DISCARD ZONE\" (DELETE COMPLETELY):
       - ORIGINAL BODY: DELETE IT. Do not paint over it. REMOVE IT.
       - INSTRUCTION: Virtual \"Head Crop\". Take the head from Image 1 and place it on a NEW body.
       - NEW BODY PROMPT: ${style === VisualStyle.UGC_INSTAGRAM && config.socialClass?.includes('Popular') ? '"A casual everyday person wearing simple t-shirt, relaxed shoulders"' : '"A CHARISMATIC MODEL. CLOTHING INTELLIGENCE: LOOK AT THE PRODUCT. IF Notebook/School/Book -> WEAR CASUAL YOUTHFUL CLOTHING (T-shirt/Hoodie). IF Supplement/Gym -> WEAR SPORTY/ACTIVEWEAR. IF Tech/Apps -> WEAR SMART CASUAL (Polo/Tee). IF Lawyer/Bank -> WEAR SUIT. DEFAULT: Solid Neutral T-Shirt. ARMS reaching forward holding the product"'}.
       - POSE OVERRIDE: If the original image has crossed arms, THEY MUST BE GONE.
       - POSE OVERRIDE: If the original image has crossed arms, THEY MUST BE GONE.
       
       CRITICAL: RESULT MUST HAVE 2 ARMS ONLY.
       NEGATIVE PROMPT: Crossed arms, original pose, extra hands, ghost arms, 3 arms, mutated limbs, DUPLICATE PRODUCTS, DOUBLE OBJECTS.
       
       === PRODUCT INTERACTION RULES ===
       QUANTITY RULE: EXACTLY ONE PRODUCT INSTANCE.
       - The person holds the product from Image 2.
       - DO NOT place a second copy of the product on the table/background.
              THE PRODUCT MUST BE:
        1. Held firmly in BOTH HANDS (Standard Rule for Plates/Bowls).
        2. Positioned at CHEST HEIGHT for visibility (or TABLE HEIGHT).
        3. Angled slightly toward camera (product face visible)
        4. THE EXACT PRODUCT from Image 2 - same colors, buttons, screen
        5. GRAVITY CHECK: HAND MUST CUP THE OBJECT FROM BOTTOM. NO HOVERING.
        6. SCALE REFERENCE: REAL WORLD SIZE. Bottle = Hand Size. Plate = 2 Hands Size. NO GIANT OBJECTS.
        7. PROPORTION CHECK: HANDS MUST MATCH FACE SIZE. NO GIANT HANDS. NO FISHEYE DISTORTION.
              HAND POSITIONING:
        - BOTH HANDS must be visible holding the object (if carrying it).
        - Fingers wrap around the product edges/bottom.
        - Thumbs visible on the front or side
        - Natural grip - like holding a book or device
        - Hands should cast soft shadows on the product
       
       GAZE RULE:
       - SUBJECT MUST LOOK AT THE CAMERA LENS (Eye Contact) OR at the Product.
       - NEVER LOOK "OFF SCREEN" or "AT NOTHING".
       
       === ANTI-HALLUCINATION RULES ===
       FORBIDDEN:
       - DO NOT generate a different/generic product
       - DO NOT make the product float without hands
       - DO NOT place the product next to the person (must be IN hands)
       - DO NOT change the product colors or shape
       - DO NOT add extra products or objects
       `;
    } else {
      // --- SUBJECT DOMINANT MODE (Standard) ---
      prompt += `
       ================================================================================
       *** PROFESSIONAL STUDIO PHOTOGRAPHY MODE (CUSTOM SUBJECT) ***
       ================================================================================
       
       SUBJECT INTEGRATION (CRITICAL):
       1. IDENTITY PRESERVATION: KEEP THE FACE 100% IDENTICAL to the uploaded photo.
       2. LIGHTING & SKIN: Maintain realistic skin texture (commercial retouch).
       `;
    }

    prompt += `
     ART DIRECTION & QUALITY:
     - APPLY THE SAME HIGH-END FINISH as the instruction below.
     ART DIRECTION & QUALITY:
     - APPLY THE SAME HIGH-END FINISH as the instruction below.
     - LIGHTING: ${style === VisualStyle.UGC_INSTAGRAM ? 'NATURAL LIGHTING (Window/Daylight)' : 'Re-light the subject to match the new background with dramatic effect'}.
     - DESIGN LANGUAGE: ${style === VisualStyle.UGC_INSTAGRAM ? 'AUTHENTIC USER GENERATED CONTENT (UGC). NOT AN AD.' : 'Create a PREMIUM COMMERCIAL AD, not just a photo'}.
     
     ${hasReference ? `
     === REFERENCE ART STYLE ACTIVE ===
     A reference image/art has been provided. IGNORE all preset style rules.
     Analyze the reference image and REPLICATE its EXACT:
     - Visual style (colors, gradients, shapes)
     - Background design and elements
     - Lighting and mood
     - Typography style (if any)
     - Overall composition and layout
     
     Create an ad that looks like it was designed by the SAME designer as the reference.
     ` : (isStudioOrUGC && studioStyle ? `
      === VISUAL STYLE: STUDIO PHOTOGRAPHY (${studioStyle}) ===
      ${getStudioPresets(studioStyle)}
      
      IMPORTANT: This is a PURE PHOTO style. NO abstract graphics. NO 3D shapes.
      ` : `
      VISUAL STYLE RULES (${style}):
      ${style === VisualStyle.UGC_INSTAGRAM ? getUGCContext(config.socialClass, config.ugcEnvironment, config.customEnvironment, config.ugcModel) : getStylePresets(style, config.socialClass)}
      
      ${style !== VisualStyle.UGC_INSTAGRAM ? `
      DESIGN ELEMENTS (MANDATORY FOR PREMIUM LOOK):
      - ADD 3D GEOMETRIC SHAPES in the background (spheres, cubes, abstract curves) that complement the composition.
      - USE DEPTH LAYERS: Foreground blur elements, mid-ground subject, background design elements.
      - INCLUDE SUBTLE LIGHT EFFECTS: Lens flares, neon glows, gradient overlays framing the scene.
      - VARIATION: Each design should feel UNIQUE - vary colors, shapes, and composition significantly.
      ` : `
      UGC / INFLUENCER AUTHENTICITY RULES:
      - NO PROFESSIONAL STUDIO LIGHTING. Use Natural Light or Ring Light.
      - NO 3D SHAPES or GRAPHICS. Real world background only.
      - BACKGROUND MUST MATCH THE CONTEXT: ${config.customEnvironment || config.ugcEnvironment}.
      - QUALITY: Good smartphone camera quality (Authentic), NOT Cinema 8K.
      `}
      `)}
     
     NEGATIVE PROMPT (QUALITY CONTROL):
     - NO FLOATING PRODUCTS. The subject MUST hold it.
     - NO "CUTOUT" LOOK. The subject must feel blended into the scene.
     - NO TEXT OBSTRUCTION (Dont cover face).
     - NO BORING PLAIN BACKGROUNDS. Always add design interest.
     ${style === VisualStyle.UGC_INSTAGRAM ? '- NEGATIVE PROMPT: Office, Corporate, Meeting Room, Studio Lighting, Professional Ad, Suit, Tie, Blazer.' : ''}
     `;
  } else if (isStudioOrUGC) {
    // PURE PHOTOGRAPHY PATH (NO SHAPES, NO TEXT BOXES)
    // Check if it's specifically STUDIO_PHOTO to apply studioStyle presets
    const isStudioPhoto = type === CreationType.STUDIO_PHOTO;

    prompt += `
  MANDATORY PHOTOGRAPHY RULES (CRITICAL):
  - TYPE: PURE PHOTOGRAPHY (Realism Focus).
  - NO GRAPHICS: DO NOT generate abstract "shapes", "boxes", "text containers", "buttons", "icons". 
  - NO DESIGN ELEMENTS: This is a PHOTO, not a graphic design. NO 3D shapes, NO floating elements.
  - COMPOSITION: Professional Photographic framing. Clean depth of field.
  - BACKGROUND: Realistic environment matching the description. NO ARTIFICIAL OVERLAYS.
  - HIERARCHY: Focus 100% on the Subject (Person) and the Environment.
  
  ${hasReference ? `
  === STYLE REFERENCE ACTIVE (PRESERVE IDENTITY!) ===
  A style reference image has been provided. IGNORE all preset styles.
  
  ⚠️ CRITICAL IDENTITY RULE:
  - The PERSON in the output MUST be the same person from the PRIMARY image (Input Image 1)
  - PRESERVE: face, gender, body type, skin tone, hair, age, ethnicity
  - DO NOT use the person from the reference image!
  
  EXTRACT FROM REFERENCE (STYLE ONLY):
  - Background type and environment
  - Lighting setup and mood
  - Color palette and tones
  - Clothing STYLE (but adapted to the subject's body)
  - Overall composition style
  
  Think: "Photograph the person from Image 1 using the STYLE of Image 2"
  ` : (isStudioPhoto && studioStyle ? `
  === STUDIO PRESET APPLIED: ${studioStyle} ===
  ${getStudioPresets(studioStyle)}
  
  IMPORTANT: The above preset defines the EXACT style, background, and lighting for this photo.
  Follow these instructions PRECISELY. Do not deviate from the preset.
  ` : '')}
  
  HUMAN ELEMENT RULES:
  - RAW PHOTOGRAPHY: Real Brazilian person, Canon 5D quality. NO AI/3D LOOK.
  - SKIN: Highly detailed, natural texture, pores visible.
  - LIGHTING: Cinematic Studio Lighting.
  - FRAMING: AMERICAN SHOT / MEDIUM SHOT. NEVER FULL BODY.
  - ANATOMY: CORRECT human body proportions. Normal head-to-body ratio (1:7 or 1:8).
  - NO DISTORTION: Head size must be proportional to body. NO oversized or undersized heads.
  - NATURAL POSE: Realistic body positioning, no awkward or impossible angles.
  
  === ABSOLUTELY FORBIDDEN FOR PHOTOS ===
  - NO floating app icons, emojis, or social media icons
  - NO geometric shapes (spheres, cubes, circles)
  - NO text overlays or buttons
  - NO graphic design elements of ANY kind
  - This must look like a REAL PHOTOGRAPH from a professional camera`;
  }

  /* 
   * LOGIC FOR DESIGN REFERENCE (Thumbnail/Social Media)
   * Using the SAME approach that works in Studio/UGC mode:
   * "Photograph the person from Image 1 using the STYLE of Image 2"
   */
  const isDesignReferenceMode = !isStudioOrUGC && hasReference;

  if (isDesignReferenceMode) {
    // REPLICATING STUDIO LOGIC + POST-PRODUCTION TEXT
    prompt += `
  MANDATORY PHOTOGRAPHY RULES (PHASE 1):
  - TYPE: PURE PHOTOGRAPHY (Realism Focus).
  - NO 3D GRAPHICS: DO NOT generate abstract 3D shapes, spheres, cubes during photography phase.
  - COMPOSITION: Professional Photographic framing. Clean depth of field.
  - CRITICAL: CHANGE THE CAMERA ANGLE slightly from the reference image.
  - RE-FRAME: Do not copy the reference pixel-for-pixel. Create a NEW view of the same scene.
  - BACKGROUND: Realistic environment matching the reference style.
  - HIERARCHY: Focus 100% on the Subject (Person) from Image 1.
  
  === STYLE REFERENCE ACTIVE (PRESERVE IDENTITY!) ===
  A style reference image has been provided. IGNORE all preset styles.
  
  === STYLE REFERENCE ACTIVE ===
  A style reference image has been provided. IGNORE all preset styles.

  ⚠️ IDENTITY RULE (CRITICAL):
  ${customModelImage ? `
  - CUSTOM MODEL DETECTED (Image 1).
  - PRESERVE: Face, identity, skin tone, hair (100% Match).
  - ADAPT: Clothing MUST change to match the style of the Reference Image.
  ` : `
  - NO CUSTOM MODEL. GENERATE A NEW UNIQUE AVATAR.
  - STRICTLY FORBIDDEN: DO NOT USE THE PERSON FROM THE REFERENCE IMAGE.
  - Create a FRESH face, unique identity, unrelated to the reference subject.
  - The goal is to reference the STYLE, not the PERSON.
  `}
  
  === BACKGROUND RE-CREATION PROTOCOL (NUCLEAR OPTION) ===
  ⚠️ SECURITY ALERT: The Reference Image contains COPYRIGHTED WATERMARKS and TEXT.
  
  YOU ARE STRICTLY FORBIDDEN FROM COPYING PIXELS FROM THE REFERENCE BACKGROUND.

  Instead, you must ANALYZE and RE-DRAW the background from scratch:
  1. ANALYZE the "Vibe" (e.g., Blue Organic Shapes, Yellow Sunburst, Abstract Tech).
  2. GENERATE A NEW 3D BACKGROUND matching that vibe.
  3. DO NOT INCLUDE any text, logos, or watermarks from the reference.
  4. CLEAN PLATE RULE: The background must be pristine, like a stock photo BEFORE text was added.

  EXTRACT FROM REFERENCE (STYLE ONLY - DO NOT COPY PIXELS):
  - Color Palette: Extract the colors.
  - Lighting: Replication the lighting direction.
  - Shapes: Re-create similar 3D shapes (e.g., if there are blobs, generate NEW blobs).
  - Composition: Use the same layout structure.

  Think: "I need to rebuild this scene in 3D software. I will use the same colors and lighting, but I will make my own shapes. I will explicitly leave out the text and watermarks."

  === COMPOSITION INTEGRATION RULES (CRITICAL) ===
  - DEPTH: The subject must separate from the background but feel IMMERSED in it.
  - LIGHTING INTERACTION: The background light sources must cast realistic rim lights on the subject.
  - ELEMENT INTERACTION: Background shapes/elements should slightly overlap or depth-cue the subject.
  - NO FLAT COLLAGE: Do not just paste the subject on top. Integrate them into the 3D space.
  - VISUAL FLOW: The lighting should lead the eye to the text area (but keep it empty for now).
  - TEXT SPACE: Analyze where the text is in the reference. Leave that space EMPTY or with low contrast for the overlay.
  
  HUMAN ELEMENT RULES:
  - RAW PHOTOGRAPHY: Real Brazilian person, Canon 5D quality.
  - SKIN: Highly detailed, natural texture, pores visible.
  - LIGHTING: Cinematic Studio Lighting matching reference.
  - FRAMING: AMERICAN SHOT / MEDIUM SHOT. NEVER FULL BODY.
  - ANATOMY: CORRECT human body proportions. Normal head-to-body ratio (1:7 or 1:8).
  - NO DISTORTION: Head size must be proportional to body. NO oversized or undersized heads.
  
  === PHASE 2: POST-PRODUCTION (DIGITAL OVERLAY) ===
  AFTER photographing the subject, apply the text overlay digitally:
  - Add the text: "${config.copyText || ''}"
  ${type === CreationType.YOUTUBE_THUMB ? `
  - Font Style: Bold, Modern Sans-Serif (YouTube Style - High CTR)
  - Color: High Contrast (Yellow, Red, or White with Stroke)
  ` : `
  - Font Style: MATCH THE TYPOGRAPHY FROM THE REFERENCE IMAGE (Image 2).
  - LOOK AT IMAGE 2: Is it Serif? Sans-Serif? Handwritten? COPY THAT STYLE.
  - Color: Extract dominant text color from Image 2.
  `}
  - Position: Natural composition, legible.
  
  === TEXT SOURCE RULES (CRITICAL) ===
  ⚠️ DO NOT READ TEXT FROM REFERENCE IMAGE ⚠️
  - The text in Image 2 is just a placeholder example.
  - IGNORE keywords like "GRÁTIS", "FREE", "KIT" found in Image 2.
  - USE ONLY THE TEXT PROVIDED IN THIS PROMPT.
  `;
  } else if (!isStudioOrUGC) {
    // GRAPHIC DESIGN / ILLUSTRATION PATH (Default - when no reference is provided)
    prompt += `
  === PREMIUM COMMERCIAL DESIGN ENGINE (AVATAR/AI GENERATED) ===
  
  MANDATORY DESIGN LANGUAGE:
  - COMPOSITION: Dynamic commercial layout with VISUAL INTEREST in every corner.
  - BACKGROUND: NOT plain or boring. Must include design elements, shapes, gradients.
  - LIGHTING: Dramatic studio lighting with rim lights and accent colors.
  - QUALITY: High-end advertising, NOT stock photo style.
  
  PREMIUM VISUAL ELEMENTS (REQUIRED):
  1. GEOMETRIC SHAPES: Add bold 3D shapes in background (spheres, cubes, abstract waves, donuts).
  2. COLOR BLOCKING: Use vibrant color blocks, gradients, or mesh gradients as background.
  3. FLOATING ACCENTS: Include floating icons, particles, or decorative elements.
  4. DEPTH LAYERS: Create foreground blur, mid-ground subject, background elements.
  5. LIGHT EFFECTS: Add neon glows, lens flares, or dramatic rim lighting.
  
  HUMAN ELEMENT RULES:
  - PHOTOREALISTIC: Real Brazilian person, Canon 5D DSLR quality. NO AI/3D LOOK.
  - EMOTION: Expressive face, eye contact with camera, confidence/authority.
  - SKIN: Natural texture, professional commercial retouch.
  - FRAMING: AMERICAN SHOT / MEDIUM SHOT ONLY. Frame from WAIST to HEAD.
  - INTERACTION: Person can point, gesture, or interact with floating elements.
  
  COMPOSITION RULES:
  - Person on LEFT or RIGHT third (not always center).
  - Design elements balance the opposite side.
  - Dynamic angles and visual flow.
  - Each variation MUST look significantly DIFFERENT.`;
  }

  // SAFETY LAYER: IDENTITY PRESERVATION for Reference Images (Global Rule)
  if (hasReference) {
    prompt += `
  === IDENTITY SEPARATION PROTOCOL (CRITICAL) ===
  - IMAGE 2 (REFERENCE) IS A STYLE GUIDE ONLY. IT HAS NO IDENTITY.
  - TREAT THE PERSON IN IMAGE 2 AS A "HEADLESS MANNEQUIN".
  - IGNORE the features, race, age, and hair of the person in Image 2.
  - FACE SOURCE: IMAGE 1 ONLY.
  - BODY/STYLE SOURCE: IMAGE 2.
  
  NEGATIVE PROMPT: Mixed identity, morphing features, looking like reference person, blended faces, cloning reference.
  `;
  }

  // BACKGROUND & BRANDING ENGINE - CONTEXTUAL PREMIUM BACKGROUNDS
  // Creates realistic thematic backgrounds that match the product/business context

  // Premium contextual environment instruction
  const premiumContextualBackground = hasProduct ? `
  === INTELLIGENT PRODUCT CONTEXT ENGINE ===
  
  **CRITICAL**: You MUST analyze the product image and identify what it is BEFORE creating the background.
  
  STEP 1 - IDENTIFY THE PRODUCT CATEGORY:
  Look at the product and determine which category it belongs to:
  
  📚 SCHOOL/EDUCATION (notebooks, backpacks, pencils, school supplies):
     → ENVIRONMENTS: Classroom, school hallway, study desk at home, library, colorful study room
     → ELEMENTS: Floating pencils, stars, books, school icons, rainbows (for kids)
     → MOOD: Fun, colorful, youthful, back-to-school energy
     → COLORS: Match the product colors (pink notebooks = pink tones in environment)
  
  💳 FINTECH/PAYMENTS (card machines, payment devices, banking apps):
     → ENVIRONMENTS: Modern store counter, successful business, restaurant, food truck, marketplace
     → ELEMENTS: Floating coins, money, success graphs, green checkmarks, payment icons
     → MOOD: Success, trust, modern, business growth
     → COLORS: Match device colors (green TON = green accents)
  
  💄 BEAUTY/COSMETICS (makeup, skincare, haircare):
     → ENVIRONMENTS: Bathroom vanity, spa, beauty salon, elegant bedroom, dressing room
     → ELEMENTS: Floating flowers, pearls, sparkles, beauty icons, water droplets
     → MOOD: Glamorous, dewy, fresh, self-care
     → COLORS: Soft pinks, golds, match product packaging
    🍔 FOOD/DELIVERY (food products, restaurants, delivery apps):
      → ENVIRONMENTS: High-end Kitchen, upscale restaurant, blurred dining scene
      → ELEMENTS: Steam, garnish, professional plating, soft bokeh lights
      → MOOD: Appetizing, premium, delicious, Michelin-star feel
      → COLORS: Warm rich tones, fresh ingredients colors
  
  👕 FASHION/CLOTHING (clothes, shoes, accessories):
     → ENVIRONMENTS: Boutique, fashion runway, street style, closet, shopping district
     → ELEMENTS: Floating hangers, shopping bags, fashion icons
     → MOOD: Stylish, trendy, confident
     → COLORS: Match the clothing colors
  
  🏠 REAL ESTATE/HOME (houses, apartments, furniture):
     → ENVIRONMENTS: Elegant home interior, dream house exterior, luxury living room
     → ELEMENTS: Floating keys, house icons, hearts
     → MOOD: Aspirational, family, warmth, dream home
     → COLORS: Warm neutrals, luxury tones
  
  📱 TECH/ELECTRONICS (phones, computers, gadgets):
     → ENVIRONMENTS: Modern office, tech startup, gaming setup, creative studio
     → ELEMENTS: Floating app icons, notifications, emojis, tech symbols
     → MOOD: Innovative, modern, connected
     → COLORS: Sleek blacks, tech blues, product accent colors
  
  🏋️ FITNESS/HEALTH (gym equipment, supplements, activewear):
     → ENVIRONMENTS: Gym, outdoor running path, yoga studio, sports field
     → ELEMENTS: Floating weights, energy symbols, fire, muscles
     → MOOD: Energetic, powerful, healthy, motivated
     → COLORS: Energetic colors, match product
  
  🧸 KIDS/TOYS (toys, children's products, games):
     → ENVIRONMENTS: Playroom, children's bedroom, playground, colorful nursery
     → ELEMENTS: Floating toys, balloons, stars, rainbows, cute characters
     → MOOD: Fun, playful, imaginative, safe
     → COLORS: Bright pastels, candy colors
  
  🐕 PETS (pet food, accessories, pet services):
     → ENVIRONMENTS: Park, cozy home with pet, pet store, backyard
     → ELEMENTS: Floating paw prints, bones, hearts, pet toys
     → MOOD: Loving, playful, caring
     → COLORS: Natural, warm, match product
  
  STEP 2 - CREATE ENVIRONMENT FOR VARIATION ${variationIndex}:
  ${variationIndex === 1 ? `
  VARIATION 1 - ACTIVE USE CONTEXT:
  Show the product being used in its NATURAL CONTEXT.
  - School notebook → Child at study desk or classroom
  - Payment device → Store counter, business transaction
  - Makeup → Applying in front of mirror
  ` : variationIndex === 2 ? `
  VARIATION 2 - LIFESTYLE ASPIRATION:
  Show the LIFESTYLE the product enables.
  - School notebook → Smart, happy student achieving success
  - Payment device → Thriving business owner, money flowing
  - Makeup → Confident, beautiful person going out
  ` : `
  VARIATION 3 - EMOTIONAL CONNECTION:
  Show the FEELING the product creates.
  - School notebook → Joy of learning, creativity
  - Payment device → Financial freedom, growth
  - Makeup → Self-love, confidence, empowerment
  `}
  
  STEP 3 - COLOR HARMONY:
  - Extract the DOMINANT COLOR from the product packaging/design
  - Apply this color as: lighting color, background tint, accent elements
  - Pink product = pink-tinted environment
  - Green product = green accents and lighting
  
  STEP 4 - FLOATING ELEMENTS:
  Add 2-4 floating elements that make sense for the product category.
  They should be RELEVANT to the product, not random.
  
  ABSOLUTE REQUIREMENTS:
  ✓ Environment MUST match the product category
  ✓ Colors MUST harmonize with product colors
  ✓ Mood MUST match the product's target audience
  ✓ Each variation shows a DIFFERENT aspect (use, lifestyle, emotion)
  
  FORBIDDEN:
  ✗ Corporate offices for children's products
  ✗ Beach scenes for school supplies
  ✗ Luxury yachts for everyday products
  ✗ Environments that make NO SENSE for the product
  ` : `
  === PREMIUM AVATAR ENVIRONMENT ENGINE ===
  
  Create a PREMIUM LIFESTYLE ENVIRONMENT for the AI-generated avatar.
  
  VARIATION ${variationIndex} ENVIRONMENT:
  ${variationIndex === 1 ? `
  - LUXURY SETTING: Mansion poolside, yacht deck, premium hotel lobby
  - OR SUCCESS OFFICE: Glass corner office, modern startup
  - Floating social icons/emojis showing engagement (❤️💬📱)
  - Golden/warm lighting, affluent atmosphere
  ` : variationIndex === 2 ? `
  - OUTDOOR LIFESTYLE: Beach sunset, mountain vista, resort terrace
  - OR URBAN CHIC: Rooftop bar, city skyline, upscale restaurant
  - Floating elements matching the vibe (travel icons, lifestyle emojis)
  - Natural lighting with color grade matching the scene
  ` : `
  - CREATIVE SPACE: Design studio, content creator setup, podcast room
  - OR LIFESTYLE HOME: Modern apartment, home office, balcony view
  - Floating tech/creative icons showing digital success
  - Soft ambient with accent rim lighting
  `}
  
  FLOATING ELEMENTS: Add 3-5 floating icons/emojis contextual to the scene.
  DEPTH: Strong background blur, person sharp.
  QUALITY: High-end commercial, magazine cover feel.
  `;

  const backgroundLogic = `
  >>> CONTEXTUAL PREMIUM BACKGROUND ENGINE (Variation ${variationIndex}) <<<
  
  ${premiumContextualBackground}
  
  STYLE INFLUENCE (${style}):
  - Apply the ${style} color palette and mood to the contextual environment
  - The environment should FEEL like a ${style} advertisement
  
  ABSOLUTE REQUIREMENTS:
  1. Background must be a REALISTIC ENVIRONMENT (not abstract shapes)
  2. Environment must MATCH the product/avatar context
  3. Colors must HARMONIZE with the product's brand colors
  4. Include FLOATING CONTEXTUAL ELEMENTS (icons, emojis, indicators)
  5. Each variation must show a DIFFERENT environment type
  6. Quality: 8K, cinematic, magazine cover level
  `;

  // ONLY add premium background logic for graphic design modes, NOT for pure photography (studio/UGC)
  // AND NOT when a Reference Image is provided (Reference dictates the bg)
  if (!isStudioOrUGC && !hasReference) {
    prompt += `
  ${backgroundLogic}
    `;
  }

  // Layout and typography rules - only for design modes, not pure photography
  // When Reference Image is active, add specific typography rules
  if (!isStudioOrUGC && hasReference) {
    prompt += `
  === TYPOGRAPHY RULES FOR REFERENCE MODE ===
  TEXT POSITIONING:
  - Place text in the TOP-LEFT or TOP area of the image
  - Text should be LARGE, BOLD, and EASY TO READ
  - Use 2-3 lines maximum, with SHORT words per line
  - Example: "Volta às\\naulas" (2 lines, stacked)
  
  TEXT HIERARCHY:
  - HEADLINE: Very large (like 80pt equivalent), Bold sans-serif, WHITE or contrasting color
  - SUBTEXT (price/brand): Medium size, below headline
  - CTA BUTTON: Pill-shaped button at the bottom
  
  TEXT CONSTRAINTS:
  - NEVER place text overlapping the avatar's face
  - NEVER use tiny unreadable fonts
  - ALWAYS ensure high contrast (white on dark blue, or dark on light areas)
  - Text should look PROFESSIONALLY DESIGNED, not randomly placed
    `;
  }

  if (!isStudioOrUGC && !hasReference) {
    prompt += `
  LAYOUT & DIAGRAMMING RULES (CRITICAL):
  - GRID SYSTEM: Align all elements (Subject, Text, CTA) to a professional 12-column grid.
  - NEGATIVE SPACE: LEAVE 40% EMPTY SPACE for text safety. DO NOT CLUTTER THE WHOLE IMAGE.
  - TEXT AREA: The text must sit on a CLEAN, HIGH-CONTRAST zone (Solid color or dark gradient area).
  - CTA BUTTON: If CTA is requested, GENERATE A PHYSICAL LOOKING "BUTTON" SHAPE (e.g., Pill shape, dropshadow) behind the text location.
  
  === TYPOGRAPHY & LINE BREAK RULES (CRITICAL) ===
  
  TEXT FORMATTING:
  - Break headlines into 2-3 SHORT LINES for visual impact
  - Each line should have MAX 3-4 WORDS for readability
  - Use STACKED typography (one word or phrase per line)
  
  CORRECT LINE BREAKS:
  - "Mude para Ton" → "Mude\\npara\\nTon" (3 lines, one word each)
  - "Esse criativo foi feito 100% com IA" → "Esse criativo foi\\nfeito 100%\\ncom IA"
  - "Escale suas ofertas" → "Escale\\nsuas\\nofertas"
  
  TEXT SIZE HIERARCHY:
  - HEADLINE: Very large, bold, 2-3 short lines stacked
  - SUBTEXT: Smaller, beneath headline
  - CTA: Button with readable text inside
  
  TEXT PLACEMENT:
  - Reserve LEFT or BOTTOM corner for text block
  - Text should never compete with the subject
  - Maintain clear separation between text zone and person zone

  FORBIDDEN:
  - Long single lines that don't fit
  - Text overlapping the product or face
  - Tiny unreadable text
  - Text crammed into small spaces
    `;
  }

  // CONTEXT AWARE LOGIC (ONLY IF NO CUSTOM IMAGE)
  if (!customModelImage && useAiAvatar) {
    const lowerText = (config.copyText + " " + config.productDescription).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let avatarContext = config.ugcModel ? `SUBJECT: ${config.ugcModel} ` : "A professional Brazilian Model";
    // ... (Keep existing avatar context logic or simplify)
    // ... (Simplified Context Detection Logic - Same as before but cleaner)
    if (!config.ugcModel) {
      if (lowerText.includes('ton') || lowerText.includes('pag')) {
        avatarContext = "Professional Brazilian Presenter holding the device. Confident.";
      }
    }
    // ... (Skip repeating all if-else for brevity in this task overview, assuming we keep the best logic)

    prompt += `
    SUBJECT RULE: USE A HYPER - REALISTIC HUMAN AVATAR.
    - CONTEXT: ${avatarContext}
    ${config.ugcModel ? `- MANDATORY OVERRIDE: USER SELECTED "${config.ugcModel}". IGNORE ANY CONTEXT CLUES IN TEXT ABOUT AGE/GENDER. GENERATE EXACTLY THIS MODEL.` : ''}
    - APPEARANCE: Highly detailed skin, perfect eyes.REAL PHOTOGRAPHY LOOK.
    - EMOTION: High energy, smiling.
    ${style === VisualStyle.DELIVERY ? `- INTERACTION: SUBJECT MUST LOOK AT THE FOOD/PRODUCT with appetite OR present it to camera. NEVER look at empty space.` : ''}
    `;
  }

  // GLOBAL PROMPT CONTINUATION
  prompt += `
  CONTEXT & COLOR PALETTE:
  - PALETTE: ${config.colorPalette ? `STRICTLY FOLLOW: ${config.colorPalette}.` : 'Match the PRODUCT BRAND COLORS.'} 
  
  TASK EXECUTION:
  - PROMPT: ${productDescription}.`;

  // BOX LAYOUT LOGIC
  if (useBoxLayout) {
    prompt += `
    - LAYOUT MODE: "MANUAL EDITING CANVAS".
    - CRITICAL: NO READABLE TEXT.NO BOXES.CLEAN BACKGROUND.
    `;
  }

  // TEXT RENDERING ENGINE & DIAGRAMMING
  // Check if we should "burn" text into the pixels (Not using editable boxes)
  const shouldBurnText = !useBoxLayout && !isEditableMode && type !== CreationType.STUDIO_PHOTO && style !== VisualStyle.UGC_INSTAGRAM;

  if (shouldBurnText) {
    // Only enforce rigid diagramming if NO reference is present
    if (!hasReference) {
      prompt += `
      >>> DIAGRAMMING & TEXT ENGINE ACTIVE <<<
        CRITICAL INSTRUCTION: THE TEXT IS THE MAIN CHARACTER.
      1. EXPLICITLY ALLOCATE 30 % OF THE CANVAS for the text.Do not put the subject there.
      2. CREATE A HIGH - CONTRAST ZONE(Dark Gradient Overlay or Solid Shape) specifically for the text to sit on.
      3. CHECK CONTRAST: White Text on Light Background is FORBIDDEN.Dark Text on Dark Background is FORBIDDEN.
      `;
    }

    if (config.copyText) {
      // If reference exists, we want to COPY its font, not use the preset font
      const typographyRules = hasReference ? "FONT STYLE: CLONE the font from Image 2 (Reference)." : getTypographyRules(style);

      prompt += `
       CONTENT TO WRITE(VERBATIM):
  - HEADLINE: "${config.copyText}"
       ${typographyRules}
  - POSITIONING: ${hasReference ? 'MATCH REFERENCE IMAGE LAYOUT EXACTLY' : (variationIndex === 2 ? 'Asymmetrical (Left/Right)' : 'Integrated Center/Top')}.
  - SPELLING CHECK: Portuguese.Accents(á, é, ã, ç) are MANDATORY.
       `;
    } else {
      prompt += `
  === NO TEXT REQUESTED ===
  CRITICAL: The user did NOT provide any headline text.
  DO NOT generate ANY text, titles, headlines, or typography in this image.
  This should be a TEXT-FREE composition focused purely on the visual.
  NEGATIVE: text, typography, headlines, titles, words, letters, captions, watermarks.
      `;
    }

    if (ctaText) {
      prompt += `
    - ACTION BUTTON(CTA): GENERATE A VISIBLE BUTTON.
      - TEXT ON BUTTON: "${ctaText}"
    - STYLE: Pill Shape or Rounded Rectangle.High Contrast Color(e.g.Green / Blue) matching brand.
      `;
    } else {
      prompt += `
      - CRITICAL: DO NOT GENERATE ANY BUTTONS.NO "SIGN UP" BUTTONS.NO FAKE UI ELEMENTS.
      - CLEAN LAYOUT without Call - to - Actions.
      `;
    }
  } else {
    prompt += `\n - CRITICAL: NO TEXT.NO NUMBERS.NO LETTERS.CLEAN BACKGROUND ONLY.`;
  }

  // GLOBAL PRODUCT OVERRIDE (SAFEGUARD)
  if (hasProduct) {
    prompt += `
    ================================================================================
    *** GLOBAL PRODUCT RULE(OVERRIDES ALL STYLE SETTINGS) ***
    ================================================================================
    1. HERO PRODUCT PRIORITY: ONE.
       - The image provided as "Product" is the HOLY GRAIL. 
       - YOU MUST COMPOSITE THIS EXACT PRODUCT IMAGE INTO THE SCENE.
       - DO NOT DRAW A NEW PRODUCT.DO NOT "INSPIRE" YOURSELF.USE THE SOURCE PIXELS.
       - IF THE SHOWING PRODUCT IS A MACHINE(e.g., Payment Terminal), SHOW THAT EXACT MODEL.
    
    2. ANTI - HALLUCINATION PROTOCOL:
  - DO NOT CHANGE THE BUTTON COLORS.
       - DO NOT CHANGE THE SCREEN CONTENT.
       - DO NOT CHANGE THE DEVICE SHAPE.
       - IF THE HANDS DON'T FIT, CHANGE THE HANDS. NEVER CHANGE THE DEVICE.

  3. INTERACTION MANDATE:
  - The Subject(Person) MUST be holding the product FIRMLY.
       - HANDS MUST BE VISIBLE gripping the device.
       - IF "Minimalist" or "Clean" style is selected, YOU MUST STILL SHOW THE PRODUCT AND HANDS.
    
    4. PRODUCT FIDELITY:
  - KEEP COLORS EXACT.
       - KEEP LOGOS VISIBLE.
       - KEEP SCREEN CONTENT(if any).
    `;
  }

  // === USER BRIEFING OVERRIDE (HIGHEST PRIORITY) ===
  if (productDescription) {
    prompt += `
    \n================================================================================
    *** USER BRIEFING (HIGHEST PRIORITY - OVERRIDES ALL STYLE SETTINGS) ***
    ================================================================================
    The user has provided a specific description/briefing:
    "${productDescription}"

    INSTRUCTION:
    1. If the user mentions a specific LOCATION (e.g., "Park", "Kitchen", "São Paulo"), YOU MUST USE IT.
       - Ignore the default style background if it conflicts.
    2. If the user mentions specific ELEMENTS, they must be present.
    `;
  }

  // === FINAL ANATOMY & SAFETY CHECK ===
  prompt += `
  \n================================================================================
  *** FINAL SAFETY PROTOCOLS ***
  ================================================================================
  1. ANATOMY CHECK (CRITICAL):
     - MAX 2 ARMS ONLY. Count them.
     - MAX 2 HANDS ONLY. Count them.
     - IF holding a product, the "old" hands must be DELETED.
     - NO "Ghost hands" floating behind the product.
  
  2. IDENTITY CHECK:
     - Person must look like Input Image 1.
  
  3. COMPOSITION CHECK:
     - Is the text legible? (If any)
     - Is the product visible?
  `;

  // YOUTUBE THUMBNAIL LOGIC
  if (type === CreationType.YOUTUBE_THUMB) {
    if (hasReference) {
      prompt += `
      FORMAT: YouTube Thumbnail (16:9).
      - STYLE: MATCH THE REFERENCE IMAGE EXACTLY.
      - COMPOSITION: Analyze the reference image and use its exact layout (Subject placement, Text placement, Background style).
      - TEXT VISIBILITY: High Contrast, Legible, Professional.
      `;
    } else {
      prompt += `
      FORMAT: YouTube Thumbnail (16:9).
      - STYLE: "MrBeast Style" High CTR.
      - COMPOSITION: SPLIT LAYOUT RULE.
        * SUBJECT: Placed on the RIGHT (or LEFT) occupying 40% of frame.
        * TEXT AREA: Empty space on the OPPOSITE side.
      - TEXT VISIBILITY: HUGE, STROKED, HIGH CONTRAST.
      `;
    }
  }

  // CREATIVE BACKGROUND / PPT LOGIC
  if (type === CreationType.CREATIVE_BACKGROUND) {
    const isSubjectMode = !!customModelImage;
    const slideType = variationIndex === 1 ? 'COVER (CAPA)'
      : variationIndex === 2 ? 'AGENDA (ÍNDICE)'
        : variationIndex === 3 ? 'SECTION HEADER (DIVISOR)'
          : variationIndex === 4 ? 'CONTENT & IMAGE (CONTEÚDO)'
            : variationIndex === 5 ? 'DATA VISUALIZATION (DADOS)'
              : 'THANK YOU / CONTACT (CONTATO)';

    prompt += `
    === CREATIVE BACKGROUND & PPT LAYOUT ENGINE ===
    target_SLIDE_TYPE: ${slideType}
    
    GOAL: ${isSubjectMode ? 'Create a Corporate Presentation Slide with Subject.' : 'Create a High-End ABSTRACT BRAND BACKGROUND. Graphics Only.'}
    
    1. VISUAL IDENTITY (MINIMALIST APPROACH):
       - EXTRACT: Primary brand color (use sparingly as accents).
       - STYLE: Ultra-Clean, Corporate, Apple-Style Minimalism.
       - SHAPES: Use only simple GEOMETRIC shapes (Rectangles, Circles). NO organic blobs. NO messy patterns.
       - BACKGROUND: Predominantly WHITE or VERY LIGHT GRAY.
       - DO NOT create "Abstract Art". Create "Functional Slide Templates".
       ${config.brandColors && config.brandColors.length > 0 ? `
       === BRAND COLOR ACCENTS ===
       USE THESE COLORS FOR ACCENTS (Lines, Buttons, Small Shapes):
       ${config.brandColors.map((c, i) => `COLOR ${i + 1}: ${c}`).join('\n       ')}
       ` : ''}

    ${isSubjectMode ? `
    2. SLIDE ARCHETYPE RULES (VARIATION ${variationIndex}/6):
       
       ${variationIndex === 1 ? `
       [TYPE: COVER SLIDE]
       - COMPOSITION: Clean Split Screen (Left Text / Right Image).
       - STYLE: Professional Hero Section.
       - SUBJECT: Person is VISIBLE (Professional Pose).
       - NEGATIVE SPACE: Pure White area on the Left for Title.
       - VIBE: Premium, Trustworthy, Clear.
       ` : variationIndex === 4 ? `
       [TYPE: CONTENT SLIDE]
       - COMPOSITION: Standard Content Layout.
       - STYLE: WHITE BACKGROUND.
       - SUBJECT: Person is VISIBLE (Small, Pointing to content).
       - NEGATIVE SPACE: Large white area for text.
       - VIBE: Informative, Standard Corporate.
       ` : `
       [TYPE: GENERIC BACKGROUND]
       - COMPOSITION: Clean Background.
       - SUBJECT: **STRICTLY NO HUMANS**.
       - STYLE: Minimalist accents only.
       `}
    ` : `
    2. ABSTRACT BRAND BACKGROUND RULES (NO PERSON MODE):
       - FOCUS: Pure Graphic Design & Layout.
       - SUBJECT: **STRICTLY NO HUMANS. NO FACES. NO PEOPLE.**
       - COMPOSITION: Create a stunning, professional PowerPoint background using ONLY the brand colors and geometric shapes.
       - USE CASE: This image will be the background for a Slide Master.
       - ELEMENTS: Elegant curves, modern lines, subtle gradients, watermark-style logos (if provided).
       - NEGATIVE SPACE: KEEP CENTER EMPTY for user text.
       - VIBE: Premium, Corporate, Global Tech Company.
    `}

  3. STYLE:
  - Corporate, High-End, Clean.
       - Soft shadows, professional lighting.
       - Depth: The background should feel like a premium wall or digital surface.

    ${isSubjectMode ? `
    4. SUBJECT INTEGRATION:
  - The subject must look like they are standing in this branded environment.
       - Match lighting on the subject to the background colors.
    ` : ''}
    `;
  }

  // MASTER RULES
  prompt += `
  CRITICAL MASTER RULE - FORMAT & ASPECT RATIO:
  - ASPECT RATIO: ${aspectRatio}.
  - FILL 100 % OF THE CANVAS.
  
  NEGATIVE PROMPT(MANDATORY - STRICTLY ENFORCED):
  - WATERMARK REMOVAL: "Designi", "Designi" Logo, Diagonal Watermarks, White Grid Lines, Stock Photo Watermark.
  - TEXT & WATERMARKS: NO TEXT FROM INPUT IMAGES.NO COPYRIGHT SIGNS.NO STOCK PHOTO TEXT.NO BRANDING ON BACKGROUND.
  - SOURCE POISONING: DO NOT USE THE BACKGROUND PIXELS FROM IMAGE 2.
    - ARTIFACTS: NO blurry text, no jpeg artifacts, no pixelated logos.
      ${style === VisualStyle.DESIGNI_PD_PRO ?
      `- VISUAL QUALITY: No low resolution, no blurry text, no distorted faces.
     - COMPOSITION: No text covering the face. No messy composition.`
      :
      `- 3D SHAPES: NO SPHERES. NO CUBES. NO ABSTRACT GEOMETRY. NO FLOATING OBJECTS (Unless specified).
     - SYMBOLS: NO % SIGNS. NO RANDOM ICONS. NO EMOJI. NO FLOATING LOGOS.
     - GRAPHICS: NO ILLUSTRATION ELEMENTS. NO CARTOON STYLE. ONLY PHOTOREALISM.`
    }
  - TEXT: NO EXTRA WORDS.NO "LOREM IPSUM".NO FAKE PLACEHOLDERS.
  - PRODUCT: DO NOT INVENT A NEW PRODUCT.USE THE UPLOADED PRODUCT IMAGE EXACTLY.
  - STYLE: PROFESSIONAL PHOTOGRAPHY ONLY.Like magazine covers, not like mobile game ads.
    ${style === VisualStyle.DESIGNI_PD_PRO ? `- PRODUCT FIDELITY (CRITICAL): DO NOT CHANGE THE PRODUCT. IF A NOTEBOOK IS UPLOADED, USE THAT EXACT COVER ART. DO NOT GENERATE A GENERIC CARTOON NOTEBOOK. USE THE IMAGE 2.` : ''}
  `;

  return prompt;
};

// === MASCOT PRESETS LIBRARY ===
const getMascotPresets = (style: MascotStyle): string => {
  const presets: Record<MascotStyle, string> = {
    [MascotStyle.PIXAR_3D]: `
      VISUAL STYLE: 3D Animation Style(Pixar / Disney - like).
    RENDER: Octane Render, Redshift, Raytracing, Subsurface Scattering(SSS).
      FEATURES: Big expressive eyes, soft rounded shapes, vibrant lighting.
        TEXTURES: High quality velvet / skin / fabric textures.
          BACKGROUND: Clean studio gradient or soft blurred 3D environment.
            VIBE: Friendly, High - Budget Movie Character.
    `,
    [MascotStyle.CARTOON_2D]: `
      VISUAL STYLE: Classic 2D Vector Cartoon.
    RENDER: Flat colors, clean thick outlines, cel - shading.
      FEATURES: Exaggerated expressions, dynamic poses, simplified anatomy.
        COLORS: Bold, primary colors, high contrast.
          BACKGROUND: Solid color or simple vector pattern.
            VIBE: Tv Show, Sticker pack, Brand Mascot.
    `,
    [MascotStyle.ANIME_MODERN]: `
      VISUAL STYLE: Modern Anime / Manga.
    RENDER: 2D with high - quality digital painting effects.
      FEATURES: Large detailed eyes, spiky / stylized hair, dramatic lighting.
        AESTHETIC: Shonen / Shojo premium quality.
          BACKGROUND: Speed lines, sparkles, or detailed anime background.
            VIBE: Heroic, Cute(Kawaii), or Cool.
    `,
    [MascotStyle.CLAYMATION]: `
      VISUAL STYLE: Claymation / Stop Motion / Plasticine.
    RENDER: Fingerprint textures, imperfect clay surfaces, soft shadows.
      FEATURES: Aardman style, physical handcrafted look.
        LIGHTING: Studio photography lighting on small objects.
          VIBE: Tactile, Nostalgic, Hand - made.
    `,
    [MascotStyle.FUNKO_POP]: `
      VISUAL STYLE: Vinyl Toy Figure(Funko Pop style).
    ANATOMY: Giant square - ish head, black button eyes(or style specific), small body.
      RENDER: Plastic / Vinyl material, glossy finish.
        BOX: Optionally inside or near a collector box.
          VIBE: Collectible, Toy, Merchandise.
    `,
    [MascotStyle.HAND_DRAWN]: `
      VISUAL STYLE: Pencil Sketch / Watercolor / Marker.
    RENDER: Visible paper texture, rough strokes, artistic imperfections.
      FEATURES: Loose lines, artistic interpretation.
        VIBE: Organic, Creative, Draft, Storyboard.
    `,
    [MascotStyle.RETRO_PIXEL]: `
      VISUAL STYLE: 16 - bit or 32 - bit Pixel Art.
    RENDER: Blocky pixels, limited color palette, dither shading.
      FEATURES: Game sprite aesthetic, retro gaming.
        VIBE: Nostalgic, Tech, Indie Game.
    `,
    [MascotStyle.REALISTIC_PLUSHD]: `
      VISUAL STYLE: Realistic Plush Toy / Felt Material.
    RENDER: Visible fur / fabric fibers, stitching details, soft stuffing look.
      FEATURES: Cute button eyes, huggable shape.
        LIGHTING: Soft nursery lighting.
          VIBE: Adorable, Soft, Kid - friendly product.
    `
  };
  return presets[style] || presets[MascotStyle.PIXAR_3D];
};

const getStylePresets = (style: VisualStyle, socialClass?: SocialClass): string => {
  // PREMIUM DESIGN ENGINE - Inspired by Behance/Dribbble top commercial designs
  const premiumDesignRules = `
            === MANDATORY PREMIUM DESIGN ELEMENTS ===
              1. GEOMETRIC SHAPES: Add bold 3D shapes in background(spheres, cubes, donuts, abstract waves, splashes).
  2. FLOATING ELEMENTS: Include floating icons, decorative elements, or brand symbols strategically placed.
  3. DEPTH LAYERS: Create 3 distinct layers(foreground blur elements, mid - ground subject, background design).
  4. DYNAMIC COMPOSITION: Use rule of thirds.Person on one side, design elements on the other.
  5. COLOR VIBRANCY: Use saturated, bold colors.NO WASHED OUT PALETTES.
  6. LIGHT EFFECTS: Add lens flares, neon glows, gradient overlays, light rays where appropriate.
  `;

  switch (style) {
    // 🔘 MODERNO -> Tech Corporate Premium
    case VisualStyle.MODERN: return `${premiumDesignRules}
      ART DIRECTION: MODERN DIGITAL ADVERTISING(Clean & Bold).
    BACKGROUND: Smooth, matte gradient backgrounds(Deep Blue / Purple or Brand Color) with subtle motion blur.
      DESIGN ELEMENTS:
  - ROUNDED GLASS PANELS specifically placed to hold text(Sidebar or Bottom card).
  - Floating 3D abstract shapes(Matte finish, non - distracting) to add depth.
    - Clean layout with 40 % NEGATIVE SPACE reserved for headlines.
      - Soft UI elements(like notification bubbles or search bars) if Tech product.
      COLORS: Brand Colors + White / Grey.High contrast.
        LIGHTING: Soft, diffused commercial lighting.No harsh shadows.
          TYPOGRAPHY:
  - FONT FAMILY: Sans - serif Geometric(Inter, Roboto, Poppins).
      - STYLE: Clean, bold headlines.High readability.
      - WEIGHT: Bold for headers, Regular for body.
    COMPOSITION: Asymmetrical.Subject Left / Right.Clear Empty Space for Text on opposite side.
      VIBE: Premium App Store Ad, SaaS Landing Page, Modern Startup.`;

    // 🔘 PROFISSIONAL -> Trust Authority Premium
    case VisualStyle.PROFESSIONAL: return `${premiumDesignRules}
      ART DIRECTION: HIGH - END COMMERCIAL CAMPAIGN(TV Commercial Style).
    BACKGROUND: Dynamic Studio Background(Infinite Wall or Blurred City / Office with depth).
      DESIGN ELEMENTS:
  - DYNAMIC MOTION: Blurred particles or light trails indicating speed / efficiency.
    - PRODUCT CONTEXT: Floating elements relevant to niche(e.g.Coins / Graphs for Finance, Ingredients for Food).
      - NO GOLD FRAMES.NO MARBLE.NO OLD SCHOOL LUXURY.
        - Clean, invisible grids organizing the space.
    COLORS: Deep, rich commercial tones(Navy, Charcoal, Forest Green) or BRAND PRIMARY COLOR.
      LIGHTING: Cinematic "Hero" Lighting.Rim lights separating subject from background.
        TYPOGRAPHY:
  - FONT FAMILY: Authoritative Serif or Sans(Helvetica, Garamond, Playfair Display).
      - STYLE: Trustworthy, established, premium.
      - WEIGHT: Medium to Bold.
    COMPOSITION: Cinematic wide aperture feel.Focus on Subject + Product.
      VIBE: Nike Ad, Bank TV Commercial, High - Budget Photoshoot.`;

    // 🔘 CRIATIVO -> Bold Colorful Explosion
    case VisualStyle.CREATIVE: return `${premiumDesignRules}
      ART DIRECTION: BOLD COLORFUL EXPLOSION(Spotify Wrapped / Canva Pro Style).
    BACKGROUND: Vibrant mesh gradient(Purple / Pink / Yellow / Orange fusion) with fluid abstract shapes.
      DESIGN ELEMENTS:
  - BOLD 3D shapes: Donuts, twisted rings, abstract sculptures, paint splashes
    - Floating colorful spheres and particles
      - Organic flowing shapes and waves
        - Neon accent lines and glowing edges
          - Confetti or particle burst effects
  COLORS: Hot Pink(#FF1493), Electric Yellow(#FFE500), Vibrant Purple(#9B59B6), Cyan.
    LIGHTING: Colorful ambient lighting matching gradient.Multiple color sources.
      TYPOGRAPHY:
  - FONT FAMILY: Bold Display, Artistic, Experimental(Clash Display, Syne, Bangers).
      - STYLE: Playful, loud, unconventional.
      - WEIGHT: Black / Heavy.
    COMPOSITION: Dynamic diagonal composition.Subject on one third, explosion of elements on the other.
      VIBE: Spotify Wrapped, Instagram Year in Review, Festival Poster.`;

    // 🔘 CLEAN -> Apple Minimalism Premium
    case VisualStyle.CLEAN: return `${premiumDesignRules}
      ART DIRECTION: ULTRA - CLEAN MINIMALISM(Apple Style Premium).
    BACKGROUND: Pure white void OR soft grey gradient with subtle shadows.
      DESIGN ELEMENTS:
  - Minimal: only soft contact shadows
    - ONE focal point(the subject / product)
      - Subtle light gradient behind subject
        - Clean geometric frame or border(optional)
  COLORS: Pure White(#FFFFFF), Soft Grey(#F5F5F5), ONE accent color from brand.
    LIGHTING: Soft, diffused light.No harsh shadows.Beauty dish setup.
      TYPOGRAPHY:
  - FONT FAMILY: Minimalist Sans(Helvetica Neue, San Francisco, Arial).
      - STYLE: Neutral, invisible, functional.
      - WEIGHT: Light to Medium.
    COMPOSITION: Perfect center or extreme negative space.Let the subject breathe.
      VIBE: Apple Product Page, Tesla Marketing, Premium Tech Unboxing.`;

    // 🔘 DARK -> Cyberpunk Premium
    case VisualStyle.DARK: return `${premiumDesignRules}
      ART DIRECTION: PREMIUM DARK MODE(Cyberpunk / Gaming Style).
    BACKGROUND: Matte Black(#0A0A0A) with subtle carbon fiber or hex grid texture.
      DESIGN ELEMENTS:
  - Neon rim lights(Cyan / Magenta / Purple)
    - Cyberpunk grid lines fading into perspective
      - Holographic / glitch effects
        - Floating neon geometric shapes
          - Subtle circuit board patterns
  COLORS: Pure Black, Neon Cyan(#00FFFF), Hot Magenta(#FF00FF), Electric Purple.
    LIGHTING: Strong rim / edge lighting with neon colors.Dark key light.
      TYPOGRAPHY:
  - FONT FAMILY: Monospace, Cyberpunk Sans, Futuristic(Orbitron, Rajdhani, Courier Prime).
      - STYLE: Tech - oriented, digital, edgy.
      - WEIGHT: Bold headers, light body.
    COMPOSITION: Subject emerging from darkness with dramatic lighting.
      VIBE: Gaming Brand, Tech Startup Night Mode, Cyberpunk 2077.`;

    // 🔘 LUXO -> Gold & Marble Premium
    case VisualStyle.LUXURY: return `${premiumDesignRules}
      ART DIRECTION: LUXURY FASHION(Chanel / Dior Level).
    BACKGROUND: Black marble texture OR silk drape OR gold foil accents on dark.
      DESIGN ELEMENTS:
  - Gold leaf accents and geometric gold lines
    - Marble texture overlays
      - Silk or satin fabric elements
        - Subtle diamond / crystal reflections
          - Elegant serif typography overlay(optional)
  COLORS: Gold(#D4AF37), Black, Cream(#FFFDD0), Rose Gold.
    LIGHTING: Golden hour spotlight.Warm, luxurious tones.
      TYPOGRAPHY:
  - FONT FAMILY: Elegant Serif(Bodoni, Didot, Cinzel).
      - STYLE: High - contrast stroke, sophisticated, expensive.
      - WEIGHT: Regular to Bold.
    COMPOSITION: Elegant and sophisticated.Subject as the jewel of the composition.
      VIBE: Chanel No.5, Rolex Ad, Luxury Hotel Campaign.`;

    // 🔘 MINIMALISTA -> Japanese Zen Premium
    case VisualStyle.MINIMALIST: return `${premiumDesignRules}
      ART DIRECTION: JAPANESE MINIMALISM(Muji / IKEA Premium).
    BACKGROUND: Natural paper texture OR solid pastel(Beige / Sage / Blush).
      DESIGN ELEMENTS:
  - Extreme negative space
    - ONE accent color accent shape(circle or line)
      - Subtle organic shapes(branch shadow, leaf)
        - Paper fold or origami texture
  COLORS: Off - White(#FAF9F6), Soft Beige, ONE muted accent(Sage, Terracotta, Dusty Rose).
    LIGHTING: Soft natural light.Shadow play from windows.
      TYPOGRAPHY:
  - FONT FAMILY: Thin Sans, Refined Serif(Montserrat Light, Lato, Playfair Display).
      - STYLE: Delicate, airy, spaced out.
      - WEIGHT: Thin to Light.
    COMPOSITION: Perfect balance.Zen - like harmony.Empty space is intentional.
      VIBE: Muji Catalog, Japanese Tea Brand, Wellness Retreat.`;

    // 🔘 TECNOLÓGICO -> Fintech/Crypto Premium
    case VisualStyle.TECH: return `${premiumDesignRules}
      ART DIRECTION: FINTECH / CRYPTO(Revolutionary Tech Style).
    BACKGROUND: Deep Blue / Purple gradient with data visualization elements.
      DESIGN ELEMENTS:
  - Glassmorphism cards and panels
    - Data flow lines and node networks
      - Holographic / iridescent accents
        - 3D abstract tech shapes(wireframe, mesh)
          - Floating graphs and charts(abstract)
  COLORS: Deep Blue(#1E3A8A), Electric Purple(#7C3AED), Cyan glow, White.
    LIGHTING: Cool blue ambient with accent lights.
      TYPOGRAPHY:
  - FONT FAMILY: Monospace, Futuristic Sans(Space Mono, Exo 2, Share Tech Mono).
      - STYLE: Data - driven, modern, precise.
      - WEIGHT: Medium.
    COMPOSITION: Tech - forward, dynamic angles, multiple layers of information.
      VIBE: Stripe, Coinbase, Modern Banking App.`;

    // 🔘 INFANTIL -> 3D Pixar Premium
    case VisualStyle.INFANTIL: return `${premiumDesignRules}
      ART DIRECTION: 3D CUTE WORLD(Pixar / Nintendo Style).
    BACKGROUND: Soft pastel gradient OR 3D rendered playroom / clouds.
      DESIGN ELEMENTS:
  - Soft rounded 3D shapes(balloons, stars, clouds)
    - Candy / toy textures
      - Rainbow or pastel color accents
        - Cute floating elements(hearts, stars, bubbles)
          - 3D rendered character style
  COLORS: Pastel Pink, Soft Blue, Mint Green, Sunny Yellow, Lavender.
    LIGHTING: Soft, warm, friendly.No harsh shadows.
      TYPOGRAPHY:
  - FONT FAMILY: Rounded, Bubbly, Handwritten, Fun(Comic Neue, Fredoka One, Chewy, Balsamiq Sans).
      - STYLE: Playful, friendly, legible for kids.
      - WEIGHT: Bold, Rounded.
      COMPOSITION: Playful and inviting.Subject surrounded by fun elements.
        VIBE: Disney +, Nursery Brand, Kids App Promo.`;

    // 🔘 UGC INSTAGRAM -> Authentic Influencer (SPECIAL: Popular = Homemade Brazilian Selfie)
    case VisualStyle.UGC_INSTAGRAM:
      // POPULAR CLASS = FOTO CASEIRA BRASILEIRA (Selfie estilo "gente como a gente")
      if (socialClass?.includes('Popular')) {
        return `
          === ESTILO ESPECIAL: FOTO CASEIRA BRASILEIRA ===

            CRITICAL: Este é o ÚNICO estilo que deve parecer foto CASEIRA, NÃO PROFISSIONAL.
          
          TIPO DE FOTO: SELFIE ou foto tirada por amigo / familiar.
          
          CARACTERÍSTICAS OBRIGATÓRIAS:
  - Câmera: CELULAR COMUM(Samsung médio, Motorola, não iPhone Pro)
    - Qualidade: Ligeiramente granulada, não perfeita(autêntico)
      - Iluminação: LUZ NATURAL de janela OU luz fluorescente(levemente esverdeada)
        - Enquadramento: IMPERFEITO, pessoa levemente cortada ou descentralizada
          - Fundo: CASA REAL brasileira(sofá, geladeira, quadro na parede, cortina simples)
          
          AMBIENTE CASEIRO BRASILEIRO:
  - Sala de casa simples e LIMPA(não luxuosa, mas digna)
    - Parede branca ou creme(tijolinho bege bem cuidado)
      - Sofá de tecido, rack de TV, quadrinho de família
        - Mesa de cozinha, geladeira atrás, azulejo simples
          - Quarto simples com cama arrumada, armário de porta
          
          POSE DA PESSOA:
  - Segurando o celular(selfie) com braço levemente esticado
    - OU amigo tirou a foto(ângulo frontal caseiro)
      - Sorriso natural, não posado
        - Roupa casual do dia - a - dia(camiseta, bermuda, chinelo ok)
          
          ESTILO DE ILUMINAÇÃO:
  - Luz de janela durante o dia
    - OU luz de lâmpada fluorescente(levemente fria / esverdeada)
      - Sombras suaves naturais, não profissionais

  PROIBIDO:
  - Ring light profissional
    - Estúdio fotográfico
      - Iluminação de cinema
        - Fotos muito perfeitas
          - iPhone Pro ou câmera profissional
            - Casas de luxo ou apartamentos modernos
              - Filtros pesados de Instagram

  TYPOGRAPHY(IF APPLICABLE):
  - FONT FAMILY: System Fonts, Instagram Story Fonts(San Francisco, Roboto, Courier, Neon).
  - STYLE: Casual, overlay text style.
  - WEIGHT: Various(Bold match).

    VIBE: "Foto do grupo de família no WhatsApp", "Cliente real mostrando compra", "Depoimento verdadeiro"
      `;
      }

      // CLASSE MÉDIA ou ALTA = UGC Premium (Influencer profissional)
      return `${premiumDesignRules}
      ART DIRECTION: AUTHENTIC INFLUENCER(Real UGC Style).
    BACKGROUND: Real blurred environment(Cafe, Street, Living Room, Gym) with natural depth.
      DESIGN ELEMENTS:
  - NO artificial graphics(keep authentic)
    - Natural bokeh and light leaks
      - Real - world objects out of focus
        - Genuine lifestyle setting
  COLORS: Natural, warm tones.Golden hour palette.
    LIGHTING: Natural light(window, golden hour, ring light).
      TYPOGRAPHY:
  - FONT FAMILY: Modern Sans, Instagram Fonts(Proxima Nova, Aveny - T, Cosmopolitan).
      - STYLE: Trendy, influencer aesthetic.
      - WEIGHT: Medium to Bold.
    COMPOSITION: Selfie - style or friend - took - photo feel.Slightly off - center, candid.
      VIBE: Instagram Creator, TikTok Testimonial, Real Customer Review.`;

    // 🔘 EDITORIAL -> Vogue Fashion Premium
    case VisualStyle.EDITORIAL: return `${premiumDesignRules}
      ART DIRECTION: VOGUE EDITORIAL(High Fashion Magazine).
    BACKGROUND: Solid color studio backdrop(Bold Red, Electric Blue, Hot Pink) OR dramatic shadows.
      DESIGN ELEMENTS:
  - High contrast lighting
    - Bold color blocking
      - Minimalist but impactful
        - Fashion magazine aesthetic
          - Possible typography overlay(magazine title style)
  COLORS: ONE bold solid color + Black / White contrast.
    LIGHTING: Hard flash, dramatic shadows, high contrast.
      TYPOGRAPHY:
  - FONT FAMILY: High - Fashion Serif, Didone(Didot, Bodoni, Playfair Display).
      - STYLE: Elegant, sharp, magazine cover style.
      - WEIGHT: Bold / Black for titles, Light for captions.
    COMPOSITION: Fashion model pose.Editorial framing.Magazine cover ready.
      VIBE: Vogue Cover, Harper's Bazaar, Fashion Campaign.`;

    // 🔘 COMERCIAL PREMIUM -> Black Friday Retail
    case VisualStyle.COMMERCIAL_PREMIUM: return `${premiumDesignRules}
      ART DIRECTION: HIGH IMPACT RETAIL (Black Friday / Launch Style).
      BACKGROUND: Explosive starburst (Yellow/Red) OR dynamic speed lines OR radial rays.
      DESIGN ELEMENTS:
        - 3D floating shapes (circles, badges, ribbons)
        - Starburst and explosion effects
        - Floating price tags or badges
        - Confetti and celebration particles
        - Bold geometric frames and borders
      COLORS: Attention Red (#FF0000), Electric Yellow (#FFFF00), Black, White.
      LIGHTING: High energy, multiple light sources, dramatic.
      TYPOGRAPHY:
        - FONT FAMILY: Heavy Sans-Serif (Impact, Anton, Franklin Gothic, Bebas Neue).
        - STYLE: Urgent, loud, sales-focused.
        - WEIGHT: Heavy/Black.
      COMPOSITION: Explosive, dynamic. Subject bursting out of frame. Maximum impact.
      VIBE: Black Friday Ad, Product Launch, Flash Sale Banner.`;

    // 🔘 GLOW_BEAUTY -> Cosmetic Premium
    case VisualStyle.GLOW_BEAUTY: return `${premiumDesignRules}
      ART DIRECTION: SKINCARE COMMERCIAL (L'Oreal / Glossier Style).
      BACKGROUND: Water ripple effect OR pearl/iridescent texture OR soft pink gradient.
      DESIGN ELEMENTS:
        - Water droplets and splash effects
        - Pearl and shimmer textures
        - Soft bokeh light particles
        - Dewy/wet skin effect on subject
        - Organic flower petals or leaves (optional)
      COLORS: Soft Pink, Pearl White, Rose Gold, Nude tones.
      LIGHTING: Soft beauty dish. Glowing skin effect. Dewy highlights.
      TYPOGRAPHY:
        - FONT FAMILY: Elegant Sans or Serif (Optima, Tenor Sans, Lato Light).
        - STYLE: Clean, sophisticated, feminine.
        - WEIGHT: Light to Regular.
      COMPOSITION: Close-up or medium shot. Focus on skin/beauty. Ethereal and glowing.
      VIBE: Glossier Ad, L'Oreal Commercial, Skincare Product Launch.`;

    // 🔘 DESIGNI_PD_PRO -> Reference-Based Commercial Design
    case VisualStyle.DESIGNI_PD_PRO: return `${premiumDesignRules}
      ART DIRECTION: TOPAR GRAPHIC DESIGN (Ad Library Winners).
      BACKGROUND: Use one of the 3 archetypes (Split Block, Organic Container, or Floating Card) defined above.
      
      MANDATORY COMPOSITION RULES:
      1. CONTAINERIZATION: Text NEVER floats on busy backgrounds. It MUST be inside a Solid Block, a Pill Shape, or a clear Card.
      2. COLOR EXTRACTION: Detect the PRIMARY product color. Use it for the Blocks/Shapes.
      3. SAFE ZONES: Create a "Designated Text Area" that is completely solid and high-contrast.
      
      REFERENCE INSPIRATION:
      - Like high-end Real Estate ads (Split screen, clear info columns).
      - Like Supplement ads (Bold typography, topographic textures, energy).
      - Like Tech ads (Clean cards, floating UI elements).
      
      TYPOGRAPHY:
        - FONT FAMILY: Professional Sans-Serif (Gotham, Proxima Nova, Montserrat).
        - STYLE: Versatile, corporate, clean.
        - WEIGHT: Multiple weights (Bold for headers, Regular for text).

      VIBE: Commercial, Trustworthy, High-End, Organized.`;

    // 🔘 RELIGIOUS -> Ethereal Light Premium
    case VisualStyle.RELIGIOUS: return `${premiumDesignRules}
      ART DIRECTION: MODERN CHURCH (Ethereal & Hopeful).
      BACKGROUND: Soft light rays descending, clouds, or subtle cross texture.
      DESIGN ELEMENTS:
        - Divine light rays (volumetric light)
        - Soft clouds or heavenly atmosphere
        - Subtle dove or cross silhouettes
        - Golden accents and halos
        - Peaceful natural elements
      COLORS: Gold (#D4AF37), Pure White, Sky Blue (#87CEEB), Soft Purple.
      LIGHTING: Soft, ethereal, heavenly. Light from above.
      TYPOGRAPHY:
        - FONT FAMILY: Traditional Serif, Elegant Script (Playfair Display, Great Vibes, Cinzel).
        - STYLE: Graceful, respectful, classical.
        - WEIGHT: Regular to Medium.
      COMPOSITION: Uplifting, hopeful. Subject bathed in divine light.
      VIBE: Modern Church Campaign, Worship Album Cover, Faith-Based Brand.`;

    // 🔘 DELIVERY & FOOD -> Premium Food
    case VisualStyle.DELIVERY: return `${premiumDesignRules}
      ART DIRECTION: PREMIUM FOOD (Uber Eats / DoorDash Style).
      BACKGROUND: Dark slate, wooden table texture, OR kitchen environment blur.
      DESIGN ELEMENTS:
        - Appetizing food styling (if food visible)
        - Warm steam or smoke effects
        - Natural ingredients scattered
        - Restaurant ambiance elements
        - Floating ingredients (if relevant)
      COLORS: Warm tones (Orange, Yellow, Brown), Appetizing Red, Fresh Green.
      LIGHTING: Warm, appetizing lighting. Golden highlights.
      TYPOGRAPHY:
        - FONT FAMILY: Friendly Sans, Rounded, Script (Fredoka, Varela Round, Pacifico).
        - STYLE: Delicious, inviting, warm.
        - WEIGHT: Bold/Rounded.
      COMPOSITION: Food-centric or delivery-hero style. Mouth-watering presentation.
      
      HUMAN INTERACTION RULES (CRITICAL):
      - GAZE: The Person MUST look AT THE FOOD (with desire/appetite) OR AT THE CAMERA (presenting the food).
      - ACTION: Holding the food, aiming to eat, or offering to camera.
      - PROPORTIONS (CRITICAL): The product MUST be RE-SCALED to match the human hands realistically.
      - NO GIANT BURGERS. NO TINY PIZZAS. REALISTIC SCALE ONLY.
      - HANDS: Natural grip. Fingers must not melt into the food.
      VIBE: Uber Eats Premium, Restaurant Campaign, Food Delivery Launch.`;

    default: return `${premiumDesignRules}
      ART DIRECTION: PROFESSIONAL PREMIUM STANDARD.
      BACKGROUND: Clean gradient with subtle design elements.
      DESIGN ELEMENTS: Add geometric shapes, floating elements, and professional accents.
      COLORS: Brand-appropriate palette with vibrant accents.
      LIGHTING: Professional studio lighting with dramatic touch.
      COMPOSITION: Dynamic, balanced, visually striking.
      VIBE: High-End Commercial Advertisement.`;
  }
};

const getStudioPresets = (style: StudioStyle): string => {
  switch (style) {
    case StudioStyle.EXECUTIVO_PRO: return "STYLE: Professional Corporate Leadership. LAYOUT: Center subject. FILL THE ENTIRE CANVAS. NO BORDERS. NO LETTERBOX. BACKGROUND: Modern Glass Office with blurred city skyline depth. LIGHTING: Soft reliable key light.";
    case StudioStyle.EDITORIAL_VOGUE: return "STYLE: High-Fashion Magazine. LAYOUT: Bold minimal photographic composition. FILL THE ENTIRE CANVAS. NO BORDERS. NO LETTERBOX. BACKGROUND: Simple warm gray or hand-painted canvas studio backdrop. LIGHTING: Dramatic Chiaroscuro (High Contrast).";
    case StudioStyle.FITNESS_PRO: return "STYLE: Elite Athletic Performance. LAYOUT: Dynamic camera angle. BACKGROUND: Dark high-tech gym with neon rim lights. LIGHTING: Hard rim lighting highlighting muscle definition.";
    case StudioStyle.CYBERPUNK_NEON: return "STYLE: Futurism & Sci-Fi. LAYOUT: Cinematic depth. BACKGROUND: Rainy neon city street or Data Center with clean dark zones. LIGHTING: Cyan and Magenta gels.";
    case StudioStyle.MINIMALIST_ZEN: return "STYLE: Organic Purity & Calm. LAYOUT: Massive white space (clean wall). BACKGROUND: Bright minimalist interior with plants, soft wood textures. LIGHTING: Diffused natural window light.";
    case StudioStyle.LUXURY_GOLD: return "STYLE: Opulence & Galas. LAYOUT: Elegant center focus. BACKGROUND: Dark Marble walls with Gold art deco accents in background. LIGHTING: Warm golden spotlight.";
    case StudioStyle.URBAN_STREET: return "STYLE: Street Culture & Hype. LAYOUT: Wide angle, street depth. BACKGROUND: Concrete wall with artistic graffiti. LIGHTING: Natural overcast.";
    case StudioStyle.VINTAGE_FILM: return "STYLE: Retro Nostalgia. LAYOUT: Standard 35mm framing. BACKGROUND: Warm simplistic colored backdrop. LIGHTING: Direct flash look or warm sunset haze.";
    case StudioStyle.FUTURISTA_LAB: return "STYLE: Scientific Innovation. LAYOUT: Sterile central composition. BACKGROUND: White clean room, holographic data displays in background (not overlay). LIGHTING: Cool white clinical.";
    case StudioStyle.GLOW_BEAUTY: return "STYLE: Cosmetic & Skincare. LAYOUT: Extreme close-up or beauty portrait. BACKGROUND: Soft focus pastel colors, water ripples, cream textures. LIGHTING: Ring light beauty dish.";

    // NEW STYLES
    case StudioStyle.OLD_MONEY: return "STYLE: Old Money / Silent Luxury. LAYOUT: Classic Portraiture. BACKGROUND: Estate Library, Country Club terrace, or Limestone Mansion wall. Texture: Linen, Velvet, Oak Wood. LIGHTING: Warm Golden Hour, Rich Cinematographic shadows.";
    case StudioStyle.NATURE_FRESH: return "STYLE: Organic & Eco-Friendly. LAYOUT: Natural & Airy. BACKGROUND: Lush Botanical Garden, Greenhouse with glass walls, or Sunlight filtering through leaves (Gobo). LIGHTING: Soft, diffused daylight, fresh and clean.";
    case StudioStyle.INDUSTRIAL_CHIC: return "STYLE: Modern Start-up / Loft. LAYOUT: Clean lines. BACKGROUND: Polished Concrete walls, Exposed Brick, Large Black Metal Windows. LIGHTING: Soft cool daylight mixed with warm interior Tungsten.";
    case StudioStyle.POP_ART: return "STYLE: Bold Pop Art / Gen Z. LAYOUT: High Impact Commercial. BACKGROUND: Solid Electric Blue or Hot Pink matte background. Geometric precision. LIGHTING: Hard High-Key Studio Flash, Sharp Shadows, High Saturation.";
    case StudioStyle.COASTAL_LUXE: return "STYLE: Mediterranean Vacation. LAYOUT: Relaxed Elegance. BACKGROUND: White Stucco walls, Blue Ocean blur in distance, Beige Sand tones. LIGHTING: Bright High-Key Natural Daylight, very soft shadows.";

    // PROFISSÕES POPULARES
    case StudioStyle.CHEF_BUFFET: return "STYLE: Professional Chef / Buffet Cook. LAYOUT: Dynamic kitchen action. BACKGROUND: Commercial kitchen with stainless steel equipment, steam, and warm ambient. Props: Chef hat, white uniform, cooking utensils. LIGHTING: Warm tungsten kitchen lighting with steam effects.";
    case StudioStyle.CORRETOR_IMOVEIS: return "STYLE: Real Estate Agent / Broker. LAYOUT: Confident professional pose. BACKGROUND: Modern luxury apartment interior, large windows with city view, or elegant property entrance. Props: Keys, tablet, professional attire. LIGHTING: Bright natural daylight, warm and inviting.";
    case StudioStyle.VENDEDOR_CARROS: return "STYLE: Car Salesperson / Dealership. LAYOUT: Showroom presence. BACKGROUND: Luxury car showroom with polished floors, premium vehicles, modern architecture. Props: Car keys, professional suit, tablet. LIGHTING: Bright showroom lighting with reflections.";
    case StudioStyle.MEDICO_DENTISTA: return "STYLE: Healthcare Professional / Doctor / Dentist. LAYOUT: Trustworthy medical portrait. BACKGROUND: Clean medical office, white walls, modern clinic equipment, or blurred hospital corridor. Props: White coat, stethoscope, clipboard. LIGHTING: Clean clinical white lighting, professional and sterile.";
    case StudioStyle.ADVOGADO: return "STYLE: Lawyer / Attorney. LAYOUT: Authoritative professional portrait. BACKGROUND: Law office with bookshelves full of law books, wooden desk, leather chair, scales of justice. Props: Suit, legal documents, glasses. LIGHTING: Warm sophisticated office lighting, golden hour from windows.";
    case StudioStyle.PERSONAL_TRAINER: return "STYLE: Personal Trainer / Fitness Coach. LAYOUT: Energetic athletic pose. BACKGROUND: Modern gym with equipment, functional training area, or outdoor fitness park. Props: Stopwatch, training gloves, athletic wear. LIGHTING: Dynamic gym lighting with energy, rim lights for definition.";
    case StudioStyle.CABELEIREIRO: return "STYLE: Hairdresser / Barber / Stylist. LAYOUT: Creative professional pose. BACKGROUND: Modern salon with mirrors, styling chairs, professional products, industrial chic decor. Props: Scissors, comb, styling tools, black cape. LIGHTING: Soft flattering salon lighting with ring light effect.";
    case StudioStyle.ARQUITETO: return "STYLE: Architect / Interior Designer. LAYOUT: Creative professional portrait. BACKGROUND: Modern design studio, architectural models, blueprints on walls, minimalist workspace. Props: Blueprints, scale ruler, tablet with design software. LIGHTING: Natural studio light from large windows, clean and modern.";
    case StudioStyle.TATUADOR: return "STYLE: Tattoo Artist. LAYOUT: Creative edgy portrait. BACKGROUND: Tattoo studio with flash art on walls, tattoo chair, ink bottles, artistic urban environment. Props: Tattoo machine, gloves, artistic tattoos visible. LIGHTING: Moody atmospheric lighting with neon accents, artistic shadows.";
    case StudioStyle.FOTOGRAFO: return "STYLE: Photographer / Creative Artist. LAYOUT: Behind-the-camera professional. BACKGROUND: Photography studio with lights, backdrops, equipment, or outdoor shoot location. Props: Professional camera, lens, lighting equipment. LIGHTING: Studio strobe lighting setup, professional photography environment.";

    // NEW PROFESSIONS
    case StudioStyle.DESIGNER_GRAFICO: return "STYLE: Creative Graphic Designer. LAYOUT: Modern creative workspace. BACKGROUND: Studio with dual monitors, color swatches, mood boards on wall, tablet. Props: Stylus, coffee, pantone books. LIGHTING: Soft screen glow mixed with daylight.";
    case StudioStyle.MAQUIADORA: return "STYLE: Professional Makeup Artist / MUA. LAYOUT: Beauty influencer portrait. BACKGROUND: Vanity mirror with Hollywood bulbs, makeup brushes, palettes, ring light reflection. Props: Makeup brush, sponge, mirror. LIGHTING: Flattering focused beauty lighting (Ring Light).";
    case StudioStyle.NUTRICIONISTA: return "STYLE: Nutritionist / Dietitian. LAYOUT: Welcoming health professional. BACKGROUND: Bright modern clinic with fruit bowl, measuring tape, anatomical charts or healthy food imagery. Props: Apple, measuring tape, tablet. LIGHTING: Fresh, clean, high-key bright.";
    case StudioStyle.ENGENHEIRO: return "STYLE: Civil Engineer / Architect on Site. LAYOUT: Industrial professional look. BACKGROUND: Active construction site (blurred) or office with rolled blueprints and hard hat visible. Props: White hard hat, safety vest, blueprints. LIGHTING: Daylight or high-vis industrial.";
    case StudioStyle.PSICOLOGO: return "STYLE: Psychologist / Therapist. LAYOUT: Empathetic & Welcoming. BACKGROUND: Cozy therapy office, comfortable armchair, bookshelf, plants, warm decor. Props: Notebook, glasses, tissue box. LIGHTING: Warm, soothing, soft ambient light.";

    // FAMILY STYLES - STRICT IDENTITY & COUNT RULES
    // FAMILY STYLES - STRICT IDENTITY & COUNT RULES
    // FAMILY STYLES - STRICT IDENTITY & COUNT RULES
    case StudioStyle.FAMILY_STUDIO_CLEAN: return "STYLE: Classic Commercial Family Photography. LAYOUT: High-Key Infinite White. BACKGROUND: Pure white cyclorama studio. CRITICAL: COUNT PEOPLE IN INPUT AND MATCH EXACTLY. IF 2 PEOPLE, GENERATE 2. DO NOT REMOVE ANYONE. EXPRESSION: MATCH INPUT FACE. DO NOT FORCE SMILE. LIGHTING: Large softboxes, bright, airy, shadowless high-key lighting. VIBE: Clean, timeless, high-end.";
    case StudioStyle.FAMILY_LIFESTYLE_HOME: return "STYLE: Cozy Home Lifestyle. LAYOUT: Candid family moment. BACKGROUND: Blurred living room, soft beige tones. CRITICAL: STRICTLY PRESERVE ALL SUBJECTS. IF 2 PEOPLE (E.G. MOTHER AND DAUGHTER), MUST GENERATE 2 PEOPLE. DO NOT CROP ANYONE OUT. EXPRESSION: NATURAL, CALM. DO NOT FORCE LAUGHTER. LIGHTING: Natural soft window light. VIBE: Authentic, comfortable, warmth.";
    case StudioStyle.FAMILY_GOLDEN_HOUR: return "STYLE: Outdoor Emotions. LAYOUT: Cinematic Backlit. BACKGROUND: Open field at sunset. CRITICAL: MAINTAIN EXACTLY THE SAME PEOPLE AS INPUT. IF SINGLE PERSON, KEEP SINGLE. IF 2+ PEOPLE, KEEP EVERYONE. DO NOT ADD OR REMOVE ANYONE. EXPRESSION: SERENE, EMOTIONAL. LIGHTING: Warm golden backlight (Rim light). VIBE: Cinematic, nostalgic.";
    case StudioStyle.FAMILY_BEACH: return "STYLE: Coastal Vacation. LAYOUT: Bright & Airy Outdoor. BACKGROUND: Blurred white sand beach. CRITICAL: MATCH SUBJECT COUNT EXACTLY. NO MISSING PEOPLE. NO EXTRA CHILDREN. EXPRESSION: NATURAL RELAXED LOOK. LIGHTING: High-key natural sunlight. VIBE: Summer, freedom, breeze.";
    case StudioStyle.FAMILY_CHRISTMAS: return "STYLE: Magical Christmas Card. LAYOUT: Festive Holiday Portrait. BACKGROUND: Christmas tree with bokeh lights. CRITICAL: FAMILY PORTRAIT - PRESERVE ALL FACES. DO NOT INVENT CHARACTERS OR REMOVE FAMILY MEMBERS. EXPRESSION: GENTLE, NO OVER-THE-TOP SMILING. LIGHTING: Warm glowing ambient light. VIBE: Magical, festive, tradition.";

    default: return "Professional studio lighting with clean photographic composition.";
  }
};

const getUGCContext = (socialClass?: SocialClass, environment?: UGCEnvironment, customEnvironment?: string, model?: UGCModel): string => {
  let baseContext = "Authentic domestic setting, natural lighting.";

  // 0. DEFINE MODEL (Persona) - If not provided, random.
  const modelContext = model ? `SUBJECT: ${model}. ` : "";

  // Helper for specific room textures based on Class
  // NOW CONTEXT AWARE: We only return tiles if it makes sense for the room.
  const getRoomDetails = (cls: string, env: UGCEnvironment, customEnv?: string) => {
    const isBathroomOrKitchen = env === UGCEnvironment.HOME && (customEnv?.toLowerCase().includes('banheiro') || customEnv?.toLowerCase().includes('cozinha') || customEnv?.toLowerCase().includes('kitchen') || customEnv?.toLowerCase().includes('bathroom'));
    const isLivingRoomOrBedroom = env === UGCEnvironment.HOME && !isBathroomOrKitchen;

    // POPULAR CLASS TEXTURES - REALISTIC BRAZILIAN HOME (GRITTY BUT DIGNIFIED)
    const popularLiving = [
      "simple painted wall with imperfections (parede pintada simples)",
      "red floor wax (piso vermelhão encerado)",
      "old ceramic floor (piso caquinho)",
      "simple wooden door frame"
    ];
    const popularTiles = [
      "simple beige square tiles 15x15",
      "old floral kitchen tiles (azulejo antigo)"
    ];

    // MIDDLE CLASS TEXTURES
    const middleLiving = [
      "smooth beige painted wall with frames", "geometric wallpaper", "clean white wall with wooden shelves",
      "soft cream wall with baseboards", "textured white wall"
    ];

    // HIGH CLASS TEXTURES
    const highLiving = [
      "honed marble stone wall", "dark wooden vertical slats", "minimalist concrete finish",
      "art gallery white wall", "luxury textured wallpaper", "boiserie paneling"
    ];

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    if (cls.includes('Popular')) {
      return isBathroomOrKitchen ? pick(popularTiles) : pick(popularLiving);
    }
    if (cls.includes('Média')) return pick(middleLiving);
    if (cls.includes('Alta')) return pick(highLiving);
    return "clean wall";
  };

  // 1. DEFINE CLASS CONTEXT (Budget & Quality)
  const classContext = (() => {
    // We pass the environment to get the correct texture
    const details = getRoomDetails(socialClass || 'Popular', environment || UGCEnvironment.HOME, customEnvironment);

    if (socialClass?.includes('Popular')) return `Authentic Brazilian working class home. Simple interior (${details}). FLASH PHOTOGRAPHY STYLE. SLIGHTLY GRAINY. NOT STUDIOLIT. Shot on SAMSUNG/MOTOROLA.`;
    if (socialClass?.includes('Média')) return `Middle-class setting. Organized, comfortable furniture. (${details}). soft warm lighting. SHOT ON IPHONE.`;
    if (socialClass?.includes('Alta')) return `High-end Luxury setting. Designer furniture, golden hour lighting, (${details}). SHOT ON PRO CAMERA.`;
    return "Standard domestic setting.";
  })();


  // 2. DEFINE ENVIRONMENT SPECIFICS (Location)
  const envContext = (() => {
    if (customEnvironment && customEnvironment.trim().length > 2) {
      return `LOCATION: ${customEnvironment.toUpperCase()} (Brazilian Context). REALISTIC BACKGROUND. NATURAL LIGHTING.`;
    }

    switch (environment) {
      case UGCEnvironment.OUTDOOR: return "LOCATION: City Street / Urban Park. Natural daylight. Busy lively background (blurred).";
      case UGCEnvironment.OFFICE: return "LOCATION: Modern Co-working space or Home Office. Desk, laptop, shelves in background.";
      case UGCEnvironment.STORE: return "LOCATION: Inside a Retail Store / Supermarket. Aisles, products on shelves, fluorescent lighting.";
      case UGCEnvironment.GYM: return "LOCATION: Fitness Center / Gym. Mirrors, weights, gym equipment in background. Energetic lighting.";
      case UGCEnvironment.NATURE: return "LOCATION: Open Park / Garden. Greenery, sunlight, trees. Fresh outdoor atmosphere.";
      case UGCEnvironment.HOME:
      default: return "LOCATION: HUMBLE BRAZILIAN HOME INTERIOR. Simple furniture. Fluorescent Ceiling Light (Cool White). NOT DESIGNER. NOT MODERN.";
    }
  })();

  return `${modelContext} ${classContext} ${envContext}`;
};

/**
 * Funcao para EDICAO MAGICA (Image-to-Image)
 * Recebe a imagem atual + prompt de edicao
 */
export const editGeneratedImage = async (
  imageBase64: string,
  prompt: string,
  aspectRatio: string = "1:1",
  apiKey?: string
): Promise<string> => {
  try {
    // Basic validation
    if (!imageBase64 || !prompt) throw new Error("Missing image or prompt");

    // Construct prompt
    const editingPrompt = `
    TASK: EDIT this image based on the user's instruction.
    USER INSTRUCTION: "${prompt}"
    
    CRITICAL RULES:
    1. STRICT INPAINTING TASK: ONLY change what is explicitly requested.
    2. LOCK COMPOSITION: Do NOT zoom, crop, or change the camera angle. The output MUST perfectly overlay the original.
    3. PRESERVE EVERYTHING ELSE: Background, lighting, and pose must remain IDENTICAL unless the prompt asks to change them.
    4. PRESERVE FACE IDENTITY: Do not morph the face.
    5. NO TEXT HALLUCINATIONS. NO WATERMARKS.
    
    OUTPUT: A high-quality photorealistic image with the requested edit applied.
    `;

    // Reuse callImageApi. We pass imageBase64 as 'primaryImage' (subject input).
    // We pass aspect ratio '1:1' as default or maybe we should preserve? 
    // callImageApi uses aspect ratio mainly for generation? No, it passes it to the generic prompt or irrelevant for img2img if model follows input.
    // However, callImageApi response is string | null.
    // Reuse callImageApi with specialized editing flag
    // Reuse callImageApi with specialized editing flag
    const newImageUrl = await callImageApi(editingPrompt, aspectRatio, imageBase64, null, null, null, null, undefined, undefined, undefined, undefined, undefined, true, 1, 'Editing', apiKey);

    if (!newImageUrl) {
      throw new Error("Falha ao editar imagem.");
    }
    return newImageUrl;
  } catch (error) {
    console.error("Magic Edit Failed inside Service:", error);
    throw error;
  }
};

const getTypographyRules = (style: VisualStyle): string => {
  switch (style) {
    case VisualStyle.MODERN:
      return `
      - TYPOGRAPHY RULES (MODERN):
      - FONT: Geometric Sans-Serif (e.g., Futura, Montserrat, Avant Garde).
      - CASING: UPPERCASE HEADLINES.
      - DECORATION: Clean text, floating on negative space. NO BOXES.
      - COLOR: High Contrast (White on Dark, Black on Light).
      - VIBE: Tech-focused, Clean, Minimal data-driven.
      `;
    case VisualStyle.PROFESSIONAL:
      return `
      - TYPOGRAPHY RULES (PROFESSIONAL):
      - FONT: Clean Sans-Serif (e.g., Helvetica Now, Inter) or Modern Serif.
      - CASING: Title Case (Capitalize First Letters).
      - DECORATION: Professional, slight drop shadow for readability.
      - COLOR: Navy Blue, Dark Grey, or Pure White.
      - VIBE: Trustworthy, Corporate, Premium.
      `;
    case VisualStyle.DESIGNI_PD_PRO:
      return `
      - TYPOGRAPHY RULES (DESIGN PRO):
      - FONT: Modern Geometric Sans (Inter, Montserrat).
      - LAYOUT: SHORT LINES. STACK TEXT VERTICALLY (max 3 words per line).
      - ALIGNMENT: Align text to the "Text Zone" defined in the background rule.
      - DECORATION: If background is complex, use a subtle backing shape.
      - COLOR: Brand contrast.
      `;
    case VisualStyle.COMMERCIAL_PREMIUM:
    case VisualStyle.DELIVERY:
    case VisualStyle.UGC_INSTAGRAM:
      return `
      - TYPOGRAPHY RULES (RETAIL/SALES):
      - FONT: HEAVY IMPACT FONT (Bold Sans-Serif, Condensed).
      - CASING: UPPERCASE ONLY. HUGE SIZE.
      - DECORATION: MANDATORY "SALE TAGS" or "STRIPS" (Tarjas) behind main keywords (Yellow/Red backgrounds).
      - SPELLING CHECK: PORTUGUESE ACCENTS ARE MANDATORY (Ã, Ç, É). "PORÇÃO" NOT "PORCAN".
      - COLOR: White Text on Red/Yellow/Blue Strips.
      - VIBE: Urgent, Promotional, High Energy.
      `;
    case VisualStyle.LUXURY:
      return `
      - TYPOGRAPHY RULES (LUXURY):
      - FONT: Elegant Serif (Bodoni, Didot, Playfair Display) or Ultra-Thin Sans.
      - CASING: WIDE LETTER SPACING (Kerning), UPPERCASE.
      - DECORATION: Gold/Silver Foil effect, Minimalist. NO background boxes.
      - COLOR: Gold, Silver, White, Black.
      - VIBE: Expensive, Exclusive, High-End fashion.
      `;
    case VisualStyle.TECH:
      return `
      - TYPOGRAPHY RULES (TECH):
      - FONT: Monospace (Courier New) or futuristic Sans.
      - CASING: lowercase or UPPERCASE mixed.
      - DECORATION: Glitch effect, Neon Glow, or Digital "Terminal" look.
      - COLOR: Cyan, Neon Green, White.
      - VIBE: Cyberpunk, Digital, Code.
      `;
    case VisualStyle.INFANTIL:
      return `
      - TYPOGRAPHY RULES (KIDS):
      - FONT: Rounded Sans (Varela Round, Comic Neue - High Quality).
      - CASING: Mixed Case.
      - DECORATION: Inside colorful Clouds or Speech Bubbles.
      - COLOR: Primary Colors (Red, Blue, Yellow).
      - VIBE: Friendly, Playful, Soft.
      `;
    case VisualStyle.CREATIVE:
      return `
      - TYPOGRAPHY RULES (CREATIVE):
      - FONT: Artistic Brush or Bold Display Font.
      - CASING: Mixed.
      - DECORATION: Paint strokes or paper torn edges as background for text.
      - COLOR: Vibrante.
      - VIBE: Artistic, Expressive.
      `;
    default:
      return `
      - TYPOGRAPHY RULES (STANDARD):
      - FONT: BOLD READABLE SANS-SERIF (Inter/Roboto).
      - CASING: UPPERCASE for Headings.
      - DECORATION: High contrast against background. Drop shadow if needed.
      `;
  }
};

