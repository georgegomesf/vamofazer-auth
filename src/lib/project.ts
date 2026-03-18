import prisma from "./prisma";

export async function getDefaultProject() {
    const defaultProjectId = process.env.NEXT_PUBLIC_PROJECT_ID;

    if (defaultProjectId) {
        const project = await prisma.project.findUnique({
            where: { id: defaultProjectId }
        });
        if (project) return project;
    }

    return await prisma.project.findFirst();
}

export async function getProjectByName(name: string) {
    return await prisma.project.findFirst({
        where: { name }
    });
}
