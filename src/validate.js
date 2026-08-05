'use strict';
/** Canadian-format input validation. Dependency free so it is trivially testable. */

// First letter excludes D F I O Q U W Z; later letters exclude D F I O Q U.
const POSTAL_RE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
// NANP: area code and exchange cannot start with 0 or 1.
const PHONE_RE = /^(\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?([2-9]\d{2})[\s.-]?(\d{4})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PROVINCE_CODES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

function normalizePostalCode(v) {
  const s = String(v || '').toUpperCase().replace(/[\s-]/g, '');
  return s.length === 6 ? `${s.slice(0, 3)} ${s.slice(3)}` : s;
}
function isValidPostalCode(v) { return POSTAL_RE.test(String(v || '').trim()); }

function normalizePhone(v) {
  const d = String(v || '').replace(/\D/g, '').replace(/^1/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(v || '');
}
function isValidPhone(v) { return PHONE_RE.test(String(v || '').trim()); }
function isValidEmail(v) { return EMAIL_RE.test(String(v || '').trim()); }
function isValidProvince(v) { return PROVINCE_CODES.includes(String(v || '').toUpperCase()); }

/** VIN: 17 chars, no I/O/Q. */
function isValidVin(v) { return /^[A-HJ-NPR-Z0-9]{17}$/i.test(String(v || '').trim()); }

/**
 * Validate a customer contact payload. Returns { valid, errors, value }.
 * errors is a field -> message map so the UI can render inline messages.
 */
function validateCustomer(input) {
  const v = input || {};
  const errors = {};
  const firstName = String(v.firstName || '').trim();
  const lastName = String(v.lastName || '').trim();
  const email = String(v.email || '').trim();
  const phone = String(v.phone || '').trim();
  const postalCode = String(v.postalCode || '').trim();
  const province = String(v.province || '').trim().toUpperCase();

  if (firstName.length < 2) errors.firstName = 'First name must be at least 2 characters';
  if (lastName.length < 2) errors.lastName = 'Last name must be at least 2 characters';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
  if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit Canadian phone number';
  if (!isValidPostalCode(postalCode)) errors.postalCode = 'Enter a valid postal code, e.g. M5V 2T6';
  if (!isValidProvince(province)) errors.province = 'Select a province or territory';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      firstName, lastName, email,
      phone: normalizePhone(phone),
      postalCode: normalizePostalCode(postalCode),
      province
    }
  };
}

module.exports = {
  POSTAL_RE, PHONE_RE, EMAIL_RE, PROVINCE_CODES,
  normalizePostalCode, isValidPostalCode,
  normalizePhone, isValidPhone,
  isValidEmail, isValidProvince, isValidVin,
  validateCustomer
};
