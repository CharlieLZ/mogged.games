import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectFile = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('user model module boundary', () => {
  it('keeps auth-only current user helpers out of the user data model', () => {
    const userModelSource = projectFile('src/shared/models/user.ts');
    const currentUserSource = projectFile('src/shared/services/current-user.ts');

    expect(userModelSource).not.toMatch(/@\/core\/auth|next\/headers/);
    expect(userModelSource).not.toMatch(/export async function get(?:Sign)?UserInfo/);
    expect(userModelSource).not.toMatch(/export async function getSignUser/);

    expect(currentUserSource).toMatch(/@\/core\/auth/);
    expect(currentUserSource).toMatch(/next\/headers/);
    expect(currentUserSource).toMatch(/export async function getUserInfo/);
    expect(currentUserSource).toMatch(/export async function getSignUser/);
  });
});
