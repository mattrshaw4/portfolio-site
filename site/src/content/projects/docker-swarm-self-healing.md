---
title: "Docker Swarm Self-Healing Container Infrastructure"
summary: "A three-node Docker Swarm on EC2 running a global service, so every node runs a container and Swarm replaces any that go missing."
stack: ["Docker Swarm", "AWS EC2", "Overlay networking", "Ubuntu"]
date: 2026-03-29
order: 3
writeup: "self-healing-container-infrastructure-with-docker-swarm-on-aws-ec2"
---

## The scenario

A training scenario for a global shipping company whose containerized workloads had no recovery mechanism: when a container went down, it stayed down. The brief gave a one-week deadline.

## Architecture

- Three EC2 instances on Ubuntu 20.04: one manager, `master-node`, and two workers, `worker-node-1` and `worker-node-2`, with hostnames set using `hostnamectl`.
- Docker installed on all three, with the Swarm initialized on the manager and the workers joined on port 2377.
- A **global** service rather than a replicated one. A global service runs exactly one container on every node, while a replicated service runs a set number of copies wherever Swarm chooses.
- An overlay network connects the containers across nodes.

## Why global

With one container per node, the desired state is simple to state and easy to check. If a container disappears, Swarm's reconciliation loop sees the gap and schedules a replacement.

## What I'd change

The write-up covers the build and the design choice. The next version should include the proof: stop a container, then stop a whole node, and record how long Swarm takes to recover.
