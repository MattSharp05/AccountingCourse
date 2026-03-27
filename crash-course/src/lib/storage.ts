import { supabase } from './supabase';

const BUCKET = 'course-content';

/** Upload a file to Supabase Storage and return its public URL */
export async function uploadFile(
  userId: string,
  file: File,
  folder?: string,
): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = folder
    ? `${userId}/${folder}/${timestamp}-${safeName}`
    : `${userId}/${timestamp}-${safeName}`;

  console.log('[storage] Uploading to bucket:', BUCKET, 'path:', path, 'size:', file.size);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });

  if (error) {
    console.error('[storage] Upload failed:', error);
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  console.log('[storage] Upload successful, public URL:', data.publicUrl);
  return data.publicUrl;
}

/** Delete a file from Supabase Storage by its public URL */
export async function deleteFile(fileUrl: string): Promise<void> {
  const url = new URL(fileUrl);
  const pathPrefix = `/storage/v1/object/public/${BUCKET}/`;
  const filePath = url.pathname.replace(pathPrefix, '');

  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) throw error;
}
