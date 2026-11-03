import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import AccountForm from "./components/AccountForm.jsx";
import AuthForm from "./components/AuthForm.jsx";
import BlogPostForm from "./components/BlogPostForm.jsx";
import EditPostForm from "./components/EditPostForm.jsx";
import Header from "./components/Header.jsx";
import PostList from "./components/PostList.jsx";

function routeFromPath(path) {
    if (path === "/signup") return { page: "signup" };
    if (path === "/signin") return { page: "signin" };
    if (path === "/account") return { page: "account" };
    const match = path.match(/^\/edit\/(\d+)$/);
    return match ? { page: "edit", id: match[1] } : { page: "home" };
}

export default function App() {
    const [route, setRoute] = useState(() => routeFromPath(window.location.pathname));
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editPost, setEditPost] = useState(null);
    const [loading, setLoading] = useState(true);

    const navigateTo = useCallback((path) => {
        window.history.pushState({}, "", path);
        setRoute(routeFromPath(path));
        setError("");
        setNotice("");
    }, []);

    const navigate = useCallback((event, path) => {
        if (event) event.preventDefault();
        navigateTo(path);
    }, [navigateTo]);

    const loadPosts = useCallback(async () => {
        const data = await api("/blogs");
        setPosts(data.posts);
        return data.posts;
    }, []);

    useEffect(() => {
        const onPopState = () => {
            setRoute(routeFromPath(window.location.pathname));
            setError("");
            setNotice("");
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    useEffect(() => {
        let active = true;
        Promise.all([api("/auth"), loadPosts()])
            .then(([auth]) => { if (active) setUser(auth.user); })
            .catch((requestError) => { if (active) setError(requestError.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [loadPosts]);

    useEffect(() => {
        if (route.page === "edit" && user) {
            api(`/blogs/${route.id}`)
                .then((data) => setEditPost(data.post))
                .catch((requestError) => {
                    setEditPost(null);
                    setError(requestError.message);
                    if (requestError.message === "Post not found.") navigateTo("/");
                });
        } else {
            setEditPost(null);
        }
    }, [route, user, navigateTo]);

    async function submitAuth(values) {
        setError("");
        try {
            if (route.page === "signup") {
                await api("/signup", { method: "POST", body: JSON.stringify(values) });
                navigateTo("/signin");
                setNotice("Account created. Please sign in.");
                return;
            }
            const data = await api("/signin", { method: "POST", body: JSON.stringify(values) });
            setUser(data.user);
            navigateTo("/");
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function signout() {
        try {
            await api("/signout", { method: "POST" });
            setUser(null);
            navigateTo("/");
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function createPost(values) {
        try {
            const data = await api("/blogs", { method: "POST", body: JSON.stringify(values) });
            setPosts((current) => [data.post, ...current]);
            setNotice("Your post is live.");
            return true;
        } catch (requestError) {
            setError(requestError.message);
            return false;
        }
    }

    async function savePost(values) {
        try {
            const data = await api(`/blogs/${route.id}`, { method: "PUT", body: JSON.stringify(values) });
            setPosts((current) => current.map((post) => post.id === data.post.id ? data.post : post));
            navigateTo("/");
            setNotice("Your post has been updated.");
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function deletePost(id) {
        if (!window.confirm("Permanently delete this post?")) return;
        try {
            await api(`/blogs/${id}`, { method: "DELETE" });
            setPosts((current) => current.filter((post) => post.id !== id));
            setNotice("Post deleted.");
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function saveAccount(values) {
        try {
            const data = await api("/account", { method: "PUT", body: JSON.stringify(values) });
            setUser(data.user);
            setPosts((current) => current.map((post) =>
                post.creatorUserId === data.user.userId ? { ...post, author: data.user.name } : post
            ));
            setNotice("Account updated.");
            setError("");
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <>
            <Header user={user} navigate={navigate} onSignout={signout} />
            {(error && !["signup", "signin", "account"].includes(route.page)) && <div className="container"><p className="message error" role="alert">{error}</p></div>}
            {loading ? (
                <main className="container narrow"><section className="panel auth-panel"><p>Loading the blog…</p></section></main>
            ) : route.page === "signup" || route.page === "signin" ? (
                <AuthForm mode={route.page} onSubmit={submitAuth} error={error} notice={notice} navigate={navigate} />
            ) : route.page === "account" ? (
                user ? <AccountForm key={user.userId} user={user} onSave={saveAccount} error={error} notice={notice} /> : <main className="container narrow"><section className="panel auth-panel"><h1>Sign in required</h1><a href="/signin" onClick={(event) => navigate(event, "/signin")}>Sign in to manage your account</a></section></main>
            ) : route.page === "edit" ? (
                user
                    ? <EditPostForm post={editPost} onSave={savePost} onCancel={() => navigateTo("/")} />
                    : <main className="container narrow"><section className="panel auth-panel"><h1>Sign in required</h1><a href="/signin" onClick={(event) => navigate(event, "/signin")}>Sign in to edit your post</a></section></main>
            ) : (
                <main className="container">
                    <section className="hero">
                        <p className="eyebrow">Ideas, stories &amp; everyday discoveries</p>
                        <h1>A little space<br />to share what matters.</h1>
                        <p>Read something thoughtful, or add your own voice to the conversation.</p>
                        {!user && <a className="button primary" href="/signin" onClick={(event) => navigate(event, "/signin")}>Sign in to write</a>}
                    </section>
                    {notice && <p className="message success" role="status">{notice}</p>}
                    {user && <BlogPostForm onCreate={createPost} />}
                    <PostList
                        posts={posts}
                        user={user}
                        onEdit={(id) => navigateTo(`/edit/${id}`)}
                        onDelete={deletePost}
                    />
                </main>
            )}
            {route.page === "home" && <footer className="site-footer"><div className="container">A thoughtful corner of the internet.</div></footer>}
        </>
    );
}
