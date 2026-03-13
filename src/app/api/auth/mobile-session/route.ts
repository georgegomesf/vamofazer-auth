import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
        return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const mobileSession = await prisma.mobileAuthSession.findUnique({
        where: { sessionId },
    });

    if (!mobileSession) {
        // Ainda não foi criada – app continua polling
        return NextResponse.json({ pending: true });
    }

    if (mobileSession.expires < new Date()) {
        await prisma.mobileAuthSession.delete({ where: { sessionId } });
        return NextResponse.json({ error: "session_expired" }, { status: 410 });
    }

    if (mobileSession.error) {
        await prisma.mobileAuthSession.delete({ where: { sessionId } });
        return NextResponse.json({ error: mobileSession.error }, { status: 400 });
    }

    // Sessão encontrada: retorna e exclui para segurança (one-time use)
    await prisma.mobileAuthSession.delete({ where: { sessionId } });

    return NextResponse.json({
        token: mobileSession.token,
        user: JSON.parse(mobileSession.userData!),
    });
}
