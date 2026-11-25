const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');
const { signToken } = require('../utils/jwt');

class AuthService {
  /**
   * Authenticate user with username and password
   */
  async login({ username, password, clientIp }) {
    const db = getDatabase();

    const user = db.prepare(`
      SELECT id, username, password_hash, full_name, role, phone, is_active
      FROM users
      WHERE username = ?
    `).get(username.trim().toLowerCase());

    if (!user) {
      throw new Error('Invalid username or password');
    }

    if (!user.is_active) {
      throw new Error('This account has been deactivated. Please contact the administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid username or password');
    }

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    };

    const token = signToken(tokenPayload);

    // Record login in audit_logs
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, 'LOGIN', 'USER', ?, ?, ?)
      `).run(user.id, String(user.id), JSON.stringify({ username: user.username, role: user.role }), clientIp || 'local');
    } catch (auditErr) {
      console.error('[Audit Log Error]', auditErr.message);
    }

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  /**
   * Get user profile by ID
   */
  getUserById(userId) {
    const db = getDatabase();
    const user = db.prepare(`
      SELECT id, username, full_name, role, phone, is_active, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      isActive: Boolean(user.is_active),
      createdAt: user.created_at,
    };
  }

  /**
   * Change user password securely
   */
  async changePassword(userId, { currentPassword, newPassword, clientIp }) {
    const db = getDatabase();

    const user = db.prepare(`
      SELECT id, password_hash, username, role
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newHash, userId);

    // Record in audit logs
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, 'CHANGE_PASSWORD', 'USER', ?, ?, ?)
      `).run(userId, String(userId), JSON.stringify({ username: user.username }), clientIp || 'local');
    } catch (auditErr) {
      console.error('[Audit Log Error]', auditErr.message);
    }

    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Record logout in audit log
   */
  recordLogout(userId, clientIp) {
    const db = getDatabase();
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, 'LOGOUT', 'USER', ?, ?, ?)
      `).run(userId, String(userId), JSON.stringify({ action: 'User logged out' }), clientIp || 'local');
    } catch (auditErr) {
      console.error('[Audit Log Error]', auditErr.message);
    }
  }
}

module.exports = new AuthService();

