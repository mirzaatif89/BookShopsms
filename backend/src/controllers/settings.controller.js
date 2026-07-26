import { transaction } from '../config/db.js';
import { getSettings, saveSettings } from '../services/settings.service.js';
import { writeAudit } from '../services/audit.service.js';

export async function readSettings(req, res, next) {
  try {
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const result = await transaction(async (conn) => {
      const previous = await getSettings(conn);
      const merged = { ...previous };
      for (const [key, value] of Object.entries(req.body)) {
        merged[key] = { ...(previous[key] || {}), ...(value || {}) };
      }
      await saveSettings(merged, conn);
      await writeAudit(conn, {
        userId: req.user.id,
        action: 'settings.update',
        entityType: 'settings',
        entityId: 'global',
        previousValue: previous,
        newValue: merged,
        ipAddress: req.ip
      });
      return merged;
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
