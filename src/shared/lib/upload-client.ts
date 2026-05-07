type UploadClientResult = {
  key: string;
  url: string;
};

async function uploadViaLegacyRoute(file: File, route: string) {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch(route, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const result = await response.json();
  const firstResult = result.data?.results?.[0];
  const url = result.data?.urls?.[0] || firstResult?.url;
  if (result.code !== 0 || !url) {
    throw new Error(result.message || 'Upload failed');
  }

  return {
    key: firstResult?.key || '',
    url,
  } as UploadClientResult;
}

export async function uploadFileWithDirectStorage(
  file: File,
  options: {
    fallbackRoute?: string;
  } = {}
) {
  const fallbackRoute = options.fallbackRoute || '/api/storage/upload-image';

  try {
    const presignResponse = await fetch('/api/storage/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }),
    });

    if (!presignResponse.ok) {
      throw new Error(`Presign failed with status ${presignResponse.status}`);
    }

    const presignResult = await presignResponse.json();
    const presignData = presignResult.data;
    if (presignResult.code !== 0 || !presignData?.uploadUrl) {
      throw new Error(presignResult.message || 'Presign failed');
    }

    const uploadHeaders: Record<string, string> = {
      ...(presignData.uploadHeaders || {}),
      'Content-Type': file.type,
    };

    const uploadResponse = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: uploadHeaders,
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Direct upload failed with status ${uploadResponse.status}`);
    }

    const completeResponse = await fetch('/api/storage/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: presignData.key,
        verifyToken: presignData.verifyToken,
      }),
    });

    if (!completeResponse.ok) {
      throw new Error(`Upload verify failed with status ${completeResponse.status}`);
    }

    const completeResult = await completeResponse.json();
    if (completeResult.code !== 0 || !completeResult.data?.url) {
      throw new Error(completeResult.message || 'Upload verify failed');
    }

    return completeResult.data as UploadClientResult;
  } catch (error) {
    console.warn('[Upload] direct upload failed, falling back to legacy proxy', error);
    return uploadViaLegacyRoute(file, fallbackRoute);
  }
}
