import { toast } from "sonner";

/**
 * Safely invoke LLM with error handling and user feedback
 * @param {Function} invokeFn - The InvokeLLM function from base44
 * @param {Object} params - The parameters to pass to InvokeLLM
 * @param {Object} options - Additional options
 * @param {string} options.errorMsg - Custom error message to show user
 * @param {Function} options.onError - Custom error handler
 * @param {boolean} options.showToast - Whether to show toast on error (default: true)
 * @returns {Promise<Object|null>} - The result or null on error
 */
export async function safeInvokeLLM(invokeFn, params, options = {}) {
    const { errorMsg = "Erreur lors de la generation IA. Veuillez reessayer.", onError, showToast = true } = options;

    try {
        const result = await invokeFn(params);
        return result;
    } catch (error) {
        console.error("LLM invocation error:", error);

        if (onError) {
            onError(error);
        }

        if (showToast) {
            toast.error(errorMsg);
        }

        return null;
    }
}

/**
 * Wrapper for base44 InvokeLLM with caching support
 * @param {Object} base44 - The base44 client
 * @param {Object} params - The parameters for InvokeLLM
 * @param {Object} options - Options for safe invocation
 * @returns {Promise<Object|null>}
 */
export async function invokeLLM(base44, params, options = {}) {
    return safeInvokeLLM(
        (p) => base44.integrations.Core.InvokeLLM(p),
        params,
        options
    );
}
