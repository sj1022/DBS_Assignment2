const isAuthenticated = (req, res, next) => {
    if (req.session.user_id) {
        next();
    } else {
        res.redirect('/login');
    }
};

const isAdmin = (req, res, next) => {
    if (req.session.user_id && req.session.role === 'admin') {
        next();
    } else {
        const err = new Error('Access Denied: Admins only.');
        err.status = 403;
        next(err);
    }
};

module.exports = {
    isAuthenticated,
    isAdmin
};