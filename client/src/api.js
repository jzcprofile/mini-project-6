export async function api(path, options = {}) {
    const response = await fetch(`/api${path}`, {
        credentials: "same-origin",
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        },
        ...options
    });

    let data;
    try {
        data = await response.json();
    } catch (error) {
        if (response.ok) throw new Error("The server returned an invalid response.");
        data = {};
    }
    if (!response.ok) {
        throw new Error(data.error || "The request could not be completed.");
    }
    return data;
}
