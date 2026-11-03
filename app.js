const path = require("node:path");
const express = require("express");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : undefined
);
const PgSession = connectPgSimple(session);
const clientDirectory = path.join(__dirname, "public", "client");
const classicViews = path.join(__dirname, "views");

app.set("view engine", "ejs");
app.set("views", classicViews);
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use((req, res, next) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) req.body = {};
    next();
});
app.use(
    session({
        store: new PgSession({ pool, createTableIfMissing: true }),
        secret: process.env.SESSION_SECRET || "local-development-secret-change-me",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
);

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
}

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "Please sign in to continue." });
    }
    next();
}

function validText(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validPassword(value) {
    return typeof value === "string" && value.length >= 8 && Buffer.byteLength(value, "utf8") <= 72;
}

function requestUser(req) {
    return req.session.user
        ? { userId: req.session.user.userId, name: req.session.user.name }
        : null;
}

function requirePageAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/classic/signin?error=Please%20sign%20in%20to%20continue.");
    }
    next();
}

app.use("/classic-assets", express.static(path.join(__dirname, "public", "classic")));

app.get("/classic", async (req, res, next) => {
    try {
        const { rows: posts } = await pool.query(
            `SELECT blog_id AS id, creator_user_id AS "creatorUserId",
                    creator_name AS author, title, body AS content, date_created AS date
             FROM blogs
             ORDER BY date_created DESC, blog_id DESC`
        );
        res.render("classic/index", {
            posts,
            user: requestUser(req),
            error: typeof req.query.error === "string" ? req.query.error : "",
            notice: typeof req.query.notice === "string" ? req.query.notice : ""
        });
    } catch (error) {
        next(error);
    }
});

app.get("/classic/signup", (req, res) => {
    res.render("classic/signup", { error: "" });
});

app.post("/classic/signup", async (req, res, next) => {
    const userId = typeof req.body.user_id === "string" ? req.body.user_id.trim() : "";
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const password = req.body.password;
    if (!validText(userId, 255) || !validText(name, 255) || !validPassword(password)) {
        return res.status(400).render("classic/signup", {
            error: "Enter a user ID and name up to 255 characters, and a password between 8 and 72 bytes."
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        await pool.query(
            "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
            [userId, passwordHash, name]
        );
        res.redirect("/classic/signin?notice=Account%20created.%20Please%20sign%20in.");
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).render("classic/signup", {
                error: "That user ID is already taken. Please choose another."
            });
        }
        next(error);
    }
});

app.get("/classic/signin", (req, res) => {
    res.render("classic/signin", {
        error: typeof req.query.error === "string" ? req.query.error : "",
        notice: typeof req.query.notice === "string" ? req.query.notice : ""
    });
});

app.post("/classic/signin", async (req, res, next) => {
    const userId = typeof req.body.user_id === "string" ? req.body.user_id.trim() : "";
    const password = req.body.password;
    if (!userId || typeof password !== "string") {
        return res.status(400).render("classic/signin", { error: "Enter your user ID and password.", notice: "" });
    }

    try {
        const { rows } = await pool.query(
            "SELECT user_id, password, name FROM users WHERE user_id = $1",
            [userId]
        );
        if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
            return res.status(401).render("classic/signin", {
                error: "Incorrect user ID or password.",
                notice: ""
            });
        }

        req.session.regenerate((error) => {
            if (error) return next(error);
            req.session.user = { userId: rows[0].user_id, name: rows[0].name };
            req.session.save((saveError) => {
                if (saveError) return next(saveError);
                res.redirect("/classic");
            });
        });
    } catch (error) {
        next(error);
    }
});

app.post("/classic/signout", requirePageAuth, (req, res, next) => {
    req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("connect.sid");
        res.redirect("/classic");
    });
});

app.post("/classic/posts", requirePageAuth, async (req, res, next) => {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!validText(title, 255) || !validText(content, 50000)) {
        return res.status(400).redirect("/classic?error=Title%20or%20post%20content%20is%20invalid.");
    }

    try {
        await pool.query(
            `INSERT INTO blogs (creator_name, creator_user_id, title, body, date_created)
             VALUES ($1, $2, $3, $4, NOW())`,
            [req.session.user.name, req.session.user.userId, title, content]
        );
        res.redirect("/classic");
    } catch (error) {
        next(error);
    }
});

