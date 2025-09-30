import { verifyToken } from "./tokens.mjs";

export function authorization(...role) {
  return function (req, res, next) {
    try {
      // Check if authorization header exists
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "Authorization header is required" });
      }

      // Check if authorization header is properly formatted
      if (!req.headers.authorization.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Authorization header must be Bearer token" });
      }

      const token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Token is required" });
      }

      const user = verifyToken(token);
      if (!user) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      if (!role.includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.log("Authorization error:", error);
      return res.status(401).json({ message: "Invalid token" });
    }
  };
}
