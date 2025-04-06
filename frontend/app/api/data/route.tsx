// app/api/data/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Get the internal backend URL from environment variables
    const backendUrl = process.env.BACKEND_INTERNAL_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: "BACKEND_INTERNAL_URL is not set" },
        { status: 500 }
      );
    }

    // Forward the GET request to your backend's /data endpoint
    const response = await fetch(`${backendUrl}/data`, { method: "GET" });
    const data = await response.json();

    // Return the JSON response to the client
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in /api/data proxy:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
