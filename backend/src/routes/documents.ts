import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { supabase } from '../config/supabase';
import { authenticate } from './auth';

export const documentsRouter = Router();

// Helper to get or create uploads/audios directory
const getAudiosDir = () => {
  const dir = path.join(process.cwd(), 'uploads', 'audios');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// 1. List documents for the student
documentsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { subject_id, doc_type } = req.query;

  let query = supabase
    .from('module_documents')
    .select('*, subject:subjects(*)')
    .or(`is_shared.eq.true,user_id.is.null,user_id.eq.${userId},user_id.eq.bb422935-714e-4ff2-8b7a-0e7f8ccc7c1b`)
    .order('created_at', { ascending: false });

  if (subject_id) {
    query = query.eq('subject_id', String(subject_id));
  }
  if (doc_type) {
    query = query.eq('doc_type', String(doc_type));
  }

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });

  res.json({ documents: data || [] });
});

// 2. Create document record
documentsRouter.post('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { subject_id, title, doc_type, file_url, file_name, file_size, total_pages } = req.body;

  if (!subject_id || !title || !doc_type || !file_url) {
    return res.status(400).json({ error: 'Matière, titre, type et fichier sont obligatoires.' });
  }

  const { data, error } = await supabase
    .from('module_documents')
    .insert({
      user_id: userId,
      subject_id,
      title,
      doc_type,
      file_url,
      file_name: file_name || title,
      file_size: Number(file_size) || 0,
      total_pages: Number(total_pages) || 10,
      is_shared: true,
    })
    .select('*, subject:subjects(*)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ document: data });
});

// --- AUDIO STORAGE & MIGRATION ENDPOINTS (Registered BEFORE /:id) ---

// A. Upload audio directly to local PC storage
documentsRouter.post('/audio/upload-local', authenticate, async (req: Request, res: Response) => {
  try {
    const { audio_base64, document_id, page_number, filename } = req.body;
    if (!audio_base64) {
      return res.status(400).json({ error: 'Données audio manquantes.' });
    }

    const audiosDir = getAudiosDir();
    const cleanBase64 = audio_base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const sanitizedFilename = filename ? path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_') : null;
    const safeName = sanitizedFilename || `doc_${document_id || 'general'}_p${page_number || '0'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.webm`;
    const filePath = path.join(audiosDir, safeName);

    fs.writeFileSync(filePath, buffer);

    const localUrl = `/uploads/audios/${safeName}`;
    res.json({
      url: localUrl,
      fileName: safeName,
      size: buffer.length,
      storage: 'local',
    });
  } catch (err: any) {
    console.error('Error uploading local audio:', err);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde locale du fichier audio.' });
  }
});

