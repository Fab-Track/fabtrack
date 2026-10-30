import { base44 } from "@/api/base44Client";

/**
 * Creates a time-limited signed download URL for a private file URI.
 * @param {string} file_uri - The private file URI (from UploadPrivateFile)
 * @param {number} [expires_in=300] - Seconds until the URL expires
 * @returns {Promise<{ signed_url: string }>}
 */
export async function createFileSignedUrl(file_uri, expires_in = 300) {
  return base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in });
}