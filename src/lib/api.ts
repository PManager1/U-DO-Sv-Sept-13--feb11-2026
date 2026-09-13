// const API_BASE =
// 	typeof window !== 'undefined' && window.location.hostname === 'localhost'
// 		? 'http://localhost:3030/api/v1/'
// 		: 'https://tcdlm857gf.execute-api.us-east-1.amazonaws.com/dev/api/v1/';

// export default API_BASE;


const API_BASE =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:4000/api/v1/'
        : 'http://localhost:4000/api/v1/';

export default API_BASE;