// Shared display metadata for the alert `type` field: "unknown_entry" |
// "face_hidden" | "expired_membership".
export const ALERT_TYPE_META = {
  unknown_entry: { label: 'Unknown Entry', badgeClass: 'badge-err', cardClass: '' },
  face_hidden: { label: 'Face Hidden', badgeClass: 'badge-warn', cardClass: 'hidden' },
  expired_membership: { label: 'Expired Membership', badgeClass: 'badge-blue', cardClass: 'expired' }
};

export const alertMeta = (type) =>
  ALERT_TYPE_META[type] || { label: type || 'Unknown', badgeClass: 'badge-muted', cardClass: '' };
