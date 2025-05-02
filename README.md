<h1 align="center">Syncwave</h1>

<p align="center">
  <b>Kanban board</b> that helps you build software people love.
</p>
<h4 align="center">
  <a href="https://discord.com/invite/FzQjQVFdQz">
    <img src="https://img.shields.io/badge/Chat%20on-Discord-%235766f2?style=for-the-badge" alt="Discord community" /></a>
  <a href="https://github.com/syncwavedev/syncwave/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-AGPL--v3-green?style=for-the-badge" alt="Syncwave is released under the AGPLv3 license." /></a>
  <img alt="Commit activity per month" src="https://img.shields.io/github/commit-activity/m/syncwavedev/syncwave?style=for-the-badge" />
</h4>
<h4 align="center">
  <a href="https://app.syncwave.dev/demo">Demo</a>
  &middot;
  <a href="https://www.syncwave.dev/docs">Docs</a>
  &middot;
  <a href="https://github.com/syncwavedev/syncwave/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
  &middot;
  <a href="https://github.com/syncwavedev/syncwave/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>

</h4>

<picture>
    <source media="(prefers-color-scheme: dark)" srcset="./packages/www/src/assets/syncwave-window-screenshot-dark-v2.png">
    <source media="(prefers-color-scheme: light)" srcset="./packages/www/src/assets/syncwave-window-screenshot-light-v2.png">
    <img alt="Syncwave Screenshot" src="./packages/www/src/assets/syncwave-window-screenshot-light-v2.png">
</picture>

We built Syncwave because we were tired of project management tools that get in your way. As developers ourselves, we wanted something that feels familiar (like our IDEs) but keeps things simple with a kanban approach. No unnecessary features, no clutter—just a fast, collaborative tool that lets you focus on building great software. We've stripped away all the distractions to create something we actually enjoy using ourselves.

<details>
  <summary>Table of Contents</summary>
  <ol>
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
docker run \
  -it -p 8080:80 --rm \
  -e BASE_URL=http://localhost:8080 \
  -e JWT_SECRET=replace-with-long-unguessable-string \
  -v syncwave-data:/data \
  syncwave/syncwave
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

Dmitry Tilyupo - tilyupo@gmail.com

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
