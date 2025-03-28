# Syncwave server

This is the server component of Syncwave, which handles the backend logic, including user authentication, data synchronization, and API endpoints.

## Scripts

Build docker image:

```sh
docker build --build-arg STAGE=dev --platform linux/amd64 -t syncwave/syncwave -f ./Dockerfile ../..
```
