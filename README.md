# DeutschQuest

Mobile-first German learning app served from this server on port `3100`.

It combines a warm quest UI with arcade-style drills and local AI tutoring through Ollama.

Project location:

```text
C:\Users\mario\server\deutschquest
```

## Run

```powershell
npm start
```

Open:

```text
http://localhost:3100
```

From another device on your Tailscale network:

```text
http://<tailscale-ip>:3100
```

## Local AI

The app uses Ollama by default:

```text
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

Override them when starting the server if needed.

## App Password

Create a local `.env` file. It is ignored by git.

```text
APP_PASSWORD=your-private-app-password
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
BASE_PATH=
PORT=3100
```

When `APP_PASSWORD` is set, all app data, chat, tools, and drill endpoints require login.

## Future Reverse Proxy

Planned public/internal path:

```text
https://<tailscale-host>/deutschquest/
```

Set:

```text
BASE_PATH=/deutschquest
```

Then forward `/deutschquest/` to `http://127.0.0.1:3100/deutschquest/` or strip the prefix at the proxy and forward to `http://127.0.0.1:3100/`.

```text
/deutschquest/      -> /
/deutschquest/api/  -> /api/
```

Keep the app on a trusted private network even with the app password enabled. It is a lightweight access guard, not a full multi-user auth system.

## Storage

The app persists runtime data to `data/deutschquest.sqlite`.

The old JSON file, if present, is used only as first-run migration seed data. Runtime SQLite files are ignored by git.

## Docker

The app includes a `Dockerfile` and is wired into `C:\Users\mario\server\docker-compose.yml`.

From `C:\Users\mario\server`:

```powershell
docker compose up -d --build deutschquest
```

The compose service uses `host.docker.internal:11434` so the container can reach Ollama running on the Windows host.

## Backup

Create a consistent SQLite backup:

```powershell
npm run backup
```

Backups are written to `backups/` and ignored by git.
