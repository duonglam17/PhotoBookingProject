# Potonow photo booking

## Set up the database

Run the idempotent setup command after configuring MySQL:

```sh
npm run setup:db
```

This creates the tables represented by the supplied database schema, including the photographer photo gallery table, and missing blog tables, then adds default packages and example blog posts. The schema uses `CREATE TABLE IF NOT EXISTS`; it does not modify existing table definitions or delete data. It works for a new database or one whose tables have already been imported.

To add optional development photographer accounts, run `database/photographer-seed.sql` separately in MySQL or phpMyAdmin.

The development photographer seed uses `anh.photo@example.invalid`, `nam.photo@example.invalid`, or `ha.photo@example.invalid` with password `PotonowDemo2026!`. Do not use these sample accounts in production.

New photographer registrations are stored with status `pending` and are not public until reviewed. Registration accepts 1 to 12 uploaded gallery photos; the first photo is used on photographer listings. To approve one, an administrator can set its `photographer_profiles.status` to `active`.

## Administrator access

Register a normal account first, then grant it administrator access directly in MySQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Sign out and back in with that account. Login redirects administrators to `/pages/admin.html`. The admin API checks the signed-in role; public registration does not allow creating administrator accounts.

The admin dashboard includes a **Bài viết** tab. Paste a public article URL and choose **Lấy thông tin** to preview its page title, Open Graph image, and description before editing and saving it as a draft or published post. Blog create, update, delete, and metadata preview endpoints require the admin role.

## Password reset email

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` in `.env` using credentials from your mail provider. The reset flow sends a six-digit one-time code that expires after 10 minutes; database setup creates the reset-code table. Never commit real SMTP credentials.

## Run the application

1. Copy `.env.example` to `.env` and set the MySQL connection values and a private `JWT_SECRET`.
2. Run `npm install`.
3. Run `npm run setup:db`.
4. Run `npm start` and open `http://localhost:5000`.

Uploaded booking reference images are stored under `public/images/uploads/`; the upload folder is excluded from Git.
