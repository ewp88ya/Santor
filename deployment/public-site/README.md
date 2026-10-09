# Santor public website source

This directory is the source of truth for the server-rendered marketing website currently served from `/var/www/santor`. It contains the homepage, standalone SEO pages, sitemap, and robots policy. Customer login/register continues to use the existing `app.html` and `/assets` bundles; this site must not overwrite those files.

## Validate

From the repository root:

```bash
python3 scripts/check-public-site.py
```

## Deploy on the public web host

After syncing this repository to the Hostinger host that serves `santor.app`:

```bash
sudo ./scripts/deploy-public-site.sh
```

The script backs up the existing public HTML/routes/robots/sitemap under `/var/www/santor/.backups/` before replacing them. It deliberately refuses any `WEB_ROOT` other than `/var/www/santor`, and leaves `app.html`, the assets directory, Nginx configuration, API, and VPN services untouched.

The legal pages are deliberately excluded from the sitemap and marked `noindex` while operator details and legal review remain incomplete.
