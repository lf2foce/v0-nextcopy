// app/api/generate-video/route.ts
import { NextResponse } from "next/server";

// IMPORTANT: Ensure the FASTAPI_BASE_URL environment variable is set in your .env.local file.
// Example: FASTAPI_BASE_URL=http://127.0.0.1:8001

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000"; // Assuming FastAPI runs on port 8001

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postId, content, imageUrls, theme, campaignObjective, brandVoice, targetAudience } = body;

    // Validate required fields
    if (!postId || !content) {
      return NextResponse.json(
        { success: false, error: "Missing postId or content" },
        { status: 400 }
      );
    }

    // Prepare payload for FastAPI
    const fastApiPayload = {
      post_id: postId,
      content: content,
      image_urls: imageUrls || [], // Ensure imageUrls is an array, even if empty or undefined
      theme: theme || "",
      campaign_objective: campaignObjective || "",
      brand_voice: brandVoice || "",
      target_audience: targetAudience || "",
    };

    console.log("Forwarding to FastAPI:", `${FASTAPI_URL}/api/v1/videos/generate`);
    console.log("FastAPI Payload:", JSON.stringify(fastApiPayload, null, 2));

    const fastApiResponse = await fetch(`${FASTAPI_URL}/api/v1/videos/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fastApiPayload),
    });

    if (!fastApiResponse.ok) {
      const errorData = await fastApiResponse.text(); // Read as text first for better error diagnosis
      console.error(
        `FastAPI request failed with status ${fastApiResponse.status}:`,
        errorData
      );
      return NextResponse.json(
        {
          success: false,
          error: `FastAPI error: ${fastApiResponse.statusText} - ${errorData}`,
        },
        { status: fastApiResponse.status }
      );
    }

    const responseData = await fastApiResponse.json();
    console.log("Received from FastAPI:", responseData);

    // FastAPI /generate endpoint returns { success: boolean, post_id: number }
    // This post_id will be used as the taskId for polling status.
    if (responseData.post_id) {
        return NextResponse.json({
            success: true,
            taskId: responseData.post_id, // Pass post_id as taskId back to client for polling
            message: "Video generation started. Poll status using this taskId (post_id).",
          });
    } else if (responseData.video_url) {
        // This case might be for a scenario where FastAPI could return a direct video URL
        return NextResponse.json({
            success: true,
            videoUrl: responseData.video_url,
          });
    } else {
        // This case should ideally not be hit if FastAPI /generate always returns post_id
        return NextResponse.json(
            { success: false, error: responseData.error || "FastAPI did not return a post_id or video_url." },
            { status: 500 }
          );
    }

  } catch (error) {
    console.error("Error in /api/generate-video route:", error);
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Optional: GET handler for polling status if FastAPI uses a task-based approach
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ success: false, error: 'Task ID is required for polling' }, { status: 400 });
  }

  try {
    console.log(`Polling FastAPI for task ID: ${taskId}`);
    const fastApiResponse = await fetch(`${FASTAPI_URL}/api/v1/videos/status/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!fastApiResponse.ok) {
      const errorData = await fastApiResponse.text();
      console.error(
        `FastAPI polling failed for task ${taskId} with status ${fastApiResponse.status}:`,
        errorData
      );
      return NextResponse.json(
        {
          success: false,
          error: `FastAPI polling error: ${fastApiResponse.statusText} - ${errorData}`,
        },
        { status: fastApiResponse.status }
      );
    }

    const responseData = await fastApiResponse.json();
    console.log(`FastAPI polling response for task ${taskId}:`, responseData);

    // Assuming FastAPI status response is like: { status: 'PENDING'/'SUCCESS'/'FAILURE', video_url?: string, error?: string }
    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error(`Error polling FastAPI for task ${taskId}:`, error);
    let errorMessage = "Internal Server Error during polling";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}