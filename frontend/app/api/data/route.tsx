import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest) {
  try {
    const dataFilePath = path.join(process.cwd(), "data", "data.json");
    const jsonData = fs.readFileSync(dataFilePath, "utf-8");
    return new NextResponse(jsonData, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error reading data file:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to load data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
