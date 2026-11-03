const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app, pool } = require("../app");

let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
});

test("serves the React application for the homepage and client routes", async () => {
    for (const route of ["/", "/signin", "/signup", "/edit/12"]) {
        const response = await fetch(`${baseUrl}${route}`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /text\/html/);
        assert.match(await response.text(), /Commonplace/);
    }
});

test("renders EJS signup and sign-in pages without replacing React routes", async () => {
    for (const [route, heading] of [
        ["/classic/signup", /Create your account/],
        ["/classic/signin", /Sign in/]
    ]) {
        const response = await fetch(`${baseUrl}${route}`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /text\/html/);
        assert.match(await response.text(), heading);
    }

    const reactResponse = await fetch(`${baseUrl}/signup`);
    assert.match(await reactResponse.text(), /id="root"/);
});

test("EJS post creation requires a signed-in user", async () => {
    const response = await fetch(`${baseUrl}/classic/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "title=Test&content=Test",
        redirect: "manual"
    });
    assert.equal(response.status, 302);
    assert.match(response.headers.get("location"), /^\/classic\/signin\?error=/);
});

test("auth endpoint reports a logged-out session as JSON", async () => {
    const response = await fetch(`${baseUrl}/api/auth`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { user: null });
});

test("signup validates input and returns a JSON error", async () => {
    const response = await fetch(`${baseUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "short", name: "Test", password: "tiny" })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /password/);
});

test("malformed API JSON returns a client error", async () => {
    const response = await fetch(`${baseUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{"
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /valid JSON/i);
});

test("post mutations require an authenticated session", async () => {
    const response = await fetch(`${baseUrl}/api/blogs/12`, { method: "DELETE" });
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /sign in/i);
});
