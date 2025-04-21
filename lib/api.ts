interface GenerateImagesResponse {
  success: boolean;
  error?: string;
  status?: string;
}

export async function generateImagesForPostApi(
  postId: number,
  numImages: number,
  style: string,
  service?: string
): Promise<GenerateImagesResponse> {
  try {
    const response = await fetch(`/api/posts/${postId}/generate-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numImages,
        style,
        service,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      status: data.status,
    };
  } catch (error) {
    console.error('Error generating images:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate images',
    };
  }
} 