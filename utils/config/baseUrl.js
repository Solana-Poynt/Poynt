// For production environment
export const baseURLProd = 'https://poynt-sever.onrender.com/api/v1/';

// For development environment
export const baseURLDev = 'https://poynt-sever.onrender.com/api/v1/';

//For Ad - Server System 
export const baseAdURL = 'https://poynt-ad-server.onrender.com/api/v1/'

// Choose the appropriate baseURL based on the environment
export const baseURL = process.env.NODE_ENV === 'production' ? baseURLProd : baseURLDev;
