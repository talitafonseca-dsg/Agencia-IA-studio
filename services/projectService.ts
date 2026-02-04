import { supabase } from './supabaseClient';

export interface ProjectLayer {
    id?: string;
    project_id?: string;
    type: 'text' | 'image';
    content: {
        text?: string;
        fontSize?: number;
        color?: string;
        fontFamily?: string;
        position: { x: number; y: number };
        // For image layers
        imageUrl?: string;
        width?: number;
        height?: number;
    };
    z_index: number;
}

export interface Project {
    id?: string;
    user_id?: string;
    name: string;
    thumbnail_url?: string;
    background_url: string;
    original_background_url?: string;
    aspect_ratio: string;
    config?: any;
    layers?: ProjectLayer[];
    created_at?: string;
    updated_at?: string;
}

const PROJECT_LIMIT = 50;

/**
 * Get current user's project count
 */
export const getUserProjectCount = async (): Promise<number> => {
    // Use getSession() instead of getUser() to avoid network hang
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return 0;

    const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

    if (error) {
        console.error('Error getting project count:', error);
        return 0;
    }

    return count || 0;
};

/**
 * Check if user can create more projects
 */
export const canCreateProject = async (): Promise<boolean> => {
    const count = await getUserProjectCount();
    return count < PROJECT_LIMIT;
};

/**
 * Get remaining project slots
 */
export const getRemainingSlots = async (): Promise<number> => {
    const count = await getUserProjectCount();
    return PROJECT_LIMIT - count;
};

/**
 * Save a new project to the gallery
 */
export const saveProject = async (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Project | null> => {
    // Use getSession() instead of getUser() to avoid network hang
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
    }
    const user = session.user;

    // Check limit
    const canCreate = await canCreateProject();
    if (!canCreate) {
        throw new Error('Limite de 50 projetos atingido. Exclua projetos antigos para continuar.');
    }

    // Upload background image to storage if it's a data URL
    let backgroundUrl = project.background_url;
    let originalBackgroundUrl = project.original_background_url;

    try {
        if (project.background_url.startsWith('data:')) {
            console.log('Iniciando upload do background principal...');
            backgroundUrl = await uploadImage(project.background_url, user.id, 'background');
            console.log('Upload background concluído:', backgroundUrl);
        }

        if (project.original_background_url?.startsWith('data:')) {
            console.log('Iniciando upload do background original...');
            originalBackgroundUrl = await uploadImage(project.original_background_url, user.id, 'original');
            console.log('Upload original concluído:', originalBackgroundUrl);
        }

        // Process Layers: Upload text layer images if they result from magic editing or uploads
        if (project.layers && project.layers.length > 0) {
            console.log('Processando camadas para upload de imagens...');
            const processedLayers: ProjectLayer[] = [];

            for (const layer of project.layers) {
                const newLayer = { ...layer };

                // Check if it's an image layer with base64
                if (newLayer.type === 'image' && newLayer.content.imageUrl?.startsWith('data:')) {
                    console.log(`Upload de imagem da camada visual...`);
                    const url = await uploadImage(newLayer.content.imageUrl, user.id, 'layer_img');
                    newLayer.content.imageUrl = url;
                }

                processedLayers.push(newLayer);
            }
            project.layers = processedLayers;
        }

    } catch (uploadError: any) {
        console.error('Upload failed right here:', uploadError);
        throw new Error(`Erro no upload de imagem: ${uploadError.message}`);
    }

    // Insert project
    console.log('Inserindo projeto no banco de dados...');
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
            user_id: user.id,
            name: project.name,
            thumbnail_url: backgroundUrl, // Use background as thumbnail
            background_url: backgroundUrl,
            original_background_url: originalBackgroundUrl,
            aspect_ratio: project.aspect_ratio,
            config: project.config
        })
        .select()
        .single();

    if (projectError) {
        console.error('Database Insert Error:', projectError);
        throw new Error(`Erro ao salvar no banco: ${projectError.message}`);
    }

    // Insert layers if any
    if (project.layers && project.layers.length > 0) {
        const layersToInsert = project.layers.map((layer, index) => ({
            project_id: projectData.id,
            type: layer.type,
            content: layer.content,
            z_index: layer.z_index ?? index
        }));

        const { error: layersError } = await supabase
            .from('project_layers')
            .insert(layersToInsert);

        if (layersError) {
            console.error('Error saving layers:', layersError);
            // Don't throw - project was saved, just layers failed
        }
    }

    return projectData;
};

/**
 * Load all projects for current user
 */
