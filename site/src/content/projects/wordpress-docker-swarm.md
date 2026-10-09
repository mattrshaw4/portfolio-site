---
title: "WordPress on a Three-Node Docker Swarm"
summary: "A three-node Docker Swarm on EC2 running WordPress with three replicas and MySQL on separate overlay networks, deployed from the AWS CLI."
stack: ["Docker Swarm", "AWS EC2", "WordPress", "MySQL", "Overlay networking"]
date: 2026-04-03
order: 5
writeup: "scaling-a-wordpress-publication-with-docker-swarm-on-aws-a-step-by-step-deployment-guide"
---

## The scenario

A training scenario for a fictional publisher, Level Up Publications. The site needed to stay up through traffic spikes and container crashes, keep its database through restarts, and scale without manual work.

## Architecture

- Three EC2 t3.micro instances on Ubuntu 22.04: `swarm-manager`, `swarm-worker-1` and `swarm-worker-2`.
- MySQL runs as one replica on an internal overlay network, `backend-net`, with its data in a Docker volume called `mysql-data`.
- WordPress runs as three replicas on both `frontend-net` and `backend-net`, published on port 80. It reaches MySQL by service name through Swarm's internal DNS.
- Swarm's routing mesh answers on port 80 on every node, so any node's public IP serves the same site.

## How it was deployed

1. Launch the three instances from the AWS CLI: look up the default VPC and the latest Ubuntu 22.04 AMI, create the key pair and the `swarm-sg` security group, then run the instances.
2. Install Docker from its apt repository on all three nodes.
3. Initialize the Swarm on the manager and join both workers on port 2377.
4. Create the two overlay networks.
5. Deploy MySQL with a volume mount so data persists, then WordPress with three replicas.

Verification was `docker node ls` showing three Ready nodes, `docker service ls` showing 1/1 and 3/3 replicas, and the same WordPress site answering on all three public IPs.

## What I'd change

- The lab security group opens Swarm's management, discovery and overlay ports (2377, 7946 and 4789) to `0.0.0.0/0`. A real cluster would allow them only from the cluster's own security group.
- The write-up shows the cluster running but doesn't yet test failure. The next step is to kill containers and stop a node, then record how long recovery takes.
