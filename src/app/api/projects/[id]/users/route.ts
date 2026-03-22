import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { corsResponse, corsOptions } from "@/lib/cors";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        
        // Find all users associated with this project
        const userProjects = await prisma.userProject.findMany({
            where: { projectId: id },
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    }
                }
            }
        });

        const users = userProjects.map(up => ({
            id: up.user.id,
            name: up.user.name,
            email: up.user.email,
            projectRole: up.role,
            userRole: up.user.role,
        }));

        return corsResponse(NextResponse.json(users), request);
    } catch (error) {
        console.error("Error fetching project users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const { name, email, password, role } = body;

        if (!email || !role) {
            return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
        }

        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            if (!password) {
                return NextResponse.json({ error: "Password is required for new users" }, { status: 400 });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: "USER", // Global role defaults to USER
                    emailVerified: new Date(), // Admin created, assume verified for now
                }
            });
        }

        // Link with project or update role
        const userProject = await prisma.userProject.upsert({
            where: {
                userId_projectId: {
                    userId: user.id,
                    projectId: id,
                }
            },
            create: {
                userId: user.id,
                projectId: id,
                role: role,
            },
            update: {
                role: role,
            }
        });

        return corsResponse(NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            projectRole: userProject.role,
        }), request);
    } catch (error) {
        console.error("Error creating/linking project user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function OPTIONS(request: Request) {
    return corsOptions(request);
}
