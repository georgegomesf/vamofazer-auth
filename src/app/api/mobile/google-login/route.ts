import { signIn } from "@/auth";

export async function GET(request: Request) {
    // Ao acessar essa rota por um WebBrowser no mobile (GET literal), 
    // a gente força a authjs a performar o login com google e definimos no redirectTo o callback custom
    // que criamos antes, onde ele devolve o schema mob:// nativo
    await signIn("google", {
        redirectTo: "/api/mobile/callback",
    });
}
