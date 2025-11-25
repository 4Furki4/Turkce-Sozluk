import { env } from "@/src/env.mjs";

async function testApiEndpoint() {
    const word = "merhaba";
    const apiKey = env.INTERNAL_API_KEY || "test-api-key"; // Fallback for testing if env not loaded in script context
    const baseUrl = "http://localhost:3000";

    console.log(`Testing API endpoint for word: ${word}`);
    console.log(`Using API Key: ${apiKey}`);

    // 1. Test with valid API Key
    try {
        const response = await fetch(`${baseUrl}/api/v1/word/${word}`, {
            headers: {
                "x-api-key": apiKey,
            },
        });

        console.log(`\n[Valid Key] Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log("[Valid Key] Data:", JSON.stringify(data, null, 2));
        } else {
            console.error("[Valid Key] Error:", await response.text());
        }
    } catch (error) {
        console.error("[Valid Key] Request failed:", error);
    }

    // 2. Test with invalid API Key
    try {
        const response = await fetch(`${baseUrl}/api/v1/word/${word}`, {
            headers: {
                "x-api-key": "invalid-key",
            },
        });

        console.log(`\n[Invalid Key] Status: ${response.status}`);
        if (response.status === 401) {
            console.log("[Invalid Key] Correctly rejected unauthorized request.");
        } else {
            console.error("[Invalid Key] Unexpected status:", response.status);
        }
    } catch (error) {
        console.error("[Invalid Key] Request failed:", error);
    }

    // 3. Test CORS Preflight
    try {
        const response = await fetch(`${baseUrl}/api/v1/word/${word}`, {
            method: "OPTIONS",
        });

        console.log(`\n[CORS Preflight] Status: ${response.status}`);
        console.log("[CORS Preflight] Allow Origin:", response.headers.get("access-control-allow-origin"));
        console.log("[CORS Preflight] Allow Methods:", response.headers.get("access-control-allow-methods"));
        console.log("[CORS Preflight] Allow Headers:", response.headers.get("access-control-allow-headers"));
    } catch (error) {
        console.error("[CORS Preflight] Request failed:", error);
    }
}

testApiEndpoint();
