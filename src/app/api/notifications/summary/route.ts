import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    unread: 0,
    count: 0,
    items: [],
    notifications: []
  }, { status: 200 });
}
