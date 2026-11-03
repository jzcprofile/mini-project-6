import { useState } from "react";

export default function BlogPostForm({ onCreate }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    async function submit(event) {
        event.preventDefault();
        const created = await onCreate({ title, content });
        if (created) {
            setTitle("");
            setContent("");
        }
    }

    return (
        <section className="panel compose-panel">
            <div>
                <p className="eyebrow">Your next story</p>
                <h2>Write a new post</h2>
            </div>
            <form onSubmit={submit} className="form-stack">
                <label htmlFor="title">Title</label>
                <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} placeholder="Give your story a title" required />
                <label htmlFor="content">Your post</label>
                <textarea id="content" value={content} onChange={(event) => setContent(event.target.value)} rows={5} maxLength={50000} placeholder="What would you like to share?" required />
                <button className="button primary" type="submit">Publish post</button>
            </form>
        </section>
    );
}
