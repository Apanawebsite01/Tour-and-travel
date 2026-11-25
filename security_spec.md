# TravelGo Firestore Security Specification

## 1. Data Invariants
1. A user document at `/users/{userId}` can only be read or created/updated by the verified owner (`request.auth.uid == userId` and `request.auth.token.email_verified == true`) or verified admin.
2. Self-assigned privilege escalation is blocked: `role` on `/users/{userId}` must strictly equal `'customer'`.
3. Private PII (`email`, `phone`) is isolated in `/users/{userId}/private/info` and restricted strictly to the verified owner or verified admin.
4. `uid` and `createdAt` are immutable after creation; `updatedAt` and `createdAt` must match server `request.time`.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Unauthenticated read on `/users/u1` -> `PERMISSION_DENIED`
2. Unauthenticated write on `/users/u1` -> `PERMISSION_DENIED`
3. Unverified email write on `/users/u1` -> `PERMISSION_DENIED`
4. Cross-user read on `/users/u2/private/info` by `u1` -> `PERMISSION_DENIED`
5. Cross-user write on `/users/u2` by `u1` -> `PERMISSION_DENIED`
6. Role escalation `{ role: 'admin' }` on `/users/u1` -> `PERMISSION_DENIED`
7. Shadow ghost field `{ isAdmin: true }` on `/users/u1` -> `PERMISSION_DENIED`
8. Spoofed `uid` mismatch `{ uid: 'u2' }` on `/users/u1` -> `PERMISSION_DENIED`
9. Client-forged `createdAt` timestamp not equal to `request.time` -> `PERMISSION_DENIED`
10. Oversized `displayName` (>120 chars) -> `PERMISSION_DENIED`
11. Invalid document ID containing special characters on single-doc target -> `PERMISSION_DENIED`
12. Blanket `list` query on `/users` or `/users/{userId}/private` -> `PERMISSION_DENIED`
