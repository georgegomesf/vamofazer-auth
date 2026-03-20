import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { corsResponse, corsOptions } from "@/lib/cors";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    try {
        const { id: projectId, userId } = (await params);
        const body = await request.json();
        const { name, email, password, role } = body;

        const updateUserData: any = {};
        if (name !== undefined) updateUserData.name = name;
        if (email !== undefined) updateUserData.email = email;
        if (password) {
            updateUserData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateUserData,
        });

        const userProject = await prisma.userProject.update({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                }
            },
            data: {
                role,
            }
        });

        return corsResponse(NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            projectRole: userProject.role,
        }), request);
    } catch (error) {
        console.error("Error updating project user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    try {
        const { id: projectId, userId } = (await params);
        
        await prisma.userProject.delete({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                }
            }
        });

        return corsResponse(NextResponse.json({ success: true }), request);
    } catch (error) {
        console.error("Error deleting project user association:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function OPTIONS(request: Request) {
    return corsOptions(request);
}
