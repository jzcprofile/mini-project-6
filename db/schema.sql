CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS blogs (
    blog_id SERIAL PRIMARY KEY,
    creator_name VARCHAR(255) NOT NULL,
    creator_user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS blogs_date_created_idx ON blogs (date_created DESC, blog_id DESC);

INSERT INTO users (user_id, password, name) VALUES
    ('maya', crypt('MayaBlog2026!', gen_salt('bf', 12)), 'Maya Chen'),
    ('noah', crypt('NoahBlog2026!', gen_salt('bf', 12)), 'Noah Williams'),
    ('amina', crypt('AminaBlog2026!', gen_salt('bf', 12)), 'Amina Yusuf')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO blogs (creator_name, creator_user_id, title, body, date_created)
SELECT seed.creator_name, seed.creator_user_id, seed.title, seed.body, seed.date_created
FROM (VALUES
    ('Maya Chen', 'maya', 'Finding small moments of calm', 'A short walk before the day begins has become my favorite way to slow down. I leave my phone at home, notice the changing light, and return with a little more room to think.', TIMESTAMP '2026-09-18 08:30:00'),
    ('Noah Williams', 'noah', 'A weekend recipe worth keeping', 'This roasted tomato and chickpea bowl is simple, filling, and easy to adapt. Add lemon, fresh herbs, and warm bread, then save the leftovers for lunch.', TIMESTAMP '2026-09-20 12:15:00'),
    ('Amina Yusuf', 'amina', 'What I learned from learning slowly', 'Progress is not always dramatic. Practicing a new skill for twenty minutes each day taught me that small, repeatable efforts can add up to real confidence.', TIMESTAMP '2026-09-23 17:45:00'),
    ('Maya Chen', 'maya', 'A tiny guide to a better reading nook', 'Good light, a comfortable chair, and a place to set down tea are enough to make an inviting corner. The best part is having somewhere to pause without needing a plan.', TIMESTAMP '2026-09-27 10:00:00'),
    ('Noah Williams', 'noah', 'Notes from a screen-free Sunday', 'I spent Sunday cooking, calling a friend, and taking the long route home. Nothing extraordinary happened, which turned out to be exactly what I needed.', TIMESTAMP '2026-10-01 19:20:00')
) AS seed(creator_name, creator_user_id, title, body, date_created)
WHERE NOT EXISTS (
    SELECT 1 FROM blogs existing WHERE existing.title = seed.title
);
