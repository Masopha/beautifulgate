// config.js — API URL manager for Beautiful Gate Lesotho
(function () {
  var DEV  = 'http://localhost:3000';
  var PROD = 'https://YOUR-BACKEND.onrender.com'; // replace with your Render URL

  window.API_BASE_URL = (
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ) ? DEV : PROD;
})();