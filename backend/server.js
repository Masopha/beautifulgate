'use strict';

require('dotenv').config();
const express        = require('express');
const session        = require('express-session');
const cors           = require('cors');
const bcrypt         = require('bcryptjs');
const mongoose       = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ══════════════════════════════════════════
   MONGODB CONNECTION
══════════════════════════════════════════ */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

/* ══════════════════════════════════════════
   MONGOOSE SCHEMAS
══════════════════════════════════════════ */
const userSchema = new mongoose.Schema({
  fullName:     { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  username:     { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true },
  role:         { type: String, enum: ['visitor', 'admin'], default: 'visitor' },
  registeredAt: { type: Date, default: Date.now }
});

const visitorSchema = new mongoose.Schema({
  userId:       { type: String, required: true },
  username:     { type: String, required: true },
  fullName:     { type: String, required: true },
  email:        { type: String, required: true },
  loginAt:      { type: Date },
  logoutAt:     { type: Date },
  status:       { type: String, enum: ['online', 'offline'], default: 'offline' }
});

const messageSchema = new mongoose.Schema({
  messageId:    { type: String, required: true, unique: true },
  fullName:     { type: String, required: true },
  email:        { type: String, required: true },
  subject:      { type: String, required: true },
  message:      { type: String, required: true },
  submittedAt:  { type: Date, default: Date.now },
  read:         { type: Boolean, default: false }
});

const User    = mongoose.model('User',    userSchema);
const Visitor = mongoose.model('Visitor', visitorSchema);
const Message = mongoose.model('Message', messageSchema);

/* ══════════════════════════════════════════
   CORS
══════════════════════════════════════════ */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'https://beautifulgate-plum.vercel.app'  // ← replace with your Vercel URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy blocked this origin: ' + origin), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

/* ══════════════════════════════════════════
   MIDDLEWARE
══════════════════════════════════════════ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'beautifulgate-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   1000 * 60 * 60 * 8   // 8 hours
  }
}));

/* ══════════════════════════════════════════
   ADMIN CREDENTIALS (env or hardcoded)
══════════════════════════════════════════ */
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'beautifulgate2025';

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

/* ══════════════════════════════════════════
   AUTH ROUTES
══════════════════════════════════════════ */

// REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;

    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (!/^[a-z0-9_]{4,}$/i.test(username)) {
      return res.status(400).json({ success: false, message: 'Username must be at least 4 characters — letters, numbers, underscores only.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existingUser) {
      const field = existingUser.username === username.toLowerCase() ? 'Username' : 'Email';
      return res.status(400).json({ success: false, message: `${field} is already taken.` });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullName: fullName.trim(),
      email:    email.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
      password: hashed,
      role:     'visitor'
    });

    await newUser.save();

    // Create visitor record
    await Visitor.findOneAndUpdate(
      { userId: newUser._id.toString() },
      {
        userId:   newUser._id.toString(),
        username: newUser.username,
        fullName: newUser.fullName,
        email:    newUser.email,
        status:   'offline'
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: 'Account created successfully!' });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your credentials.' });
    }

    // Admin login
    if (role === 'admin') {
      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
      }
      req.session.user = { role: 'admin', username: 'admin', fullName: 'Administrator' };
      return res.json({ success: true, redirect: 'admin.html' });
    }

    // Visitor login
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Username not found.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    req.session.user = {
      id:       user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email:    user.email,
      role:     'visitor'
    };

    // Update visitor login time
    await Visitor.findOneAndUpdate(
      { userId: user._id.toString() },
      { loginAt: new Date(), logoutAt: null, status: 'online' },
      { upsert: true }
    );

    return res.json({ success: true, redirect: 'index.html' });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// SESSION CHECK
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false });
});

// LOGOUT
app.post('/api/logout', async (req, res) => {
  try {
    const user = req.session.user;
    if (user && user.id) {
      await Visitor.findOneAndUpdate(
        { userId: user.id },
        { logoutAt: new Date(), status: 'offline' }
      );
    }
    req.session.destroy(() => {});
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: true });
  }
});

/* ══════════════════════════════════════════
   CONTACT FORM (public — no auth needed)
══════════════════════════════════════════ */
app.post('/api/contact', async (req, res) => {
  try {
    const { fullName, email, subject, message } = req.body;
    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const msg = new Message({
      messageId: generateId('MSG'),
      fullName:  fullName.trim(),
      email:     email.toLowerCase().trim(),
      subject:   subject.trim(),
      message:   message.trim()
    });
    await msg.save();
    return res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* ══════════════════════════════════════════
   ADMIN ROUTES
══════════════════════════════════════════ */

// Get all visitors
app.get('/api/admin/visitors', requireAdmin, async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ loginAt: -1 });
    return res.json({ success: true, data: visitors });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error loading visitors.' });
  }
});

// Get all registered users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ registeredAt: -1 });
    return res.json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error loading users.' });
  }
});

// Delete a user
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Visitor.findOneAndDelete({ userId: req.params.id });
    return res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error deleting user.' });
  }
});

// Get all messages
app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const messages = await Message.find().sort({ submittedAt: -1 });
    return res.json({ success: true, data: messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error loading messages.' });
  }
});

// Mark message as read
app.patch('/api/admin/messages/:id/read', requireAdmin, async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { read: true });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error updating message.' });
  }
});

// Delete a message
app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error deleting message.' });
  }
});

// Dashboard stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [totalUsers, onlineVisitors, totalMessages, unreadMessages] = await Promise.all([
      User.countDocuments(),
      Visitor.countDocuments({ status: 'online' }),
      Message.countDocuments(),
      Message.countDocuments({ read: false })
    ]);
    return res.json({ success: true, data: { totalUsers, onlineVisitors, totalMessages, unreadMessages } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error loading stats.' });
  }
});

/* ══════════════════════════════════════════
   START SERVER
══════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`Beautiful Gate backend running on port ${PORT}`);
});
