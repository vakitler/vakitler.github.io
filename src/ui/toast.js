export function createToast({ getEl }) {
    let toastTimeoutId = null;

    function showMessage(msg) {
        const toast = getEl('error-toast');
        toast.innerText = msg;
        toast.classList.remove('hidden');

        if (toastTimeoutId) {
            clearTimeout(toastTimeoutId);
        }

        toastTimeoutId = setTimeout(() => {
            toast.classList.add('hidden');
            toastTimeoutId = null;
        }, 3000);
    }

    return { showMessage };
}
