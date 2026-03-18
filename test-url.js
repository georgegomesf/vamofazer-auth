const url = "https://auth.redefilosofica.com.br/api/auth/callback/email?callbackUrl=https%3A%2F%2Fauth.redefilosofica.com.br%2Fauth%2Fsignin%3FcallbackUrl%3Dhttps%253A%252F%252Fm.levinasbrasil.com.br%252F%253FprojectId%253Dtwncajdp50007xvlfk3oig9ru&token=xyx";
const verificationUrl = new URL(url);
let callbackUrl = verificationUrl.searchParams.get("callbackUrl");
console.log("INITIAL CALLBACK URL:", callbackUrl);

let parsedUrl = callbackUrl;

if (parsedUrl.includes("callbackUrl=")) {
    const dummyBase = "http://localhost";
    const tempUrl = new URL(parsedUrl.startsWith("/") ? dummyBase + parsedUrl : parsedUrl);
    const nestedCallback = tempUrl.searchParams.get("callbackUrl");
    if (nestedCallback) {
        parsedUrl = nestedCallback;
    }
}
console.log("PARSED URL STAGE 1:", parsedUrl);

if (parsedUrl.startsWith("http")) {
    const cbUrl = new URL(parsedUrl);
    const hostToUse = cbUrl.host;
    const projectId = cbUrl.searchParams.get("projectId");
    console.log("HOST TO USE:", hostToUse);
    console.log("PROJECT ID:", projectId);
}
