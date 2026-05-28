# DEPT-OPS — Operations Department
> Owner: Atlas · Model: Groq / Gemini Flash (free) · Updated: 2026-05-27

## Mission
Keep everything running. Health checks, cron monitoring, error detection, diagnostics. Gemini Flash is sufficient for 95% of ops tasks.

## Owns
- Droplet service health (`systemctl status`, `journalctl`)
- Cron job monitoring (internship scout, trading workers, reflection timers)
- ECC bridge reachability checks
- DeepSeek spend tracking (soft warn $0.50/day, hard stop $1.50/day)
- Whisper Dictate health on PC
- Dashboard/Next.js uptime monitoring
- Error pattern detection across all services

## Key services to monitor
| Service | Check command | Alert if |
|---------|--------------|---------|
| hermes-gateway | `systemctl --user status hermes-gateway` | not active |
| hermes-webui | `systemctl --user status hermes-webui` | not active |
| trading workers | `systemctl --user status hermes-trading@*.service` | any stopped |
| ECC bridge | GET `http://100.69.115.98:3738/api/triad` | timeout |
| Dashboard | GET `http://127.0.0.1:3737` | non-200 |

## Droplet facts
- Public IP: `142.93.12.177` · Tailscale: `100.78.199.123`
- RAM: 961 MB + 2 GB swap · Gateway ~133 MB
- All services: systemd user units under `hermes` user, linger enabled
