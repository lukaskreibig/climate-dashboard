import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Get the internal backend URL from environment variables
    const backendUrl = process.env.BACKEND_INTERNAL_URL;
    if (!backendUrl) {
      console.error("BACKEND_INTERNAL_URL is not set");
      return NextResponse.json(
        { error: "BACKEND_INTERNAL_URL is not set" },
        { status: 500 }
      );
    }

    // Construct the full URL
    const targetUrl = `${backendUrl}/data`;
    console.log("Fetching data from:", targetUrl);

    // Forward the GET request to your backend's /data endpoint
    const response = await fetch(targetUrl, { method: "GET" });
    
    // Check if the response was successful
    if (!response.ok) {
      const text = await response.text();
      console.error("Backend responded with error:", response.status, text);
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${text}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in /api/data proxy:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
