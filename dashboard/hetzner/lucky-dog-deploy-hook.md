# Lucky Dog Deploy Hook (future)

When Lucky Dog ships, Fenrir's `sites.json` needs to flip `enabled: true` on the right URL. Here's the recipe ready to wire when deploy day comes.

## Path A — Vercel webhook (recommended)

1. Add a Vercel "Deploy Hook" URL (Vercel Project → Settings → Git → Deploy Hooks).
2. Vercel will POST to a Droplet endpoint after every deploy. Build:

```python
# /home/hermes/fenrir/deploy-webhook.py — simple Flask handler
from flask import Flask, request
import json, hmac, hashlib
from pathlib import Path

app = Flask(__name__)
SECRET = "set-via-env"
SITES = Path("/home/hermes/fenrir/sites.json")

@app.route("/deploy-hook", methods=["POST"])
def hook():
    sig = request.headers.get("x-vercel-signature", "")
    body = request.get_data()
    expected = hmac.new(SECRET.encode(), body, hashlib.sha1).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return "bad sig", 403
    payload = request.get_json()
    if payload.get("type") == "deployment.succeeded":
        # Flip lucky-dog-prod or lucky-dog-vercel based on which URL deployed
        url = payload.get("payload", {}).get("url", "")
        sites = json.loads(SITES.read_text())
        for s in sites:
            if url in s["url"]:
                s["enabled"] = True
        SITES.write_text(json.dumps(sites, indent=2))
    return "ok", 200
```

Expose via systemd + nginx reverse proxy on the Droplet (port 443).

## Path B — Cron poller (no webhook needed)

If the user just deploys manually and the URL is stable, Fenrir already polls `sites.json` every tick. Just edit the file once when deploy day comes:

```bash
ssh root@142.93.12.177 'sed -i "s|\"enabled\": false|\"enabled\": true|" /home/hermes/fenrir/sites.json'
```

## Status (2026-05-27)
Not building either yet — user said Lucky Dog is still in design. Stub kept here so future-Claude knows the wiring path.
