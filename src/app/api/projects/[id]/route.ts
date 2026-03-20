import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { del, put } from "@vercel/blob";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const res = NextResponse.json(project);
        res.headers.set("Access-Control-Allow-Origin", "*");
        return res;
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const formData = await request.formData();
        const updateData: any = {};

        // Simple text fields
        const fields = ["name", "description", "link", "email", "defaultEntryRole"];
        fields.forEach(f => {
            if (formData.has(f)) {
                updateData[f] = formData.get(f);
            }
        });

        // Handle Image uploads
        const imageFields = ["logoUrl", "logoHorizontalUrl", "coverUrl", "backgroundUrl"];
        for (const field of imageFields) {
            const file = formData.get(field);
            if (file && typeof file !== "string") {
                // If there's an old file, delete it from Vercel Blob
                const oldUrl = project[field as keyof typeof project] as string;
                if (oldUrl && oldUrl.includes("public.blob.vercel-storage.com")) {
                    try {
                        await del(oldUrl);
                    } catch (e) {
                        console.error(`Error deleting old blob ${oldUrl}:`, e);
                    }
                }

                // Upload new file
                // Use field name + unique id/timestamp for filename
                const typedFile = file as File;
                const extension = typedFile.name.split('.').pop();
                const filename = `projects/${id}/${field}_${Date.now()}.${extension}`;
                const blob = await put(filename, typedFile, {
                    access: 'public',
                });
                updateData[field] = blob.url;
            }
        }

        const updatedProject = await prisma.project.update({
            where: { id },
            data: updateData
        });

        const res = NextResponse.json(updatedProject);
        res.headers.set("Access-Control-Allow-Origin", "*");
        res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res;
    } catch (error) {
        console.error("Project update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function OPTIONS() {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res;
}
