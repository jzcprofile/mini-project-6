export default function Header({ user, navigate, onSignout }) {
    return (
        <header className="site-header">
            <nav className="container nav">
                <a className="brand" href="/" onClick={(event) => navigate(event, "/")}>Commonplace</a>
                <div className="nav-links">
                    {user ? (
                        <>
                            <span>Welcome, {user.name}</span>
                            <a href="/account" onClick={(event) => navigate(event, "/account")}>Account</a>
                            <button className="nav-link-button" onClick={onSignout}>Sign out</button>
                        </>
                    ) : (
                        <>
                            <a href="/signin" onClick={(event) => navigate(event, "/signin")}>Sign in</a>
                            <a className="nav-cta" href="/signup" onClick={(event) => navigate(event, "/signup")}>Create account</a>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
