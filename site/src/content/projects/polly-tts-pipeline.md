---
title: "Serverless Text-to-Speech Pipeline"
summary: "Amazon Polly text-to-speech driven by GitHub Actions: pull requests publish a beta audio file and merges to main publish production audio in S3."
stack: ["AWS Polly", "GitHub Actions", "S3", "Python", "boto3"]
date: 2026-02-22
order: 4
writeup: "building-a-serverless-text-to-speech-pipeline-with-amazon-polly-and-github-actions"
---

## The scenario

A training scenario for a fictional client, Pixel Learning Co., that wanted course content stored in GitHub converted to audio for visually impaired users and for people who learn by listening. The brief was a lightweight, cost-effective pipeline that stays fully serverless.

## How it works

- A Python script using boto3 sends `speech.txt` to Amazon Polly and writes `example.mp3`.
- Two GitHub Actions workflows run it. `on_pr.yml` runs when a pull request targets `main` and uploads to a `beta/` folder in S3. `on_merge.yml` runs on a push to `main` and uploads to `prod/`.
- Each run overwrites the file in its folder, and I verified the result in the S3 console, with the AWS CLI and in the Actions log.

## What I learned

- Polly's synchronous synthesis is limited to 3,000 characters. Longer content needs the asynchronous `start_speech_synthesis_task` method.
- Most of my errors were in the YAML: spelling, indentation and naming consistency across two near-identical workflow files. One of them had the same command typed twice and a missing file name in the production upload.
