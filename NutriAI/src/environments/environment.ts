export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyCf4drKIUHOWvruK-5xrs6O9dvC3KDHu0g",
    authDomain: "nutriai-f15af.firebaseapp.com",
    projectId: "nutriai-f15af",
    storageBucket: "nutriai-f15af.appspot.com",
    messagingSenderId: "288409526883",
    appId: "1:288409526883:web:c7215e020eb45ea9ed8e56"
  }
};

// Google Sheets configuration (replace with your real values)
export const sheetsConfig = {
  // API key for a Google Cloud project with the Sheets API enabled.
  // For public sheets you can use an API key; for private sheets you need OAuth credentials.
  apiKey: 'AIzaSyAoQFB-CUMuxjhfIDk36m6NOaJy6KiAQ68', // fornecida pelo usuário
  // The spreadsheet ID from the sheet URL (the long id in the URL)
  spreadsheetId: '1GRDc38wG_354vsGMdgNwNI6TMb8hTCcEWRgLL2X1caE', // from the URL you provided
  // Default range to read (can be a sheet name like 'Folha1!A1:F1000')
  defaultRange: 'Folha1!A1:Z1000'
};