app.get("/classic/edit/:id", requirePageAuth, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT blog_id AS id, title, body AS content FROM blogs
             WHERE blog_id = $1 AND creator_user_id = $2`,
            [req.params.id, req.session.user.userId]
        );
        if (!rows.length) return res.status(404).render("classic/not-found");
        res.render("classic/edit", { post: rows[0] });
    } catch (error) {
        next(error);
    }
});

app.post("/classic/edit/:id", requirePageAuth, async (req, res, next) => {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!validText(title, 255) || !validText(content, 50000)) {
        return res.status(400).redirect("/classic?error=Title%20or%20post%20content%20is%20invalid.");
    }

    try {
        const { rowCount } = await pool.query(
            `UPDATE blogs SET title = $1, body = $2
             WHERE blog_id = $3 AND creator_user_id = $4`,
            [title, content, req.params.id, req.session.user.userId]
        );
        if (!rowCount) return res.status(404).render("classic/not-found");
        res.redirect("/classic");
    } catch (error) {
        next(error);
    }
});

app.post("/classic/delete/:id", requirePageAuth, async (req, res, next) => {
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2",
            [req.params.id, req.session.user.userId]
        );
        if (!rowCount) return res.status(404).render("classic/not-found");
        res.redirect("/classic");
    } catch (error) {
        next(error);
    }
});

app.get("/classic/account", requirePageAuth, (req, res) => {
    res.render("classic/account", { error: "", notice: "" });
});

app.post("/classic/account", requirePageAuth, async (req, res, next) => {
    const userId = typeof req.body.user_id === "string" ? req.body.user_id.trim() : "";
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const password = req.body.password;
    if (!validText(userId, 255) || !validText(name, 255) ||
        (password !== undefined && password !== "" && !validPassword(password))) {
        return res.status(400).render("classic/account", {
            user: requestUser(req),
            error: "Enter a user ID and name up to 255 characters. A new password must be between 8 and 72 bytes.",
            notice: ""
        });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const passwordHash = password ? await bcrypt.hash(password, 12) : null;
        const { rows } = await client.query(
            `UPDATE users SET user_id = $1, name = $2, password = COALESCE($3, password)
             WHERE user_id = $4
             RETURNING user_id, name`,
            [userId, name, passwordHash, req.session.user.userId]
        );
        if (!rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).render("classic/not-found");
        }
        await client.query(
            "UPDATE blogs SET creator_name = $1 WHERE creator_user_id = $2",
            [rows[0].name, rows[0].user_id]
        );
        await client.query("COMMIT");
        req.session.user = { userId: rows[0].user_id, name: rows[0].name };
        req.session.save((error) => {
            if (error) return next(error);
            res.redirect("/classic/account?notice=Account%20updated.");
        });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(409).render("classic/account", {
                user: requestUser(req),
                error: "That user ID is already taken.",
                notice: ""
            });
        }
        next(error);
    } finally {
        client.release();
    }
});

app.get("/api/auth", (req, res) => {
    res.json({ user: requestUser(req) });
});

app.post("/api/signup", async (req, res, next) => {
    const userId = typeof req.body.user_id === "string" ? req.body.user_id.trim() : "";
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const password = req.body.password;

    if (!validText(userId, 255) || !validText(name, 255) || !validPassword(password)) {
        return res.status(400).json({
            error: "Enter a user ID and name up to 255 characters, and a password between 8 and 72 bytes."
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        await pool.query(
            "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
            [userId, passwordHash, name]
        );
        res.status(201).json({ message: "Account created. Please sign in." });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ error: "That user ID is already taken. Please choose another." });
        }
        next(error);
    }
});

app.post("/api/signin", async (req, res, next) => {
    const userId = typeof req.body.user_id === "string" ? req.body.user_id.trim() : "";
    const password = req.body.password;
    if (!userId || typeof password !== "string") {
        return res.status(400).json({ error: "Enter your user ID and password." });
    }

    try {
        const { rows } = await pool.query(
            "SELECT user_id, password, name FROM users WHERE user_id = $1",
            [userId]
        );
        if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
            return res.status(401).json({ error: "Incorrect user ID or password." });
        }

        req.session.regenerate((error) => {
            if (error) return next(error);
            req.session.user = { userId: rows[0].user_id, name: rows[0].name };
            req.session.save((saveError) => {
                if (saveError) return next(saveError);
                res.json({ user: requestUser(req) });
            });
        });
    } catch (error) {
        next(error);
    }
});

app.post("/api/signout", requireAuth, (req, res, next) => {
    req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("connect.sid");
        res.json({ message: "Signed out." });
    });
});

app.get("/api/blogs", async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT blog_id AS id, creator_user_id AS "creatorUserId",
                    creator_name AS author, title, body AS content, date_created AS date
             FROM blogs
             ORDER BY date_created DESC, blog_id DESC`
        );
        res.json({ posts: rows });
    } catch (error) {
        next(error);
    }
});

