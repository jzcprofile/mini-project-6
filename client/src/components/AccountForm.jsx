import { useState } from "react";

export default function AccountForm({ user, onSave, error, notice }) {
    const [userId, setUserId] = useState(user.userId);
    const [name, setName] = useState(user.name);
    const [password, setPassword] = useState("");

    return (
        <main className="container narrow">
            <section className="panel auth-panel">
                <p className="eyebrow">Your profile</p>
                <h1>Account settings</h1>
                {error && <p className="message error" role="alert">{error}</p>}
                {notice && <p className="message success" role="status">{notice}</p>}
                <form onSubmit={(event) => { event.preventDefault(); onSave({ user_id: userId, name, password }); }} className="form-stack">
                    <label htmlFor="user_id">User ID</label>
                    <input id="user_id" value={userId} onChange={(event) => setUserId(event.target.value)} maxLength={255} autoComplete="username" required />
                    <label htmlFor="name">Name</label>
                    <input id="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={255} autoComplete="name" required />
                    <label htmlFor="password">New password <span className="hint">(leave blank to keep current)</span></label>
                    <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={password ? 8 : undefined} maxLength={72} autoComplete="new-password" />
                    <button className="button primary" type="submit">Save changes</button>
                </form>
            </section>
        </main>
    );
}
