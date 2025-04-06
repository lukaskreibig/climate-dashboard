// app/api/chat_stream/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Parse the incoming request body as JSON
    const body = await request.json();

    // Use the internal backend URL from environment variables
    const backendUrl = process.env.BACKEND_INTERNAL_URL;
    if (!backendUrl) {
      return NextResponse.json({ error: 'BACKEND_INTERNAL_URL not set' }, { status: 500 });
    }

    // Forward the request to your backend's /chat_stream endpoint
    const res = await fetch(`${backendUrl}/chat_stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // If the backend returns an error, forward it
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    // Get the response text (for a streaming endpoint you might adapt this for real streaming)
    const text = await res.text();

    // Return the response with the proper Content-Type
    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
