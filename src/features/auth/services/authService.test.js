import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted so the vi.mock factories below (which run before normal imports)
// can reference these fakes without a TDZ error.
const mocks = vi.hoisted(() => ({
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    sendEmailVerification: vi.fn(),
    deleteUser: vi.fn(),
    upsertUserProfile: vi.fn(),
    setUserOffline: vi.fn(),
    setProfileCompleted: vi.fn(),
    deleteUserDoc: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
    createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
    signOut: mocks.signOut,
    updateProfile: mocks.updateProfile,
    sendEmailVerification: mocks.sendEmailVerification,
    deleteUser: mocks.deleteUser,
}));

vi.mock('@/firebase/firebase.js', () => ({ auth: {} }));

vi.mock('@/features/chat/services/userService.js', () => ({
    upsertUserProfile: mocks.upsertUserProfile,
    setUserOffline: mocks.setUserOffline,
    setProfileCompleted: mocks.setProfileCompleted,
    deleteUserDoc: mocks.deleteUserDoc,
}));

const { signUp } = await import('./authService.js');
const { auth } = await import('@/firebase/firebase.js');

beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
});

describe('signUp', () => {
    it('creates the account, sets displayName, sends verification, upserts the profile, then marks setup incomplete — in that order — and never generates a default username', async () => {
        const callOrder = [];
        const fakeUser = { uid: 'new-uid', email: 'new@user.com' };

        mocks.createUserWithEmailAndPassword.mockImplementation(async () => {
            callOrder.push('createUser');
            return { user: fakeUser };
        });
        mocks.updateProfile.mockImplementation(async () => {
            callOrder.push('updateProfile');
        });
        mocks.sendEmailVerification.mockImplementation(async () => {
            callOrder.push('sendEmailVerification');
        });
        mocks.upsertUserProfile.mockImplementation(async () => {
            callOrder.push('upsertUserProfile');
        });
        mocks.setProfileCompleted.mockImplementation(async () => {
            callOrder.push('setProfileCompleted');
        });

        const result = await signUp('New User', 'new@user.com', 'Passw0rd!');

        expect(callOrder).toEqual([
            'createUser',
            'updateProfile',
            'sendEmailVerification',
            'upsertUserProfile',
            'setProfileCompleted',
        ]);

        expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'new@user.com', 'Passw0rd!');
        expect(mocks.updateProfile).toHaveBeenCalledWith(fakeUser, { displayName: 'New User' });
        expect(mocks.sendEmailVerification).toHaveBeenCalledWith(fakeUser);

        expect(mocks.upsertUserProfile).toHaveBeenCalledWith(fakeUser);
        const upsertedUser = mocks.upsertUserProfile.mock.calls[0][0];
        expect(upsertedUser).not.toHaveProperty('username');

        expect(mocks.setProfileCompleted).toHaveBeenCalledWith('new-uid', false);

        expect(result).toBe(fakeUser);
    });

    it('maps a known Firebase Auth error code to a friendly message and does not proceed past account creation', async () => {
        mocks.createUserWithEmailAndPassword.mockRejectedValueOnce(
            Object.assign(new Error('boom'), { code: 'auth/email-already-in-use' })
        );

        await expect(signUp('New User', 'dup@user.com', 'Passw0rd!')).rejects.toThrow(
            'This email is already registered. Please log in or use another email.'
        );

        expect(mocks.updateProfile).not.toHaveBeenCalled();
        expect(mocks.upsertUserProfile).not.toHaveBeenCalled();
        expect(mocks.setProfileCompleted).not.toHaveBeenCalled();
    });
});
