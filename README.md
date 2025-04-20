<div align="center">
  <h1 align="center">Syncwave</h1>

  <p align="center">
    Kanban board that helps you build software people love.
</p>
  <p align="center">
    <a href="https://github.com/syncwavedev/syncwave/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-AGPL--v3-green?style=for-the-badge" alt="Syncwave is released under the AGPLv3 license." />
    </a>
    <a href="https://discord.com/invite/FzQjQVFdQz">
      <!-- <img alt="Discord online members" src="https://img.shields.io/discord/1363049127663108156?color=5865F2&label=Discord&style=for-the-badge" /> -->
      <img src="https://img.shields.io/badge/Chat%20on-Discord-%235766f2?style=for-the-badge" alt="Discord community" />
    </a>
    <img alt="Commit activity per month" src="https://img.shields.io/github/commit-activity/m/syncwavedev/syncwave?style=for-the-badge" />
  </p>
  <p align="center">
    <a href="https://app.syncwave.dev/demo">Demo</a>
    &middot;
    <a href="https://www.syncwave.dev/docs">Docs</a>
    &middot;
    <a href="https://github.com/syncwavedev/syncwave/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/syncwavedev/syncwave/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>

  </p>
</div>

<picture>
    <source media="(prefers-color-scheme: dark)" srcset="./packages/www/src/assets/syncwave-window-screenshot-dark-v2.png">
    <source media="(prefers-color-scheme: light)" srcset="./packages/www/src/assets/syncwave-window-screenshot-light-v2.png">
    <img alt="Syncwave Screenshot" src="./packages/www/src/assets/syncwave-window-screenshot-light-v2.png">
</picture>

Syncwave emerged from a simple need: a project management tool that developers would actually enjoy using. Created out of frustration with overly complex alternatives, we combined the simplicity of kanban boards with the familiarity of IDEs.

Our focus remains on developer ergonomics, seamless collaboration, and performance. Built by developers for developers, Syncwave streamlines project management with a clean, distraction-free interface.

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#quick-start">Quick start</a></li>
    <li><a href="#self-hosted">Self-Hosted</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#help">Help</a></li>
    <li><a href="#alternatives">Alternatives</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## Built With

[![Svelte][Svelte.dev]][Svelte-url]
[![Node.js][Node.js]][Node-url]
[![Tailwind CSS][Tailwind-CSS]][Tailwind-CSS-url]
[![Astro][Astro]][Astro-url]
[![TypeScript][TypeScript]][TypeScript-url]

Syncwave is built with modern web technologies that prioritize performance, developer experience, and user interface quality.

## Features

- **Realtime** collaboration.
- Know what your friends are doing with board wide **activity**.
- Communicate using built-in **messaging**.
- Own your data with **self-hosting**.
- Stay productive with **keyboard shortcuts**.

## Live Demo

You can try out Syncwave in your browser at [app.syncwave.dev/demo](https://app.syncwave.dev/demo).

## Quick start

If you don't want to host Syncwave yourself, we already did it for your at [app.syncwave.dev](https://app.syncwave.dev).

## Self-Hosted

Syncwave is available as a Docker image [syncwave/syncwave](http://hub.docker.com/r/syncwave/syncwave) that you can run on your own server:

```sh
docker run -p 8080:80 -v ./syncwave-data:/data -d syncwave/syncwave
```

Open your browser at `http://localhost:8080/`

## Documentation

For full documentation, visit [syncwave.dev/docs](https://www.syncwave.dev/docs).

## Help

If you have questions or need assistance, you can:

- Ask in our [GitHub Discussions](https://github.com/syncwavedev/syncwave/discussions/new/choose)
- Join our [Discord server](https://discord.com/invite/FzQjQVFdQz) Syncwave for real-time support
- File an [issue on GitHub](https://github.com/syncwavedev/syncwave/issues) to report problems

## Alternatives

- [Plane](http://github.com/makeplane/plane/) - JIRA alternative, better suited for enterprises.
- [OpenProject](https://github.com/opf/openproject) - if Plane for some reason doesn't work for your organization.
- [Vikunja](https://github.com/go-vikunja/vikunja/tree/main) - a todo-app for personal use.
- [Planka](https://github.com/plankanban/planka) - realtime kanban board for workgroups.

## License

Syncwave is open source under the GNU Affero General Public License Version 3 (AGPLv3) or any later version. You can [find it here](./LICENSE).

## Contact

Dmitry Tilyupo - [@tilyupo](https://x.com/dmitrytilyupo) - tilyupo@gmail.com

Project Link: [https://github.com/syncwavedev/syncwave](https://github.com/syncwavedev/syncwave)

## Acknowledgments

This project wouldn't be possible without open-source technologies like:

- [Svelte](https://github.com/sveltejs/svelte) powers UI layer of the app.
- [Node.js](https://github.com/nodejs/node) powers our backend.
- [SQLite](https://github.com/sqlite/sqlite) is the default storage for our self-hosted offering.
- [FoundationDB](https://github.com/apple/foundationdb) is the storage used by [app.syncwave.dev](https://app.syncwave.dev).
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) makes the UI beautiful.
- [Astro](https://github.com/withastro/astro) is the build tool for our static (landing, docs).
- [TypeScript](https://github.com/microsoft/TypeScript) - the whole app is written in TypeScript.

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/syncwavedev/syncwave.svg?style=for-the-badge
[contributors-url]: https://github.com/syncwavedev/syncwave/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/syncwavedev/syncwave.svg?style=for-the-badge
[forks-url]: https://github.com/syncwavedev/syncwave/network/members
[stars-shield]: https://img.shields.io/github/stars/syncwavedev/syncwave.svg?style=for-the-badge
[stars-url]: https://github.com/syncwavedev/syncwave/stargazers
[issues-shield]: https://img.shields.io/github/issues/syncwavedev/syncwave.svg?style=for-the-badge
[issues-url]: https://github.com/syncwavedev/syncwave/issues
[license-shield]: https://img.shields.io/github/license/syncwavedev/syncwave.svg?style=for-the-badge
[license-url]: https://github.com/syncwavedev/syncwave/blob/master/LICENSE
[product-screenshot]: images/screenshot.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Svelte.dev]: https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00
[Svelte-url]: https://svelte.dev/
[Node.js]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[Node-url]: https://nodejs.org/
[Tailwind-CSS]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-CSS-url]: https://tailwindcss.com/
[Astro]: https://img.shields.io/badge/Astro-FF5C00?style=for-the-badge&logo=astro&logoColor=white
[Astro-url]: https://astro.build/
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
