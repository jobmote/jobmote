# jobmote.de – strukturierte Demo (ohne Backend)

## Ordnerstruktur
- `css/style.css` – Styles
- `js/` – JavaScript in logisch getrennten Dateien
- `admin/index.html` – Admin-Demo: zeigt LocalStorage (Accounts/Session/Favoriten/Custom Jobs)

## Wo werden Accounts gespeichert?
Im Browser (LocalStorage):
- `jm_users` – registrierte Nutzer (E-Mail/Passwort/Typ)
- `jm_session` – aktuell eingeloggter Nutzer
- `jm_favs_<email|guest>` – Favoriten pro Nutzer oder Gast
- `jm_jobs_custom` – von Company-Accounts erstellte Jobs (Demo)

## Start
Öffne `index.html` im Browser.
Hinweis: Bei manchen Browsern funktionieren bestimmte Features sauberer, wenn du über einen lokalen Server startest.


## Supabase Setup (Netlify)

Set these Netlify Environment Variables:
- SUPABASE_URL
- SUPABASE_ANON_KEY

Supabase Dashboard:
- Authentication → URL Configuration: Site URL = https://jobmote.netlify.app
- Add Redirect URLs: https://jobmote.netlify.app/login.html and https://jobmote.netlify.app/jobs.html
- Authentication → Email: Confirm signup ON
