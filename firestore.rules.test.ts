// Security rule payload contract tests (validated against firestore.rules & security_spec.md)
export const DIRTY_DOZEN_CASES = [
  { name: 'unauthenticated_read_profile', path: '/users/user_1', expected: 'PERMISSION_DENIED' },
  { name: 'unauthenticated_write_profile', path: '/users/user_1', expected: 'PERMISSION_DENIED' },
  { name: 'unverified_email_write', path: '/users/user_1', expected: 'PERMISSION_DENIED' },
  { name: 'cross_user_pii_read', path: '/users/user_2/private/info', expected: 'PERMISSION_DENIED' },
  { name: 'cross_user_profile_write', path: '/users/user_2', expected: 'PERMISSION_DENIED' },
  { name: 'self_assigned_admin_role', path: '/users/user_1', payload: { role: 'admin' }, expected: 'PERMISSION_DENIED' },
  { name: 'shadow_field_injection', path: '/users/user_1', payload: { isVerified: true }, expected: 'PERMISSION_DENIED' },
  { name: 'uid_spoofing', path: '/users/user_1', payload: { uid: 'user_2' }, expected: 'PERMISSION_DENIED' },
  { name: 'forged_created_at', path: '/users/user_1', payload: { createdAt: '2020-01-01T00:00:00Z' }, expected: 'PERMISSION_DENIED' },
  { name: 'oversized_display_name', path: '/users/user_1', payload: { displayName: 'x'.repeat(200) }, expected: 'PERMISSION_DENIED' },
  { name: 'invalid_doc_id_chars', path: '/users/user$bad', expected: 'PERMISSION_DENIED' },
  { name: 'blanket_list_users', path: '/users', expected: 'PERMISSION_DENIED' },
];
