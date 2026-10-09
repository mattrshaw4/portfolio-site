---
title: "Linux Security Audit Script"
summary: "A Bash audit script on a systemd timer that flagged three real issues on my own machine on its first run, all fixed in about ten minutes."
stack: ["Bash", "Linux", "systemd"]
date: 2026-05-09
order: 2
repo: "https://github.com/mattrshaw4/linux-sys-audit"
---

## What it checks

- **Filesystem:** disk usage by mount point, the ten largest directories and a breakdown of `/var/log`.
- **Processes and services:** top CPU and memory consumers, and any failed systemd units.
- **Networking:** listening ports, the routing table and network interfaces.
- **Users and permissions:** recent logins, each user's last login and sudo privileges.

Every run saves a timestamped log to `~/audit_logs/`. Disk usage at 60% flags a warning and 80% flags critical. Any failed systemd unit is critical, a port bound to `0.0.0.0` or `*` is a warning, and a snap directory at 50G or more is a warning.

## How it runs

A systemd `oneshot` service runs the script under my user account. The timer fires five minutes after boot and every hour after that, with `Persistent=true` so a missed run happens after a reboot.

## What the first run found

- **Open WebUI on `0.0.0.0:3000`.** My local Ollama front end was exposed to the whole network. I rebound it to `127.0.0.1:3000`.
- **Apache2 running and enabled on boot** with nothing to serve. I stopped and disabled it.
- **Snap storage at 54G.** Disabled revisions had piled up across 30+ packages. After removing them it dropped to 30G, a 44% reduction.

Fixing all three took about ten minutes.
