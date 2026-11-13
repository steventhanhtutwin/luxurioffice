require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const {
    rateLimit
} = require('express-rate-limit');
const {
    randomBytes
} = require('node:crypto');
const path = require('node:path');
const pool = require('./db');
const modules = require('./modules');
const inventory = require('./inventory-routes');
const {
    accountGuard
} = require('./profile-service');
const {
    createProfileRouter
} = require('./profile-routes');
const {
    createSettingsRouter
} = require('./settings-routes');
const {
    hashPassword,
    verifyPassword
} = require('./password');
async function start() {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('Set SESSION_SECRET in .env to at least 32 random characters.');
    await pool.query('SELECT id,position,password_version FROM users LIMIT 1');
    const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
    const store = new MySQLStore({
        clearExpired: true,
        expiration: 8 * 60 * 60 * 1000
    }, pool.pool);
    await store.onReady();
    const app = express();
    if (process.env.NODE_ENV === 'production') {
        app.set('trust proxy', 1);
    }
    app.disable('x-powered-by');
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(helmet());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.urlencoded({
        extended: false,
        limit: '64kb'
    }));
    app.use(session({
        name: 'innocreation.sid',
        secret: process.env.SESSION_SECRET,
        store,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000
        }
    }));
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store');
        req.session.csrf ||= randomBytes(32).toString('hex');
        res.locals.csrf = req.session.csrf;
        next();
    });
    app.use(accountGuard(pool));
    const csrf = (req, res, next) => {
        if (typeof req.body._csrf !== 'string' || req.body._csrf !== req.session.csrf) return res.status(403).send('Form expired. Reload the page and try again.');
        next();
    };
    const loginPage = (req, res, error = '', status = 200) => res.status(status).render('login', {
        error,
        success: req.query.password_changed === '1' ? 'Password ပြောင်းလဲပြီးပါပြီ။ Password အသစ်ဖြင့် Login ပြန်ဝင်ပါ။' : '',
        username: typeof req.body?.username === 'string' ? req.body.username : ''
    });
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: (req, res) => loginPage(req, res, 'ကြိုးစားမှုများနေပါသည်။ ၁၅ မိနစ်အကြာ ပြန်စမ်းပါ။', 429)
    });
    app.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));
    app.get('/login', (req, res) => req.session.user ? res.redirect('/dashboard') : loginPage(req, res));
    app.post('/login', limiter, csrf, async (req, res, next) => {
        try {
            const {
                username,
                password
            } = req.body;
            if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || username.length > 100 || !password || password.length > 256) return loginPage(req, res, 'Username နှင့် Password ဖြည့်ပါ။', 400);
            const [rows] = await pool.execute('SELECT id, username, display_name, password_hash, role, password_version FROM users WHERE username = ? AND is_active = 1 LIMIT 1', [username.trim()]);
            const user = rows[0];
            const valid = await verifyPassword(password, user?.password_hash || dummyHash);
            if (!user || !valid) return loginPage(req, res, 'Username သို့မဟုတ် Password မမှန်ပါ။', 401);
            req.session.regenerate(err => {
                if (err) return next(err);
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    name: user.display_name,
                    role: user.role,
                    password_version: Number(user.password_version)
                };
                req.session.csrf = randomBytes(32).toString('hex');
                req.session.save(err => err ? next(err) : res.redirect('/dashboard'));
            });
        } catch (err) {
            next(err);
        }
    });
    app.get('/dashboard', (req, res) => {
        if (!req.session.user) return res.redirect('/login');
        res.render('dashboard', {
            user: req.session.user,
            modules
        });
    });
    app.use('/profile', createProfileRouter({
        pool
    }));
    app.use('/settings', createSettingsRouter({
        pool
    }));
    app.use('/packaging',require('./packaging-routes').createPackagingRouter({pool}));
 app.use('/inventory', inventory.router);
    app.get('/modules/:id', (req, res) => {
        if (!req.session.user) return res.redirect('/login');
        const selected = modules.find(m => m.id === req.params.id);
        if (!selected) return res.status(404).send('Module not found');
        if (selected.id === 'inventory') return inventory.renderInventory(req, res);
        res.render('module', {
            user: req.session.user,
            modules,
            selected
        });
    });
    app.post('/logout', csrf, (req, res, next) => req.session.destroy(err => {
        if (err) return next(err);
        res.clearCookie('innocreation.sid');
        res.redirect('/login');
    }));
    app.use((req, res) => res.status(404).send('Page not found'));
    app.use((err, req, res, next) => {
        console.error('Request failed:', err.code || err.message);
        res.status(500).send('Server error. Please try again or check the terminal.');
    });
    const port = Number(process.env.PORT || 3000);
    //app.listen(port, '127.0.0.1', () => console.log(`Innocreation ERP: http://localhost:${port}`));
    app.listen(port, '0.0.0.0', () => {
        console.log(`Innocreation ERP running on port ${port}`);
    });
}
start().catch(async err => {
    console.error('Startup failed:', err.message);
    await pool.end();
    process.exitCode = 1;
});