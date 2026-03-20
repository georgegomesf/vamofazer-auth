import { NextResponse } from "next/server";

export function corsResponse(res: NextResponse, request: Request) {
    const origin = request.headers.get("origin") || "*";
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, *");
    res.headers.set("Access-Control-Allow-Credentials", "true");
    return res;
}

export function corsOptions(request: Request) {
    const res = new NextResponse(null, { status: 204 });
    return corsResponse(res, request);
}
