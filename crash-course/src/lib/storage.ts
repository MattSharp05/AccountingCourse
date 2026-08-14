import { supabase } from './supabase';

const BUCKET = 'course-content';

// Must match the "Upload file size limit" in the Supabase Dashboard
// (Project Settings → Storage). New projects default to 50MB even on Pro —
// the plan raises the ceiling but does not change the setting, so it has to
// be set explicitly per project. This constant only exists so oversized files
// fail instantly with a clear message instead of uploading for minutes and
// then being rejected; if the two disagree, the server still wins and
// uploadFile() translates its 413 into the same readable error.
export const MAX_UPLOAD_MB = 1000;

function formatMB(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

/** Upload a file to Supabase Storage and return its public URL */
export async function uploadFile(
  userId: string,
  file: File,
  folder?: string,
): Promise<string> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(
      `"${file.name}" is ${formatMB(file.size)}, but the maximum upload size is ${MAX_UPLOAD_MB}MB. ` +
      `Try compressing the file, or ask your administrator to raise the storage upload limit.`,
    );
  }

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
    // Supabase returns a generic 413 for files over the project/bucket size
    // limit — translate it so the professor knows what actually happened.
    if (/exceeded the maximum allowed size|payload too large|413/i.test(error.message)) {
      throw new Error(
        `"${file.name}" (${formatMB(file.size)}) is larger than the storage upload limit. ` +
        `Try compressing the file, or ask your administrator to raise the limit.`,
      );
    }
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
