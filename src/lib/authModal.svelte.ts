export const authModal = $state({ open: false, signUp: false, notice: '' });

export function openSignIn(notice = '') {
	authModal.open = true;
	authModal.signUp = false;
	authModal.notice = notice;
}

export function closeSignIn() {
	authModal.open = false;
	authModal.notice = '';
}

export function openSignUp() {
	authModal.signUp = true;
	authModal.open = false;
}

export function closeSignUp() {
	authModal.signUp = false;
}
