const { getDatabase } = require('../config/database');
const { generateNextReceiptNumber } = require('../utils/identifiers');

class BillingService {
  /**
   * Record a consultation payment and generate an official clinic receipt
   */
  createPayment(data, userId, clientIp) {
    const db = getDatabase();

    // 1. Verify visit exists
    const visit = db.prepare(`
      SELECT v.id, v.visit_number, v.patient_id, v.token_number, v.visit_date,
             p.uhid, p.full_name, p.mobile_number
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE v.id = ?
    `).get(data.visitId);

    if (!visit) {
      const err = new Error('Visit record not found');
      err.statusCode = 404;
      throw err;
    }

    const patientId = visit.patient_id;
    const amountCharged = Number(data.amountCharged);
    const amountPaid = Number(data.amountPaid);

    if (isNaN(amountCharged) || amountCharged < 0) {
      const err = new Error('Invalid consultation fee charged');
      err.statusCode = 400;
      throw err;
    }

    if (isNaN(amountPaid) || amountPaid < 0) {
      const err = new Error('Invalid amount paid');
      err.statusCode = 400;
      throw err;
    }

    // Determine payment status
    let paymentStatus = 'PAID';
    if (amountPaid === 0) {
      paymentStatus = 'PENDING';
    } else if (amountPaid < amountCharged) {
      paymentStatus = 'PARTIAL';
    }

    const receiptNumber = generateNextReceiptNumber();
    const paymentDate = data.paymentDate || new Date().toISOString().split('T')[0];

    const result = db.transaction(() => {
      // Insert into payments
      const stmt = db.prepare(`
        INSERT INTO payments (
          receipt_number, visit_id, patient_id,
          amount_charged, amount_paid, payment_mode, payment_status,
          transaction_reference, collected_by, notes,
          payment_date, created_at
        ) VALUES (
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, datetime('now', 'localtime')
        )
      `);

      const info = stmt.run(
        receiptNumber,
        visit.id,
        patientId,
        amountCharged,
        amountPaid,
        data.paymentMode || 'CASH',
        paymentStatus,
        data.transactionReference || null,
        userId || null,
        data.notes || null,
        paymentDate
      );

      const paymentId = info.lastInsertRowid;

      // Audit log
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, 'CREATE_PAYMENT', 'PAYMENT', ?, ?, ?)
        `).run(
          userId || null,
          String(paymentId),
          JSON.stringify({
            receiptNumber,
            visitNumber: visit.visit_number,
            patientName: visit.full_name,
            amountCharged,
            amountPaid,
            paymentMode: data.paymentMode,
            paymentStatus,
          }),
          clientIp || '127.0.0.1'
        );
      } catch (auditErr) {
        // ignore audit failure
      }

      return paymentId;
    })();

    return this.getPaymentById(result);
  }

  /**
   * Retrieve full payment details by payment ID
   */
  getPaymentById(paymentId) {
    const db = getDatabase();

    const row = db.prepare(`
      SELECT 
        pm.id, pm.receipt_number, pm.visit_id, pm.patient_id,
        pm.amount_charged, pm.amount_paid, pm.payment_mode, pm.payment_status,
        pm.transaction_reference, pm.collected_by, pm.notes, pm.payment_date, pm.created_at,
        p.uhid, p.full_name as patient_name, p.age, p.gender, p.mobile_number, p.address,
        v.visit_number, v.token_number, v.visit_date,
        u.full_name as collected_by_name
      FROM payments pm
      JOIN patients p ON p.id = pm.patient_id
      JOIN visits v ON v.id = pm.visit_id
      LEFT JOIN users u ON u.id = pm.collected_by
      WHERE pm.id = ?
    `).get(paymentId);

    if (!row) {
      const err = new Error('Payment record not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: row.id,
      receiptNumber: row.receipt_number,
      visitId: row.visit_id,
      visitNumber: row.visit_number,
      tokenNumber: row.token_number,
      visitDate: row.visit_date,
      patientId: row.patient_id,
      uhid: row.uhid,
      patientName: row.patient_name,
      age: row.age,
      gender: row.gender,
      mobileNumber: row.mobile_number,
      address: row.address,
      amountCharged: row.amount_charged,
      amountPaid: row.amount_paid,
      balancePending: Math.max(0, row.amount_charged - row.amount_paid),
      paymentMode: row.payment_mode,
      paymentStatus: row.payment_status,
      transactionReference: row.transaction_reference,
      collectedBy: row.collected_by_name || 'Clinic Reception',
      notes: row.notes,
      paymentDate: row.payment_date,
      createdAt: row.created_at,
    };
  }

  /**
   * Get payments breakdown for a given visit
   */
  getPaymentsByVisit(visitId) {
    const db = getDatabase();

    const payments = db.prepare(`
      SELECT 
        pm.id, pm.receipt_number, pm.amount_charged, pm.amount_paid,
        pm.payment_mode, pm.payment_status, pm.transaction_reference,
        pm.notes, pm.payment_date, pm.created_at,
        u.full_name as collected_by_name
      FROM payments pm
      LEFT JOIN users u ON u.id = pm.collected_by
      WHERE pm.visit_id = ?
      ORDER BY pm.id DESC
    `).all(visitId);

    let totalCharged = 0;
    let totalPaid = 0;

    for (const p of payments) {
      totalCharged += p.amount_charged;
      totalPaid += p.amount_paid;
    }

    const balancePending = Math.max(0, totalCharged - totalPaid);
    let overallStatus = 'PENDING';
    if (totalPaid >= totalCharged && totalCharged > 0) {
      overallStatus = 'PAID';
    } else if (totalPaid > 0) {
      overallStatus = 'PARTIAL';
    }

    return {
      visitId: Number(visitId),
      totalCharged,
      totalPaid,
      balancePending,
      overallStatus,
      payments: payments.map(p => ({
        id: p.id,
        receiptNumber: p.receipt_number,
        amountCharged: p.amount_charged,
        amountPaid: p.amount_paid,
        balancePending: Math.max(0, p.amount_charged - p.amount_paid),
        paymentMode: p.payment_mode,
        paymentStatus: p.payment_status,
        transactionReference: p.transaction_reference,
        collectedBy: p.collected_by_name || 'Clinic Reception',
        notes: p.notes,
        paymentDate: p.payment_date,
        createdAt: p.created_at,
      })),
    };
  }

  /**
   * Get printable receipt layout for Sanjeevani Clinic
   */
  getPrintableReceipt(paymentId) {
    const payment = this.getPaymentById(paymentId);

    return {
      clinic: {
        name: 'SANJEEVANI CLINIC',
        tagline: 'Family Health Care & General Medical Consultation',
        doctorName: 'Dr. Sharad Motugade',
        qualifications: 'M.B.B.S., M.D. (Physician & Consultant)',
        regNo: 'MCI-1998-54321',
        phone: '+91 98765 43210',
        address: 'Main Road, Clinic Complex, Opp. Civil Hospital',
      },
      receipt: {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate,
        createdAt: payment.createdAt,
        paymentMode: payment.paymentMode,
        transactionReference: payment.transactionReference,
        paymentStatus: payment.paymentStatus,
        notes: payment.notes,
        collectedBy: payment.collectedBy,
      },
      patient: {
        id: payment.patientId,
        uhid: payment.uhid,
        fullName: payment.patientName,
        age: payment.age,
        gender: payment.gender,
        mobileNumber: payment.mobileNumber,
        address: payment.address,
      },
      visit: {
        id: payment.visitId,
        visitNumber: payment.visitNumber,
        tokenNumber: payment.tokenNumber,
        visitDate: payment.visitDate,
      },
      billing: {
        amountCharged: payment.amountCharged,
        amountPaid: payment.amountPaid,
        balancePending: payment.balancePending,
        amountInWords: this.numberToWords(payment.amountPaid),
      },
      printedAt: new Date().toISOString(),
    };
  }

  /**
   * Search and filter payment receipts
   */
  searchPayments({ query, paymentMode, paymentStatus, startDate, endDate, page = 1, limit = 20 }) {
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      whereClause += ` AND (
        pm.receipt_number LIKE ? OR
        p.full_name LIKE ? OR
        p.uhid LIKE ? OR
        p.mobile_number LIKE ? OR
        v.visit_number LIKE ? OR
        pm.transaction_reference LIKE ?
      )`;
      params.push(q, q, q, q, q, q);
    }

    if (paymentMode) {
      whereClause += ' AND pm.payment_mode = ?';
      params.push(paymentMode);
    }

    if (paymentStatus) {
      whereClause += ' AND pm.payment_status = ?';
      params.push(paymentStatus);
    }

    if (startDate) {
      whereClause += ' AND date(pm.payment_date) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND date(pm.payment_date) <= ?';
      params.push(endDate);
    }

    const countSql = `
      SELECT COUNT(*) as total
      FROM payments pm
      JOIN patients p ON p.id = pm.patient_id
      JOIN visits v ON v.id = pm.visit_id
      ${whereClause}
    `;
    const total = db.prepare(countSql).get(...params).total;

    const listSql = `
      SELECT 
        pm.id, pm.receipt_number, pm.amount_charged, pm.amount_paid,
        pm.payment_mode, pm.payment_status, pm.transaction_reference,
        pm.payment_date, pm.created_at,
        p.id as patient_id, p.uhid, p.full_name as patient_name, p.age, p.gender, p.mobile_number,
        v.id as visit_id, v.visit_number, v.token_number,
        u.full_name as collected_by_name
      FROM payments pm
      JOIN patients p ON p.id = pm.patient_id
      JOIN visits v ON v.id = pm.visit_id
      LEFT JOIN users u ON u.id = pm.collected_by
      ${whereClause}
      ORDER BY pm.id DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(listSql).all(...params, Number(limit), offset);

    return {
      payments: rows.map(r => ({
        id: r.id,
        receiptNumber: r.receipt_number,
        visitId: r.visit_id,
        visitNumber: r.visit_number,
        tokenNumber: r.token_number,
        patientId: r.patient_id,
        uhid: r.uhid,
        patientName: r.patient_name,
        age: r.age,
        gender: r.gender,
        mobileNumber: r.mobile_number,
        amountCharged: r.amount_charged,
        amountPaid: r.amount_paid,
        balancePending: Math.max(0, r.amount_charged - r.amount_paid),
        paymentMode: r.payment_mode,
        paymentStatus: r.payment_status,
        transactionReference: r.transaction_reference,
        collectedBy: r.collected_by_name || 'Clinic Reception',
        paymentDate: r.payment_date,
        createdAt: r.created_at,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Daily and monthly collections breakdown for clinic accounting
   */
  getCollectionsSummary(dateStr) {
    const db = getDatabase();
    const today = dateStr || new Date().toISOString().split('T')[0];
    const targetMonth = today.slice(0, 7); // YYYY-MM

    // Today's summary
    const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as receipt_count,
        COALESCE(SUM(amount_charged), 0) as total_charged,
        COALESCE(SUM(amount_paid), 0) as total_collected,
        COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount_paid ELSE 0 END), 0) as cash_collected,
        COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount_paid ELSE 0 END), 0) as upi_collected,
        COALESCE(SUM(CASE WHEN payment_mode NOT IN ('CASH', 'UPI') THEN amount_paid ELSE 0 END), 0) as other_collected,
        COALESCE(SUM(CASE WHEN amount_charged > amount_paid THEN (amount_charged - amount_paid) ELSE 0 END), 0) as pending_dues,
        COUNT(CASE WHEN payment_status != 'PAID' THEN 1 END) as pending_receipt_count
      FROM payments
      WHERE date(payment_date) = ?
    `).get(today);

    // Month's summary
    const monthStats = db.prepare(`
      SELECT 
        COUNT(*) as receipt_count,
        COALESCE(SUM(amount_charged), 0) as total_charged,
        COALESCE(SUM(amount_paid), 0) as total_collected,
        COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount_paid ELSE 0 END), 0) as cash_collected,
        COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount_paid ELSE 0 END), 0) as upi_collected,
        COALESCE(SUM(CASE WHEN amount_charged > amount_paid THEN (amount_charged - amount_paid) ELSE 0 END), 0) as pending_dues
      FROM payments
      WHERE strftime('%Y-%m', payment_date) = ?
    `).get(targetMonth);

    // Lifetime pending receivables across all visits
    const lifetimePending = db.prepare(`
      SELECT 
        COALESCE(SUM(amount_charged - amount_paid), 0) as total_pending_receivables,
        COUNT(*) as pending_count
      FROM payments
      WHERE amount_charged > amount_paid
    `).get();

    return {
      date: today,
      month: targetMonth,
      today: {
        receiptCount: todayStats.receipt_count,
        totalCharged: todayStats.total_charged,
        totalCollected: todayStats.total_collected,
        cashCollected: todayStats.cash_collected,
        upiCollected: todayStats.upi_collected,
        otherCollected: todayStats.other_collected,
        pendingDues: todayStats.pending_dues,
        pendingCount: todayStats.pending_receipt_count,
      },
      monthToDate: {
        receiptCount: monthStats.receipt_count,
        totalCharged: monthStats.total_charged,
        totalCollected: monthStats.total_collected,
        cashCollected: monthStats.cash_collected,
        upiCollected: monthStats.upi_collected,
        pendingDues: monthStats.pending_dues,
      },
      receivables: {
        totalOutstanding: lifetimePending.total_pending_receivables,
        outstandingCount: lifetimePending.pending_count,
      },
    };
  }

  /**
   * Helper: Convert INR amount to English words for receipt
   */
  numberToWords(amount) {
    if (amount === 0) return 'Zero Rupees Only';
    const num = Math.floor(amount);
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertLessThanOneThousand(n) {
      if (n >= 100) {
        return ones[Math.floor(n / 100)] + ' Hundred ' + convertLessThanOneThousand(n % 100);
      }
      if (n >= 20) {
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      }
      return ones[n];
    }

    let words = '';
    let remaining = num;

    if (remaining >= 100000) { // Lakhs
      words += convertLessThanOneThousand(Math.floor(remaining / 100000)) + ' Lakh ';
      remaining %= 100000;
    }

    if (remaining >= 1000) { // Thousands
      words += convertLessThanOneThousand(Math.floor(remaining / 1000)) + ' Thousand ';
      remaining %= 1000;
    }

    if (remaining > 0) {
      words += convertLessThanOneThousand(remaining);
    }

    return words.trim() + ' Rupees Only';
  }
}

module.exports = new BillingService();
