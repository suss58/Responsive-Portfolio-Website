const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the 'public' directory

const url = 'mongodb://localhost:27017'; // MongoDB connection URL

const transporter = nodemailer.createTransport({
  // Configure your email delivery service or SMTP details
  // Example: Gmail SMTP
  service: 'gmail',
  auth: {
    user: 'starktony13244@gmail.com',
    pass: 'aitkhngdsfmsdush',
  }
});

const oauth2Client = new google.auth.OAuth2(
  '800555051383-c44aoh01jrdtm7u36diu4q5autkn3t8t.apps.googleusercontent.com',
  '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',
  'http://127.0.0.1:5500/auth/google/callback'
);

const scopes = ['https://www.googleapis.com/auth/userinfo.email'];

// Regular expression pattern for email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Google OAuth login route
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
  res.redirect(authUrl);
});

// Google OAuth callback route
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.redirect('/form');
  } catch (error) {
    console.error('Failed to authenticate with Google:', error);
    res.status(500).send('Failed to authenticate with Google.');
  }
});

// Protected form route
app.get('/form', (req, res) => {
  if (!oauth2Client.credentials) {
    return res.status(401).send('Unauthorized');
  }

  res.sendFile(__dirname + '/index.html');
});


// Form submission route
app.post('/submit', async (req, res) => {
  if (!oauth2Client.credentials) {
    return res.status(401).send('Unauthorized');
  }

  const email = req.body.Email;

  // Validate email format
  if (!emailRegex.test(email)) {
    return res.status(400).send('Invalid email format.');
  }

  // Save the form data to MongoDB
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db('portfolio'); // Replace with your database name
    const collection = db.collection('user message'); // Replace with your collection name
    await collection.insertOne(req.body);
    console.log('Data saved to MongoDB.');

    // Send email notification
    const mailOptions = {
      from: 'starktony13244@gmail.com',
      to: email,
      subject: 'Form Submission Confirmation',
      text: 'Thank you for submitting the form!',
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Failed to send email:', error);
        // Display error message as pop-up on the same page
        res.send('<script>alert("Failed to send email."); window.location.href = "/index.html#";</script>');
      } else {
        console.log('Email sent:', info.response);
        // Display success message as pop-up on the same page
        res.send('<script>alert("Form submitted successfully."); window.location.href = "/index.html#";</script>');
      }
    });
  } catch (error) {
    console.error('Failed to save data to MongoDB:', error);
    // Display error message as pop-up on the same page
    res.send('<script>alert("Failed to save data."); window.location.href = "/index.html#";</script>');
  } finally {
    await client.close();
  }
});

app.listen(5500, () => {
  console.log('Server is running on port 5500');
});
