# Reddit Comment Guessing Game — Full MVP Implementation Plan

## Product Vision

Build a lightweight, streamer-friendly web game where users are shown:

- a Reddit post title
- the subreddit name

The player must guess the **top Reddit comment**.

The game uses:

- embeddings
- semantic similarity
- keyword matching

to determine how close the guess was.

The experience should prioritize:

- funny reveals
- rapid rounds
- social sharing
- streamer interaction
- SEO discoverability

NOT:

- perfect AI accuracy.

---

# Core Product Principles

## Optimize For:

- fun
- speed
- reactions
- replayability
- shareability
- streamability

## Do NOT Optimize For:

- perfect semantic scoring
- enterprise-grade architecture
- microservices
- premature scaling
- realtime multiplayer initially

---

# Recommended Tech Stack

# Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

# Backend

- Next.js route handlers

# Database

- Supabase Postgres

# Hosting

- Vercel

# AI

Initial:

- Gemini embeddings API

Future:

- optional local embedding model

---

# Critical Product Goal

The MVP only needs to answer ONE question:

## “Is this fun for 20+ rounds?”

Nothing else matters initially.

---

# Core Gameplay Loop

# Round Flow

## 1. Display

- Reddit post title
- subreddit name

Example:

Title:
"My husband accidentally washed the air fryer"

Subreddit:
r/tifu

---

## 2. User Guess

Player types:

"Put it in rice"

---

## 3. Backend Scoring

Compute:

- embedding similarity
- keyword overlap

---

## 4. Reveal

Show:

- actual top comment
- player score
- reaction message

Example:

89% — Close enough

---

## 5. Next Round

Fast progression.

No heavy transitions.

Optimize for:

- dopamine loop
- Twitch readability
- TikTok clips

---

# Core MVP Features

# MUST HAVE

## Gameplay

- single-player rounds
- answer scoring
- reveal screen
- next round flow

## Backend

- Reddit ingestion
- embedding generation
- similarity scoring

## Database

- posts
- comments
- guesses

## SEO

- crawlable pages
- metadata
- OpenGraph tags

## Analytics

- rounds played
- session length
- abandonment rate

---

# DO NOT BUILD YET

- auth
- accounts
- realtime multiplayer
- websocket infrastructure
- payments
- ads
- mobile apps
- Twitch API integration
- ranking systems
- achievements
- AI agents
- video support

---

# SEO-FIRST ARCHITECTURE

IMPORTANT:
This app should be designed around SEO from day 1.

---

# URL Structure

## Homepage

/

---

## Individual Rounds

/round/[id]

---

## Subreddit Pages

/subreddit/[name]

Examples:
/subreddit/funny
/subreddit/facepalm

---

## Daily Challenge

/daily

---

# SEO Requirements

Every round page should contain:

- title
- subreddit
- actual top comment
- metadata
- OpenGraph preview
- crawlable text

Use:

- SSR
- static generation where possible
- dynamic metadata

---

# Social Sharing Requirements

Generate shareable cards.

Example:

Title:
"My husband accidentally washed the air fryer"

Your Guess:
"Put it in rice"

Score:
92%

Optimize for:

- Discord
- Twitter/X
- Reddit
- TikTok bio traffic

---

# Database Schema

# reddit_posts

```sql
id uuid primary key
reddit_post_id text unique
subreddit text
title text
url text
score integer
created_at timestamp
```
