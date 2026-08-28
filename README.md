# jasinski.software

Personal blog and portfolio of **Mateusz Jasinski** — nine years across web development, and running. Software built with curiosity, precision, and endurance.

🔗 Live at **[jasinski.software](https://jasinski.software)**

This repository is public so anyone curious can see how the site is built. It is **not** an open-source project looking for contributions — see [Contributing](#contributing) and [License](#license) below.

## Tech stack

- **[Astro](https://astro.build)** — static site generator
- **[Tailwind CSS v4](https://tailwindcss.com)** — styling
- **MDX** — for richer, component-driven posts
- **Content Collections** — type-checked Markdown/MDX frontmatter
- Deployed on **Vercel** (with Vercel Web Analytics)

## Project structure

```text
├── public/              # static assets (images, fonts, OG output)
├── scripts/
│   └── gen-og.mjs       # OpenGraph image generation
├── src/
│   ├── components/      # Astro components (Header, Footer, cards, embeds…)
│   ├── content/
│   │   └── blog/        # blog posts (Markdown / MDX), grouped by topic
│   ├── layouts/         # page layouts (e.g. BlogPost)
│   ├── lib/             # helpers (post querying, etc.)
│   ├── pages/           # routes — file-based
│   ├── styles/
│   └── consts.ts        # global site metadata
├── astro.config.mjs
└── package.json
```

Posts live in `src/content/blog/`. Each page under `src/pages/` maps to a route based on its filename.

## Local development

Requires **Node.js 24.x**.

```sh
npm install      # install dependencies
npm run dev      # start dev server at http://localhost:4321
```

## Commands

| Command           | Action                                        |
| :---------------- | :-------------------------------------------- |
| `npm run dev`     | Start local dev server at `localhost:4321`    |
| `npm run build`   | Build the production site to `./dist/`        |
| `npm run preview` | Preview the production build locally          |
| `npm run og`      | Generate OpenGraph images                     |
| `npm run astro`   | Run Astro CLI commands (`astro add`, `check`) |

## Contributing

This is a personal site, so I'm not accepting feature contributions or content changes. That said, if you spot a factual error, a broken link, or a typo, feel free to [open an issue](https://github.com/mateuszjasinski/jasinski_dev/issues) — it's appreciated.

## License

© Mateusz Jasinski. All rights reserved.

The **code** is public for reference and learning. The **content** (articles, images, and other written material) is not licensed for reuse. Please don't republish posts or lift the design wholesale. If you'd like to quote or reference something, [get in touch](https://jasinski.software/about).