app.post("/api/blogs", requireAuth, async (req, res, next) => {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!validText(title, 255) || !validText(content, 50000)) {
        return res.status(400).json({ error: "Title or post content is invalid." });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO blogs (creator_name, creator_user_id, title, body, date_created)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING blog_id AS id, creator_user_id AS "creatorUserId",
                       creator_name AS author, title, body AS content, date_created AS date`,
            [req.session.user.name, req.session.user.userId, title, content]
        );
        res.status(201).json({ post: rows[0] });
    } catch (error) {
        next(error);
    }
});

app.get("/api/blogs/:id", requireAuth, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT blog_id AS id, creator_user_id AS "creatorUserId",
                    creator_name AS author, title, body AS content, date_created AS date
             FROM blogs WHERE blog_id = $1 AND creator_user_id = $2`,
            [req.params.id, req.session.user.userId]
        );
        if (!rows.length) return res.status(404).json({ error: "Post not found." });
        res.json({ post: rows[0] });
    } catch (error) {
        next(error);
    }
});

app.put("/api/blogs/:id", requireAuth, async (req, res, next) => {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!validText(title, 255) || !validText(content, 50000)) {
        return res.status(400).json({ error: "Title or post content is invalid." });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE blogs SET title = $1, body = $2
             WHERE blog_id = $3 AND creator_user_id = $4
             RETURNING blog_id AS id, creator_user_id AS "creatorUserId",
                       creator_name AS author, title, body AS content, date_created AS date`,
            [title, content, req.params.id, req.session.user.userId]
        );
        if (!rows.length) return res.status(404).json({ error: "Post not found." });
        res.json({ post: rows[0] });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/blogs/:id", requireAuth, async (req, res, next) => {
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2",
            [req.params.id, req.session.user.userId]
        );
        if (!rowCount) return res.status(404).json({ error: "Post not found." });
        res.json({ message: "Post deleted." });
    } catch (error) {
        next(error);
    }
});

app.put("/api/account", requireAuth, async (req, res, next) => {
    const userId = typeof req.body.user_id === "string" ? req.body.user_id.trim() : "";
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const password = req.body.password;
    if (!validText(userId, 255) || !validText(name, 255) ||
        (password !== undefined && password !== "" && !validPassword(password))) {
        return res.status(400).json({
            error: "Enter a user ID and name up to 255 characters. A new password must be between 8 and 72 bytes."
        });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const passwordHash = password ? await bcrypt.hash(password, 12) : null;
        const { rows } = await client.query(
            `UPDATE users SET user_id = $1, name = $2, password = COALESCE($3, password)
             WHERE user_id = $4
             RETURNING user_id, name`,
            [userId, name, passwordHash, req.session.user.userId]
        );
        if (!rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Account not found." });
        }
        await client.query(
            "UPDATE blogs SET creator_name = $1 WHERE creator_user_id = $2",
            [rows[0].name, rows[0].user_id]
        );
        await client.query("COMMIT");
        req.session.user = { userId: rows[0].user_id, name: rows[0].name };
        req.session.save((error) => {
            if (error) return next(error);
            res.json({ user: requestUser(req) });
        });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(409).json({ error: "That user ID is already taken." });
        }
        next(error);
    } finally {
        client.release();
    }
});

app.use("/api", (req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
});

app.use(express.static(clientDirectory));
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDirectory, "index.html"), (error) => {
        if (error && !res.headersSent) {
            res.status(503).send("React app is not built. Run npm run build or npm run dev.");
        }
    });
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.type === "entity.parse.failed" ? 400 :
        error.type === "entity.too.large" ? 413 : 500;
    if (status === 500) console.error(error);
    if (req.path.startsWith("/classic")) {
        return res.status(status).render("classic/error", {
            message: status === 500
                ? "We could not complete that request. Please try again."
                : "The submitted request was invalid or too large."
        });
    }
    res.status(status).json({
        error: status === 400 ? "Request body must contain valid JSON." :
            status === 413 ? "Request body is too large." : "An unexpected server error occurred."
    });
});

if (require.main === module) {
    if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
        throw new Error("SESSION_SECRET must be set in production.");
    }
    pool.query("SELECT 1")
        .then(() => app.listen(PORT, () => console.log(`Blog API running at http://localhost:${PORT}`)))
        .catch((error) => {
            console.error("Could not connect to PostgreSQL. Check your database settings.", error);
            process.exitCode = 1;
        });
}

module.exports = { app, pool };
