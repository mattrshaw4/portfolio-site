---
title: "Linux Process Sentinel"
summary: "A Bash watchdog run by systemd that polls a service every 10 seconds, restarts it when it fails and logs every event."
stack: ["Bash", "Linux", "systemd"]
date: 2026-05-09
order: 1
repo: "https://github.com/mattrshaw4/linux-process-sentinel"
---

## What it does

The sentinel checks a target service every 10 seconds with `systemctl is-active`. If the service is down it logs an alert, restarts it, waits three seconds and confirms the recovery. If the service is still down it logs a failure. Every event goes to `~/sentinel-logs/sentinel.log` and to the system journal, with a running restart count.

## How it's built

- The sentinel runs as its own systemd service with `Restart=always`.
- The service it watches has `Restart=no`, so the sentinel is the only thing that brings it back.
- The target in the repo is a simulated service, `dummy-app`, that writes a heartbeat every five seconds. It stands in for a real service such as nginx or a Python app, which is the intended next step.

## How I tested it

I followed the sentinel's journal with `journalctl -u sentinel -f`, stopped the dummy app with `sudo systemctl stop dummy-app` and watched the alert, restart and recovery appear within about ten seconds.

## What I'd change

The test was manual. A real version needs a configurable list of services, thresholds for repeated failures so it doesn't restart in a loop, and a notification when it gives up.
