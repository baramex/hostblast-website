class Auth {
    static requiresAuthentification(req, res, next) {
        next();
    }

    static isAuthenticated(req, res, next) {
        next();
    }
}


class CustomError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

module.exports = { Auth, CustomError };