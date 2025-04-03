interface ImportMetaEnv {
    readonly VITE_PUBLIC_STAGE: string;
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
