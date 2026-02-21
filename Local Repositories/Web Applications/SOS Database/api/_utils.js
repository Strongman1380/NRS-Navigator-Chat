export function json(res, status, body) {
  res.status(status).json(body);
}

export function methodNotAllowed(res) {
  res.status(405).json({ error: "Method not allowed" });
}
