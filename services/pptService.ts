import PptxGenJS from "pptxgenjs";

interface SlideData {
    imageUrl: string;
    type: 'COVER' | 'AGENDA' | 'SECTION' | 'CONTENT_RIGHT' | 'DATA' | 'THANK_YOU';
}

/**
 * Compresses and resizes an image to HD resolution (1280x720 max) to save memory.
 * @param imageUrl Source URL or Data URI
 * @param quality JPEG quality (0-1), default 0.6
 */
const compressImage = (imageUrl: string, quality: number = 0.95): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Handle potential CORS issues
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize to standard Full HD (1920x1080) - Better Quality for PPT
            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1080;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context not available"));
                return;
            }

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            // Return as Data URL
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
        img.src = imageUrl;
    });
};

/**
 * Generates and downloads a PowerPoint presentation based on the generated slide images.
 * @param slides Array of slide data containing image URLs and types
 * @param filename Output filename
 */
export const generatePPTX = async (slides: SlideData[], filename: string = "AgenciaIA_Presentation") => {
    const pptx = new PptxGenJS();

    // Basic layout settings
    pptx.layout = "LAYOUT_16x9"; // 16:9 standard

    // Iterate over each slide and add it to the presentation
    for (const slide of slides) {
        const s = pptx.addSlide();

        try {
            // OPTIMIZATION: Compress image before adding to PPT to prevent OOM
            const compressedBg = await compressImage(slide.imageUrl);

            // Add the AI-generated background to the slide
            s.background = { data: compressedBg }; // Use 'data' for Base64 URI
        } catch (e) {
            console.error("Compression failed, using original", e);
            // Fallback to original if compression fails
            s.background = { path: slide.imageUrl };
        }

        // Add PLACEHOLDER editable text based on slide type
        // This makes the template immediately useful
        switch (slide.type) {
            case 'COVER':
                s.addText("TÍTULO DA APRESENTAÇÃO", {
                    x: 0.5, y: 2.5, w: 9, h: 1,
                    fontSize: 44, color: "FFFFFF", bold: true, align: "left", fontFace: "Arial"
                });
                s.addText("Subtítulo ou Data", {
                    x: 0.5, y: 3.5, w: 9, h: 0.5,
                    fontSize: 24, color: "EEEEEE", align: "left", fontFace: "Arial"
                });
                break;

            case 'AGENDA':
                s.addText("Agenda do Dia", {
                    x: 1, y: 0.5, w: 8, h: 0.8,
                    fontSize: 32, color: "333333", bold: true, align: "left"
                });
                s.addText("1. Introdução\n2. Objetivos\n3. Análise de Mercado\n4. Próximos Passos", {
                    x: 1, y: 1.5, w: 8, h: 4,
                    fontSize: 18, color: "555555", align: "left", lineSpacing: 40
                });
                break;

            case 'SECTION':
                s.addText("01. SEÇÃO PRINCIPAL", {
                    x: 0, y: 2.5, w: "100%", h: 1,
                    fontSize: 48, color: "FFFFFF", bold: true, align: "center", fontFace: "Arial"
                });
                break;

            case 'CONTENT_RIGHT':
                s.addText("Título do Slide", {
                    x: 0.5, y: 0.5, w: 5, h: 0.8,
                    fontSize: 28, color: "333333", bold: true // Assuming light area for text
                });
                s.addText("Insira seu texto aqui. Este layout foi pensado para ter conteúdo à esquerda e imagem à direita.", {
                    x: 0.5, y: 1.5, w: 5, h: 4,
                    fontSize: 14, color: "555555"
                });
                break;

            case 'DATA':
                s.addText("Análise de Dados", {
                    x: 0.5, y: 0.5, w: 9, h: 0.5,
                    fontSize: 24, color: "333333", bold: true
                });
                // Placeholder rectangle for chart
                s.addShape(pptx.ShapeType.rect, { x: 1, y: 1.5, w: 8, h: 3.5, fill: { color: "EEEEEE" }, line: { color: "CCCCCC", width: 1, dashType: "dash" } });
                s.addText("Insira seu Gráfico Aqui", { x: 1, y: 1.5, w: 8, h: 3.5, fontSize: 14, color: "AAAAAA", align: "center" });
                break;

            case 'THANK_YOU':
                s.addText("Obrigado!", {
                    x: 0, y: 2.0, w: "100%", h: 1,
                    fontSize: 50, color: "FFFFFF", bold: true, align: "center", fontFace: "Arial"
                });
                s.addText("contato@empresa.com.br\n(11) 99999-9999", {
                    x: 0, y: 3.2, w: "100%", h: 1.5,
                    fontSize: 18, color: "EEEEEE", align: "center", lineSpacing: 30, fontFace: "Arial"
                });
                break;
        }
    }

    // Save the file
    return pptx.writeFile({ fileName: `${filename}.pptx` });
};
