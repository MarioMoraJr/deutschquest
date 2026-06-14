# DeutschQuest

Mobile-first German learning app served from this server on port `3100`.

It combines a warm quest UI with arcade-style drills and local AI tutoring through Ollama.

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

## Future Reverse Proxy

Planned public/internal path:

```text
https://<tailscale-host>/deutschquest/
```

For a path-based reverse proxy, forward `/deutschquest/` to `http://127.0.0.1:3100/` and preserve websocket-free HTTP routes:

```text
/deutschquest/      -> /
/deutschquest/api/  -> /api/
```

The app has no authentication yet. Keep it on a trusted private network until auth is added.
