const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        // check if the process gets resolved and if not then we will call the next middleware with error (indicate there was an error)
        Promise.resolve(requestHandler(req, res, next)).catch((err) =>
            next(err)
        );
    };
};

export { asyncHandler };

// const asyncHandler = (fn) => {async () => {}}

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

// export { asyncHandler };
