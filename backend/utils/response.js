/**
 * 統一 API 回應格式工具函式
 */

/**
 * 成功回應
 * @param {object} res - Express response 物件
 * @param {*} data - 回傳資料
 * @param {string} message - 說明訊息
 * @param {number} statusCode - HTTP 狀態碼（預設 200）
 */
function success(res, data = null, message = "success", statusCode = 200) {
    const body = { success: true, message };
    if (data !== null) body.data = data;
    return res.status(statusCode).json(body);
}

/**
 * 錯誤回應
 * @param {object} res - Express response 物件
 * @param {string} message - 錯誤訊息
 * @param {number} statusCode - HTTP 狀態碼（預設 400）
 * @param {*} errors - 詳細錯誤（如驗證錯誤列表）
 */
function error(res, message = "error", statusCode = 400, errors = null) {
    const body = { success: false, message };
    if (errors !== null) body.errors = errors;
    return res.status(statusCode).json(body);
}

/**
 * 分頁回應
 * @param {object} res - Express response 物件
 * @param {Array} rows - 資料列表
 * @param {number} total - 總筆數
 * @param {number} page - 當前頁碼
 * @param {number} limit - 每頁筆數
 */
function paginate(res, rows, total, page, limit) {
    return res.json({
        success: true,
        data: rows,
        pagination: {
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
        },
    });
}

module.exports = { success, error, paginate };
