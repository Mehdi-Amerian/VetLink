"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const checkRole = (roles) => {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        const user = req.user;
        if (!user || !allowed.includes(user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};
exports.checkRole = checkRole;