// B. Migrate all Supabase audios to local PC folder and empty Supabase storage
documentsRouter.post('/audio/migrate-to-local', authenticate, async (req: Request, res: Response) => {
  try {
    const audiosDir = getAudiosDir();

    // 1. Fetch all document page notes
    const { data: notes, error: notesErr } = await supabase
      .from('document_page_notes')
      .select('*');

    if (notesErr) {
      return res.status(400).json({ error: notesErr.message });
    }

    let migratedCount = 0;
    let migratedBytes = 0;

    for (const note of notes || []) {
      let hasChanges = false;
      let recordings = Array.isArray(note.audio_recordings) ? [...note.audio_recordings] : [];

      // Check each audio item in audio_recordings
      for (let i = 0; i < recordings.length; i++) {
        const item = recordings[i];
        if (item.url && (item.url.includes('supabase.co') || item.url.startsWith('http://') || item.url.startsWith('https://'))) {
          try {
            const resp = await fetch(item.url);
            if (resp.ok) {
              const arrayBuf = await resp.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              const safeName = `migrated_doc_${note.document_id}_p${note.page_number}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.webm`;
              const localPath = path.join(audiosDir, safeName);
              fs.writeFileSync(localPath, buf);

              item.url = `/uploads/audios/${safeName}`;
              hasChanges = true;
              migratedCount++;
              migratedBytes += buf.length;
            }
          } catch (dlErr) {
            console.warn(`Could not download audio from ${item.url}:`, dlErr);
          }
        }
      }

      // Check primary audio_url
      let primaryUrl = note.audio_url;
      if (primaryUrl && (primaryUrl.includes('supabase.co') || primaryUrl.startsWith('http://') || primaryUrl.startsWith('https://'))) {
        if (recordings.length > 0) {
          primaryUrl = recordings[0].url;
          hasChanges = true;
        } else {
          try {
            const resp = await fetch(primaryUrl);
            if (resp.ok) {
              const arrayBuf = await resp.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              const safeName = `migrated_doc_${note.document_id}_p${note.page_number}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.webm`;
              const localPath = path.join(audiosDir, safeName);
              fs.writeFileSync(localPath, buf);

              primaryUrl = `/uploads/audios/${safeName}`;
              recordings = [{
                id: `rec-${Date.now()}`,
                url: primaryUrl,
                duration: note.audio_duration_seconds || 0,
                title: 'Note vocale 1',
                created_at: note.created_at || new Date().toISOString(),
              }];
              hasChanges = true;
              migratedCount++;
              migratedBytes += buf.length;
            }
          } catch (dlErr) {
            console.warn(`Could not download primary audio from ${primaryUrl}:`, dlErr);
          }
        }
      }

      if (hasChanges) {
        await supabase
          .from('document_page_notes')
          .update({
            audio_url: primaryUrl,
            audio_recordings: recordings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', note.id);
      }
    }

    // 2. Empty Supabase Storage bucket 'audio_notes' to free up cloud space
    try {
      const { data: subFiles } = await supabase.storage.from('audio_notes').list('audios');
      if (subFiles && subFiles.length > 0) {
        const toDelete = subFiles.map((f) => `audios/${f.name}`);
        await supabase.storage.from('audio_notes').remove(toDelete);
      }
      const { data: rootFiles } = await supabase.storage.from('audio_notes').list('');
      if (rootFiles && rootFiles.length > 0) {
        const rootToDelete = rootFiles.filter((f) => f.name && !f.id).map((f) => f.name);
        if (rootToDelete.length > 0) {
          await supabase.storage.from('audio_notes').remove(rootToDelete);
        }
      }
    } catch (cleanErr) {
      console.warn('Could not empty Supabase storage:', cleanErr);
    }

    res.json({
      success: true,
      migratedCount,
      migratedBytes,
      message: `${migratedCount} enregistrement(s) audio transféré(s) sur votre PC local avec succès. L'espace Supabase a été libéré !`,
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err.message || 'Erreur lors de la migration des audios vers le stockage local.' });
  }
});

// C. Get audio storage statistics (Local PC vs Supabase Cloud)
documentsRouter.get('/audio/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const audiosDir = getAudiosDir();
    let localCount = 0;
    let localBytes = 0;

    if (fs.existsSync(audiosDir)) {
      const files = fs.readdirSync(audiosDir);
      localCount = files.length;
      for (const file of files) {
        try {
          const stat = fs.statSync(path.join(audiosDir, file));
          localBytes += stat.size;
        } catch {}
      }
    }

    // Supabase bucket stats
    let supabaseCount = 0;
    let supabaseBytes = 0;
    try {
      const { data: supabaseFiles } = await supabase.storage.from('audio_notes').list('audios');
      if (supabaseFiles) {
        supabaseCount = supabaseFiles.length;
        supabaseBytes = supabaseFiles.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
      }
    } catch {}

    res.json({
      local: {
        count: localCount,
        bytes: localBytes,
        folder: audiosDir,
      },
      supabase: {
        count: supabaseCount,
        bytes: supabaseBytes,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get single document with its page notes
documentsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const docId = req.params.id;

  const { data: document, error: docError } = await supabase
    .from('module_documents')
    .select('*, subject:subjects(*)')
    .eq('id', docId)
    .single();

  if (docError || !document) return res.status(404).json({ error: 'Document non trouvé.' });

  const { data: notes, error: notesError } = await supabase
    .from('document_page_notes')
    .select('*')
    .eq('document_id', docId)
    .order('page_number', { ascending: true });

  if (notesError) return res.status(400).json({ error: notesError.message });

  res.json({ document, notes: notes || [] });
});

// 4. Delete document
documentsRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const docId = req.params.id;

  const { error } = await supabase
    .from('module_documents')
    .delete()
    .eq('id', docId)
    .or(`user_id.eq.${userId},user_id.eq.bb422935-714e-4ff2-8b7a-0e7f8ccc7c1b`);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, deletedId: docId });
});

// 5. Get all page notes for a document
documentsRouter.get('/:id/notes', authenticate, async (req: Request, res: Response) => {
  const docId = req.params.id;

  const { data, error } = await supabase
    .from('document_page_notes')
    .select('*')
    .eq('document_id', docId)
    .order('page_number', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ notes: data || [] });
});

// 6. Upsert page note (text and/or audio)
documentsRouter.post('/:id/notes', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const docId = req.params.id;
  const { page_number, text_content, audio_url, audio_duration_seconds, audio_recordings } = req.body;

  if (page_number === undefined || page_number === null) {
    return res.status(400).json({ error: 'Le numéro de page est obligatoire.' });
  }

  // Ensure audio_recordings is an array
  let recordings = Array.isArray(audio_recordings) ? audio_recordings : [];
  if (recordings.length === 0 && audio_url) {
    recordings = [{
      id: `rec-${Date.now()}`,
      url: audio_url,
      duration: Number(audio_duration_seconds) || 0,
      title: 'Note vocale 1',
      created_at: new Date().toISOString(),
    }];
  }

  const primaryAudioUrl = recordings.length > 0 ? recordings[0].url : (audio_url || null);
  const primaryDuration = recordings.length > 0 ? (recordings[0].duration || 0) : (Number(audio_duration_seconds) || 0);

  const { data, error } = await supabase
    .from('document_page_notes')
    .upsert(
      {
        user_id: userId,
        document_id: docId,
        page_number: Number(page_number),
        text_content: text_content !== undefined ? text_content : null,
        audio_url: primaryAudioUrl,
        audio_duration_seconds: primaryDuration,
        audio_recordings: recordings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'document_id,page_number' }
    )
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ note: data });
});

// 7. Delete note for a page
documentsRouter.delete('/:id/notes/:page', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const docId = req.params.id;
  const pageNumber = Number(req.params.page);

  const { error } = await supabase
    .from('document_page_notes')
    .delete()
    .eq('document_id', docId)
    .eq('page_number', pageNumber)
    .eq('user_id', userId);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});
