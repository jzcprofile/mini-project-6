import { useEffect, useState } from "react";

export default function EditPostForm({ post, onSave, onCancel }) {
    const [title, setTitle] = useState(post?.title || "");
    const [content, setContent] = useState(post?.content || "");

    useEffect(() => {
        setTitle(post?.title || "");
        setContent(post?.content || "");
    }, [post]);

    if (!post) return <main className="container narrow"><section className="panel auth-panel"><p>Loading your post…</p></section></main>;

    return (
        <main className="container narrow">
            <section className="panel auth-panel">
                <p className="eyebrow">Make it yours</p>
                <h1>Edit your post</h1>
                <form onSubmit={(event) => { event.preventDefault(); onSave({ title, content }); }} className="form-stack">
                    <label htmlFor="title">Title</label>
                    <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required />
                    <label htmlFor="content">Your post</label>
                    <textarea id="content" value={content} onChange={(event) => setContent(event.target.value)} rows={10} maxLength={50000} required />
                    <div className="form-actions">
                        <button className="button primary" type="submit">Save changes</button>
                        <button className="button secondary" type="button" onClick={onCancel}>Cancel</button>
                    </div>
                </form>
            </section>
        </main>
    );
}
