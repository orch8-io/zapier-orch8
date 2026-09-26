'use strict';

// Shared helpers for talking to the Orch8 REST API (canonical /api/v1 mount).

const apiUrl = (bundle, path) => {
  const base = String(bundle.authData.baseUrl || '').replace(/\/+$/, '');
  return `${base}/api/v1${path}`;
};

// Parse a JSON field a user typed into a Zap (object or JSON string).
const parseJsonField = (z, value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new z.errors.Error(
      `"${fieldName}" must be valid JSON: ${err.message}`,
      'InvalidJson',
      400,
    );
  }
};

const BUILTIN_SIGNALS = ['pause', 'resume', 'cancel', 'update_context'];

// Wire format of orch8's SignalType: builtins are plain strings, anything else
// is externally tagged as {"custom": "<name>"}.
const signalTypeWire = (name) => {
  const s = String(name || '').trim();
  if (!s) return s;
  if (BUILTIN_SIGNALS.includes(s)) return s;
  return { custom: s.startsWith('custom:') ? s.slice('custom:'.length) : s };
};

module.exports = { apiUrl, parseJsonField, signalTypeWire, BUILTIN_SIGNALS };
