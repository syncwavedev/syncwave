# SyncWave - Kanban Board for Developers

SyncWave is a communications tool that lets you build great software with your friends.

## Features

- **Realtime** collaboration.
- Know what your friends are doing with board wide **activity**.
- Communicate using built-in **messaging**.
- Own your data with **self-hosting**.
- Stay productive with **keyboard shortcuts**.

## Live Demo

## Self-Hosted

SyncWave is available as a Docker image [syncwave/syncwave](http://hub.docker.com/r/syncwave/syncwave) that you can run on your own server:

```sh
docker run -p 8080:80 -v ./syncwave-data:/data -d syncwave/syncwave
```

Open your browser at `http://localhost:8080/`

## Cloud

If you don't want to host SyncWave yourself, we already did it for your at [app.syncwave.dev](https://app.syncwave.dev).

## Documentation

For full documentation, visit [syncwave.dev/docs](https://www.syncwave.dev/docs).

## Alternatives

- [Plane](http://github.com/makeplane/plane/) - JIRA alternative, better suited for enterprises.
- [OpenProject](https://github.com/opf/openproject) - if Plane for some reason doesn't work for your organization.
- [Vikunja](https://github.com/go-vikunja/vikunja/tree/main) - a todo-app for personal use.
- [Planka](https://github.com/plankanban/planka) - realtime kanban board for workgroups.

## License

SyncWave is open source under the GNU Affero General Public License Version 3 (AGPLv3) or any later version. You can [find it here](./LICENSE).

## Acknowledgements

This project wouldn't be possible without open-source technologies like:

- [Svelte](https://github.com/sveltejs/svelte) powers UI layer of the app.
- [Node.js](https://github.com/nodejs/node) powers our backend.
- [SQLite](https://github.com/sqlite/sqlite) is the default storage for our self-hosted offering.
- [FoundationDB](https://github.com/apple/foundationdb) is the storage used by [app.syncwave.dev](https://app.syncwave.dev).
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) makes the UI beautiful.
- [Astro](https://github.com/withastro/astro) is the build tool for our static (landing, docs).
- [TypeScript](https://github.com/microsoft/TypeScript) - the whole app is written in TypeScript.
