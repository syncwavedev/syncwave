import type {Component} from 'svelte';
import type {AuthManager} from './auth-manager';
import type {Agent} from './lib/agent/agent.svelte';
import BoardHistoryManager from './lib/board-history-manager';
import router from './lib/router';

import {log} from 'syncwave';
import BoardPage from './pages/board.svelte';
import LoginFailed from './pages/login-failed.svelte';
import LoginPage from './pages/login.svelte';
import Testbed from './pages/testbed.svelte';

export class PageManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _page: Component<any> | undefined = $state(undefined);
    private _pageProps: Record<string, unknown> = $state({});

    public get page() {
        return this._page;
    }

    public get pageProps() {
        return this._pageProps;
    }

    private _agent: Agent;
    private _authManager: AuthManager;

    constructor(agent: Agent, authManager: AuthManager) {
        this._agent = agent;
        this._authManager = authManager;

        this._register();
    }

    private _resetPage(): void {
        this._page = undefined;
        this._pageProps = {};
    }

    private _register(): void {
        router.on('/', () => {
            this._resetPage();

            const userId = this._authManager.getTokenInfo()?.userId;
            if (!userId) {
                throw new Error('User ID not found');
            }

            const lastBoardKey = BoardHistoryManager.last();
            if (lastBoardKey) {
                router.route(`/b/${lastBoardKey}`, {replace: true});
            } else {
                this._agent.getMe().then(me => {
                    if (me.boards.length > 0) {
                        router.route(`/b/${me.boards[0].key}`, {replace: true});
                    }
                });
            }
        });
        router.on('/demo', () => {
            this._resetPage();

            if (this._authManager.authorized) {
                if (
                    !confirm(
                        'You are already logged in. Do you want to log out and start a demo?'
                    )
                ) {
                    router.route('/', {replace: true});
                    return;
                }
            }

            this._agent.getDemoData().then(x => {
                this._authManager.logIn(x.jwt, {pageReload: false});
                router.route(`/b/${x.boardId}`);
            });
        });
        router.on('/login', () => {
            this._resetPage();

            this._page = LoginPage;
        });
        router.on('/login/failed', () => {
            this._resetPage();

            this._page = LoginFailed;
        });
        router.on('/login/callback/google', () => {
            this._resetPage();

            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const redirectUrl = urlParams.get('redirectUrl');

            if (token) {
                this._authManager.logIn(token);
            } else {
                throw Error('failed auth: token not provided');
            }

            router.route(redirectUrl || '/', {replace: true});
        });
        router.on('/b/:key', params => {
            this._resetPage();

            this._handleBoard(params.key);
        });
        router.on('/b/:key/c/:counter', params => {
            this._resetPage();

            this._handleBoard(params.key, params.counter);
        });
        router.on('/testbed', () => {
            this._resetPage();

            this._page = Testbed;
        });
        router.on('/join/:code', params => {
            const code = params.code;

            if (code === undefined) {
                router.route('/');
                return;
            }

            this._agent
                .joinViaCode(code)
                .then(key => {
                    router.route(`/b/${key}`, {replace: true});
                })
                .catch(() => {
                    alert(
                        'Unable to join the board. The invitation code may be invalid or expired. Please check the code and try again.'
                    );

                    router.route('/');
                });
        });

        router.listen();
    }

    private _handleBoard(key?: string, counter?: string) {
        const userId = this._authManager.getTokenInfo()?.userId;
        if (!userId) {
            throw new Error('User ID not found');
        }

        if (key === undefined) {
            router.route('/');
            log.warn({msg: 'board key is undefined'});
            return;
        }

        const boardPromise = this._agent.getBoardViewData(key);
        const mePromise = this._agent.getMeViewData();

        Promise.all([boardPromise, mePromise])
            .then(([[boardData, meBoardData], meData]) => {
                BoardHistoryManager.save(key);

                if (boardData.board.deletedAt) {
                    console.debug(
                        'board is deletedAt',
                        boardData.board.deletedAt
                    );
                }

                this._page = BoardPage;
                this._pageProps = {
                    boardData,
                    meBoardData,
                    meData,
                    counter: counter ? parseInt(counter) : undefined,
                };
            })
            .catch(err => {
                log.error({msg: 'Error loading board', error: err});

                BoardHistoryManager.clear();
                router.route('/');
            });
    }
}
