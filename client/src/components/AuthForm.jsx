import { useState } from "react";

export default function AuthForm({ mode, onSubmit, error, notice, navigate }) {
    const signingUp = mode === "signup";
    const [userId, setUserId] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");

    async function submit(event) {
        event.preventDefault();
        await onSubmit({ user_id: userId, name, password });
    }

    return (
        <main className="container narrow">
            <section className="panel auth-panel">
                <p className="eyebrow">{signingUp ? "Join the conversation" : "Welcome back"}</p>
                <h1>{signingUp ? "Create your account" : "Sign in"}</h1>
                {error && <p className="message error" role="alert">{error}</p>}
                {notice && <p className="message success" role="status">{notice}</p>}
                <form onSubmit={submit} className="form-stack">
                    <label htmlFor="user_id">User ID</label>
                    <input id="user_id" name="user_id" value={userId} onChange={(event) => setUserId(event.target.value)} maxLength={255} autoComplete="username" required />
                    {signingUp && (
                        <>
                            <label htmlFor="name">Name</label>
                            <input id="name" name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={255} autoComplete="name" required />
                        </>
                    )}
                    <label htmlFor="password">Password</label>
                    <input id="password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={signingUp ? 8 : undefined} maxLength={72} autoComplete={signingUp ? "new-password" : "current-password"} required />
                    {signingUp && <p className="hint">Use at least 8 characters. Passwords are stored securely as hashes.</p>}
                    <button className="button primary" type="submit">{signingUp ? "Create account" : "Sign in"}</button>
                </form>
                <p className="form-footer">
                    {signingUp ? "Already have an account? " : "New here? "}
                    <a href={signingUp ? "/signin" : "/signup"} onClick={(event) => navigate(event, signingUp ? "/signin" : "/signup")}>
                        {signingUp ? "Sign in" : "Create an account"}
                    </a>.
                </p>
            </section>
        </main>
    );
}
