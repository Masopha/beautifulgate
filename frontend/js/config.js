// config.js — API URL manager for Beautiful Gate Lesotho
(function () {
  var DEV  = 'http://localhost:3000';
  var PROD = 'https://beautifulgate-backend.onrender.com'; // replace with your Render URL

  window.API_BASE_URL = (
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ) ? DEV : PROD;
  // Use DEV when running locally (Live Server, file://, or localhost)
  var isLocal = (
    location.hostname === 'localhost'  ||
    location.hostname === '127.0.0.1' ||
    location.hostname === ''           // file:// protocol
  );

  window.API_BASE_URL = isLocal ? DEV : PROD;

  // Helpful log so you can confirm which URL is being used
  console.log('[BGL] API_BASE_URL:', window.API_BASE_URL);  
})();
