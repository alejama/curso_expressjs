const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Ocurrio un Error Inesperado';

    console.error(
        `[ERROR] ${new Date().toISOString()} - ${statusCode} - ${message}}`
    );

    if (err.stack) {
        console.error(err.stack);
    } //mostrar error de stack

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack})

    });

};

module.exports = errorHandler