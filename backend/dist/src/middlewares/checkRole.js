"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const checkRole = (requiredRole) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || user.role !== requiredRole) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};
exports.checkRole = checkRole;
