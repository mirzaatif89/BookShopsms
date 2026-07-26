export async function writeAudit(conn, { userId, action, entityType, entityId, previousValue = null, newValue = null, ipAddress = null }) {
  await conn.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, previous_value, new_value, ip_address)
     VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?)`,
    [
      userId || null,
      action,
      entityType,
      entityId ? String(entityId) : null,
      JSON.stringify(previousValue),
      JSON.stringify(newValue),
      ipAddress
    ]
  );
}
