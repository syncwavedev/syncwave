interface ImportMetaEnv {
	readonly PUBLIC_STAGE: string;
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
