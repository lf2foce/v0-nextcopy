import { type NextRequest, NextResponse } from "next/server";

// Define the POST handler function explicitly 
export async function POST(request: NextRequest) {
  console.log("POST method called at /api/copy/themes/generate");
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 });
    }

    console.log(`Generating themes for campaign ID: ${campaignId}`);

    // Call the external API
    const fastApiUrl = process.env.FASTAPI_URL;
    console.log(`Connecting to FastAPI backend at: ${fastApiUrl}`);
    
    try {
      // Use a longer timeout for Render services which can have cold starts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
      
      console.log(`Making request to: ${fastApiUrl}/themes/campaigns/${campaignId}/generate_themes`);
      const response = await fetch(`${fastApiUrl}/themes/campaigns/${campaignId}/generate_themes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Use our custom abort controller
        signal: controller.signal,
        // Add cache: 'no-store' to bypass cache issues
        cache: 'no-store',
      });
      
      // Clear the timeout as we got a response
      clearTimeout(timeoutId);

      console.log(`API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("External API error:", errorText);
        return NextResponse.json(
          {
            success: false,
            error: `External API error: ${response.status}`,
            details: errorText,
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log("Successfully received themes from API");
      
      return NextResponse.json({ 
        success: true, 
        data: data.themes || data.data || data 
      });
    } catch (fetchError) {
      console.error("Fetch error when connecting to FastAPI:", fetchError);
      
      // Special handling for timeout errors
      const isTimeout = 
        fetchError.name === 'AbortError' || 
        fetchError.code === 23 || 
        fetchError.message?.includes('timeout');
        
      if (isTimeout) {
        return NextResponse.json(
          {
            success: false,
            error: "The backend service is taking too long to respond. This might be due to a cold start. Please try again.",
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to the themes backend service",
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error in theme generation API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Server error processing theme generation request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Also add GET to return a helpful error message since we only support POST
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "This endpoint only supports POST requests with a campaignId",
    },
    { status: 405 }
  );
}
