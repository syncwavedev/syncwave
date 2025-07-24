import type {MemberRole} from 'syncwave';
import type {MemberView} from '../agent/view.svelte';

export type Permission = 'write:card' | 'write:board' | 'delete:board';

const PERMISSIONS: Map<MemberRole, Permission[]> = new Map([
    ['owner', ['write:card', 'write:board', 'delete:board']],
    ['admin', ['write:card', 'write:board']],
    ['writer', ['write:card']],
    ['reader', []],
]);

export class PermissionManager {
    private member: MemberView | null = null;

    setMember(member: MemberView) {
        this.member = member;
    }

    getRole(): MemberRole {
        if (!this.member) {
            throw Error('cannot get role: membem is not set up');
        }
        return this.member.role;
    }

    hasRole(role: MemberRole): boolean {
        return this.getRole() == role;
    }

    getPermissions(): Permission[] {
        if (!this.member) {
            throw Error('cannot get permission: membem is not set up');
        }

        return PERMISSIONS.get(this.member.role) || [];
    }

    hasPermission(permission: Permission): boolean {
        return this.getPermissions().includes(permission);
    }
}

const manager = new PermissionManager();
export default manager;
