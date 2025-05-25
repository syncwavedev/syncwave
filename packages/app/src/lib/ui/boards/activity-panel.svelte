<script lang="ts">
    import type {BoardTreeView} from '../../agent/view.svelte';
    import Avatar from '../components/avatar.svelte';

    interface Props {
        board: BoardTreeView;
    }

    let {board}: Props = $props();
</script>

<div class="border-divider border-l z-10 flex w-full flex-shrink-0 flex-col">
    <div class="panel-header">
        Activity (unread messages count: {board.unreadMessages.length} [{board.lastReadMessageTimestamp}])
    </div>
    <!-- Scrollable Content Section -->
    <div class="overflow-y-auto no-scrollbar flex flex-col flex-1 py-2">
        <div
            class="avatar-xs text-ink-body panel-padding-inline py-2 leading-relaxed hover:bg-material-base-hover"
        >
            <Avatar name="A" /> <span class="text-ink">Andrei</span>
            <span>moved task #124:</span>
            <span class="text-ink">"Define project scope"</span>
            <span>from</span>
            <span class="text-ink">"In Progress"</span>
            <span>to</span>
            <span class="text-ink">"Done"</span>
            <span>1 day ago</span>
        </div>
        <div
            class="avatar-xs text-ink-body panel-padding-inline py-2 leading-relaxed hover:bg-material-base-hover"
        >
            <Avatar name="A" /> <span class="text-ink">Andrei</span>
            <span>created task #124:</span>
            <span class="text-ink"
                >"Design Initial Technical Architecture and document the core
                technical approach. Select initial stack and create architecture
                diagram."</span
            >
            <span>2 day ago</span>
        </div>
        <div class="flex items-center">
            <div class="h-[1px] bg-divider flex-1"></div>
            <div
                class="text-center my-2 text-ink-body text-xs bg-material-1 px-1 py-0.5 rounded-sm"
            >
                New activities
            </div>
            <div class="h-[1px] bg-divider flex-1"></div>
        </div>
        <div
            class="avatar-xs text-ink-body panel-padding-inline py-2 leading-relaxed hover:bg-material-base-hover"
        >
            <Avatar name="A" /> <span class="text-ink">Andrei</span>
            <span>created task #124:</span>
            <span class="text-ink"
                >"Define MVP Features. Finalize the feature set for v0.1
                release. Create tickets for each feature."</span
            >
            <span>1 week ago</span>
        </div>
    </div>
</div>
