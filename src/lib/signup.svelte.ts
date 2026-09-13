export const signup = $state<{ fullName: string; phone: string }>({ fullName: '', phone: '' });

export function saveStep1(data: { fullName: string; phone: string }) {
	signup.fullName = data.fullName;
	signup.phone = data.phone;
}

export function clearStored() {
	signup.fullName = '';
	signup.phone = '';
}
