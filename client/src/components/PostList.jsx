function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function PostList({ posts, user, onEdit, onDelete }) {
    return (
        <section className="feed">
            <div className="section-heading">
                <div><p className="eyebrow">From the community</p><h2>Latest stories</h2></div>
                <span className="post-count">{posts.length} {posts.length === 1 ? "story" : "stories"}</span>
            </div>
            {posts.length === 0 ? (
                <div className="panel empty-state"><h3>No stories yet</h3><p>Check back soon for something new.</p></div>
            ) : (
                <div className="post-grid">
                    {posts.map((post) => (
                        <article className="post-card" key={post.id}>
                            <div className="post-meta">
                                <span className="avatar">{(post.author || "U").slice(0, 1).toUpperCase()}</span>
                                <div><strong>{post.author}</strong><time dateTime={post.date}>{formatDate(post.date)}</time></div>
                            </div>
                            <h3>{post.title}</h3>
                            <p className="post-content">{post.content}</p>
                            {user?.userId === post.creatorUserId && (
                                <div className="post-actions">
                                    <button className="button small secondary" onClick={() => onEdit(post.id)}>Edit</button>
                                    <button className="button small danger" onClick={() => onDelete(post.id)}>Delete</button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
