# Typeset

A clean, typographically focused Hugo theme with multiple colour modes. Designed for content creators who value readability, accessibility, and a strong visual identity.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Hugo](https://img.shields.io/badge/Hugo-0.60.0+-green.svg)

## Features

- **7 built-in colour themes** — Light, Dark, Terminal, Mid-century, 1-bit, Foothills, and Seventies, all switchable at runtime
- **Multiple content types** — Blog posts, photos, podcasts, asides/micro-posts, notes, and reflections, each with dedicated layouts and RSS feeds
- **Series support** — Group related posts into ordered series with navigation between parts
- **Full-text search** — JSON-based client-side search
- **25 custom shortcodes** — Galleries, callouts, columns, Mermaid diagrams, audio/video, blogrolls, and more
- **Responsive, mobile-first** — Hamburger navigation and fluid layout down to small screens
- **Accessible** — Skip links, ARIA labels, and `prefers-reduced-motion` support throughout
- **Comment system integration** — Talkyard support built in
- **Podcast RSS feeds** — Complete podcast RSS generation with episode metadata
- **No JavaScript required** for core navigation and layout

## Requirements

- Hugo 0.60.0 or later

## Installation

Add the theme as a Git submodule inside your Hugo site:

```bash
git submodule add https://github.com/dlnorman/Hugo-Typeset-theme themes/typeset
```

Then set the theme in your site configuration:

```toml
# hugo.toml
theme = "typeset"
```

## Configuration

### Basic site parameters

```toml
[params]
  description        = "Your site tagline"
  showRelatedPosts   = true

  # Optional animations
  enableCanvasAnimation = false
  showFlock             = false

  # Mastodon creator meta tag
  # fediverse_creator = "@you@mastodon.social"
```

### Comment system (Talkyard)

```toml
[params.talkyard]
  serverAddress = "https://comments.example.com"
  discussionId  = "your-site-id"
```

### Navigation menus

```toml
[[menus.main]]
  name   = "Blog"
  url    = "/posts/"
  weight = 1

[[menus.main]]
  name   = "Photos"
  url    = "/photos/"
  weight = 2
```

Dropdown submenus are supported via the `parent` field on menu entries.

## Colour Themes

The theme switcher in the header lets visitors choose their preferred colour mode. Available themes:

| Theme | Description |
|-------|-------------|
| Light | Classic light background |
| Dark | Dark background with blue accents |
| Terminal | Amber-on-dark retro terminal aesthetic |
| Mid-century | Warm brown/beige 1950s palette |
| 1-bit | High-contrast black and white |
| Foothills | Mountain-inspired muted tones |
| Seventies | Deep navy/orange 1970s palette |

The selected theme is persisted in `localStorage` and applied before first paint to avoid flash of unstyled content.

## Content Types

| Type | Section | Notes |
|------|---------|-------|
| Posts | `/posts/` | Full blog posts; supports series grouping |
| Photos | `/photos/` | Responsive grid with lightbox |
| Podcast | `/podcast/` | Audio player, episode metadata, RSS |
| Asides | `/asides/` | Short-form/micro-posts |
| Notes | `/notes/` | Notes section |
| Reflections | `/reflections/` | Longer-form reflections |

Each section has its own RSS feed.

## Shortcodes

| Shortcode | Purpose |
|-----------|---------|
| `gallery` | Responsive image gallery with lightbox |
| `image` / `figure` | Single image with optional caption |
| `audio` / `video` | Media embeds |
| `callout` | Highlighted callout boxes |
| `columns` / `column` / `endcolumns` | Multi-column layouts |
| `details` | Expandable accordion section |
| `mermaid` | Mermaid diagram rendering |
| `blogroll` / `blogrollitem` | Link/blogroll collections |
| `opmlblogroll` | Import blogroll from OPML |
| `social-icons` | Social media icon set |
| `tweet` | Embedded tweet |
| `rawhtml` | Pass raw HTML through |
| `pages` | List pages from a section |
| `recent-bookmarks` | Recent bookmarks widget |
| `hugoversion` | Display current Hugo version |

## Content Archetype

Run `hugo new posts/my-post.md` to create a post with the default frontmatter:

```yaml
---
title: ""
date: 2006-01-02T15:04:05-07:00
draft: true
description: ""
author: ""
categories: []
tags: []
image: ""
toc: false
---
```

## License

MIT — see [LICENSE](LICENSE) for details.

## Author

[D'Arcy Norman](https://darcynorman.net)
