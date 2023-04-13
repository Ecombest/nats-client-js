class RequestError extends Error {
    constructor(message, code, args = {}) {
        super();
        this.code = code;
        this.message = message;
        this.data = {
            ...args,
        };
    }
}

module.exports = RequestError;
