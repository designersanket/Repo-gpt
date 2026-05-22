const success = (res, data = null, message = 'Success', code = 'SUCCESS') => {
  return res.status(200).json({ success: true, code, message, data });
};

const failure = (res, statusCode, code, message, details = null) => {
  const payload = { success: false, code, message };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
};

module.exports = { success, failure };