export const loadProjects = async (): Promise<Project[]> => {
    // Use getSession() instead of getUser() to avoid network hang
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];
    const user = session.user;

    console.log('Fetching projects for user:', user.id);

    // First fetch projects only
    type ProjectRow = {
        id: string;
        user_id: string;
        name: string;
        thumbnail_url: string | null;
        background_url: string;
        original_background_url: string | null;
        aspect_ratio: string;
        config: any;
        created_at: string;
        updated_at: string;
    };

    const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (projectsError) {
        console.error('Error loading projects table:', projectsError);
        throw new Error('Erro ao carregar lista de projetos: ' + projectsError.message);
    }

    if (!projectsData || projectsData.length === 0) {
        return [];
    }

    // Then fetch layers separately for these projects
    const projectIds = projectsData.map(p => p.id);
    const { data: layersData, error: layersError } = await supabase
        .from('project_layers')
        .select('*')
        .in('project_id', projectIds);

    if (layersError) {
        console.error('Error loading layers:', layersError);
        // Don't fail completely if layers fail, just return projects without layers
        return projectsData as Project[];
    }

    // Combine data
    const projectsWithLayers = projectsData.map(p => ({
        ...p,
        layers: layersData ? layersData.filter((l: any) => l.project_id === p.id) : []
    }));

    return projectsWithLayers as Project[];
};

/**
 * Load a single project by ID
 */
export const loadProject = async (projectId: string): Promise<Project | null> => {
    const { data, error } = await supabase
        .from('projects')
        .select(`
      *,
      project_layers (*)
    `)
        .eq('id', projectId)
        .single();

    if (error) {
        console.error('Error loading project:', error);
        return null;
    }

    return {
        ...data,
        layers: data.project_layers
    };
};

/**
 * Update an existing project
 */
export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<boolean> => {

    // Upload images in updates if needed
    if (updates.layers) {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (user) {
            const processedLayers: ProjectLayer[] = [];
            for (const layer of updates.layers) {
                const newLayer = { ...layer };
                if (newLayer.type === 'image' && newLayer.content.imageUrl?.startsWith('data:')) {
                    try {
                        const url = await uploadImage(newLayer.content.imageUrl, user.id, 'layer_img');
                        newLayer.content.imageUrl = url;
                    } catch (e) {
                        console.error("Failed to upload layer image during update", e);
                        // Continue, but it might fail to save if too big
                    }
                }
                processedLayers.push(newLayer);
            }
            updates.layers = processedLayers;
        }
    }

    const { error } = await supabase
        .from('projects')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

    if (error) {
        console.error('Error updating project:', error);
        return false;
    }

    // Update layers if provided
    if (updates.layers) {
        // Delete existing layers
        await supabase
            .from('project_layers')
            .delete()
            .eq('project_id', projectId);

        // Insert new layers
        const layersToInsert = updates.layers.map((layer, index) => ({
            project_id: projectId,
            type: layer.type,
            content: layer.content,
            z_index: layer.z_index ?? index
        }));

        await supabase
            .from('project_layers')
            .insert(layersToInsert);
    }

    return true;
};

/**
 * Delete a project
 */
export const deleteProject = async (projectId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (error) {
        console.error('Error deleting project:', error);
        return false;
    }

    return true;
};

/**
 * Upload image to Supabase Storage
 */
/**
 * Compress image using Canvas
 */
const compressImage = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000; // Safe limit for DB storage (approx < 400KB)
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Convert to JPEG with 0.7 quality (Aggressive compression for fallback safety)
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
                resolve(base64); // Fallback
            }
        };
        img.onerror = () => resolve(base64); // Fallback
    });
};

/**
 * Upload image to Supabase Storage with DB Fallback
 */
const uploadImage = async (dataUrl: string, userId: string, prefix: string): Promise<string> => {
    // 1. Always compress first to ensure we have a manageable payload
    // This is crucial if we fallback to DB storage.
    let finalBase64 = dataUrl;
    try {
        finalBase64 = await compressImage(dataUrl);
    } catch (e) {
        console.warn("Compression failed, using original", e);
    }

    try {
        const base64Content = finalBase64.split(',')[1];
        const mimeMatch = finalBase64.match(/data:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const extension = 'jpg';

        // Generate a random ID
        const randomId = Math.random().toString(36).substring(2, 10);
        const fileName = `${userId}/${prefix}_${Date.now()}_${randomId}.${extension}`;

        const buffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));

        console.log(`Tentando upload para Storage (${fileName})...`);

        // 2. Upload with a short timeout (15s). If it hangs, we proceed to fallback.
        const uploadPromise = supabase.storage
            .from('project-images')
            .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: false
            });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Storage Upload Timeout')), 15000)
        );

        // @ts-ignore
        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

        if (error) throw error;
        if (!data) throw new Error('No data returned from upload');

        // 3. Success! Get Public URL
        const { data: urlData } = supabase.storage
            .from('project-images')
            .getPublicUrl(fileName);

        console.log('Upload para Storage com sucesso!');
        return urlData.publicUrl;

    } catch (e: any) {
        console.error('Falha no Supabase Storage. Usando modo FALLBACK (Salvando no Banco de Dados).', e.message);

        // 4. FALLBACK STRATEGY
        // If storage fails (bucket missing, permissions, timeout), return the Compressed Base64.
        // The Service will save this string into the DB 'background_url' / 'imageUrl' field.
        // Since we compressed it to ~1000px JPG, it should fit in the TEXT column without breaking the 6MB payload limit.
        return finalBase64;
    }
};
