import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { del, put } from "@vercel/blob";
import { corsResponse, corsOptions } from "@/lib/cors";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return corsResponse(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), request);
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id as string },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
            }
        });

        if (!user) {
            return corsResponse(NextResponse.json({ error: "User not found" }, { status: 404 }), request);
        }

        return corsResponse(NextResponse.json(user), request);
    } catch (error) {
        console.error("Error fetching me:", error);
        return corsResponse(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }), request);
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return corsResponse(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), request);
        }

        const userId = session.user.id as string;
        const formData = await request.formData();
        const updateData: any = {};

        // Basic Info
        if (formData.has("name")) updateData.name = formData.get("name");
        if (formData.has("email")) updateData.email = formData.get("email");
        
        // Password
        const password = formData.get("password");
        if (password) {
            updateData.password = await bcrypt.hash(password as string, 10);
        }

        // Image
        const file = formData.get("image");
        if (file && typeof file !== "string") {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            
            // Delete old Old vercel blob if exists
            if (user?.image && user.image.includes("public.blob.vercel-storage.com")) {
                try {
                    await del(user.image);
                } catch (e) {
                    console.error("Error deleting old avatar:", e);
                }
            }

            // Upload new file
            const typedFile = file as File;
            const extension = typedFile.name.split('.').pop();
            const filename = `users/${userId}/avatar_${Date.now()}.${extension}`;
            const blob = await put(filename, typedFile, {
                access: 'public',
            });
            updateData.image = blob.url;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
            }
        });

        return corsResponse(NextResponse.json(updatedUser), request);
    } catch (error) {
        console.error("Error updating profile:", error);
        return corsResponse(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }), request);
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return corsResponse(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), request);
        }

        const userId = session.user.id as string;
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("projectId");
        const mode = searchParams.get("mode"); // 'partial' or 'total'

        let message = "";
        if (mode === 'partial' && projectId) {
            // Remove from project only
            await prisma.userProject.delete({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                }
            });
            message = "Removido do projeto com sucesso!";
        } else if (mode === 'total') {
            // Delete entire account
            await prisma.user.delete({
                where: { id: userId }
            });
            message = "Conta excluída completamente!";
        } else {
            return corsResponse(NextResponse.json({ error: "Invalid mode or missing parameters" }, { status: 400 }), request);
        }

        return corsResponse(NextResponse.json({ success: true, message }), request);
    } catch (error) {
        console.error("Error deleting account:", error);
        return corsResponse(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }), request);
    }
}

export async function OPTIONS(request: Request) {
    return corsOptions(request);
}
