export default function isAdmin(req, res, next) {
  if (!req.user.admin) {
    return res.status(403).json({ message: "Not admin" });
  }
  next();
}
