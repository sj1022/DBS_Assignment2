const db = require('../config/db');
const adminCode = '2021068922' // TODO: admin code(본인 학번)를 추가하세요.

const getLoginPage = (req, res) => {
    res.render('pages/login', { title: 'Login' });
};

const getRegisterPage = (req, res) => {
    res.render('pages/register', { title: 'Register' });
};

const logoutAndGetHomePage = (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }
        res.redirect('/'); //뒤에 있는 url로 이동
    });
};

const postLogin = async (req, res, next) => { //await가 들어가면 asynk를 붙여줘야 함.
    const { user_id, password } = req.body;
    try {
        /*
            TODO: username과 password를 이용해 로그인을 진행하는 코드를 작성하세요.
        */
        const [rows] = await db.query('SELECT * FROM User WHERE user_id = ? AND password = ?', [user_id, password]);
        //await를 안 붙이면 쿼리가 백그라운드에서 실행됨
        const user = rows[0];
        if (user) {
            req.session.user_id = user.user_id;
            req.session.birth_year = user.birth_year;
            req.session.role = user.role;
            req.session.overdue_cnt = user.overdue_cnt;
            res.redirect('/');            
        } else {
            const err = new Error('Invalid user ID or password');
            return next(err);
        }
    } catch (err) {
        return next(err);
    }
};

const postRegister = async (req, res, next) => {
    const { user_id, password, birth_year, role, admin_code } = req.body;
    const client = await db.pool.getConnection();

    try {
        await client.beginTransaction(); //transaction 시작
        const [existingUsers] = await client.query('SELECT * FROM User WHERE user_id = ?', [user_id]);

        if(existingUsers.length > 0) {
            const err = new Error('UserID already exists.');
            await client.commit(); //transaction 종료 -> rollback할 필요는 없음.
            return next(err);
        }
        if(role === 'admin' && admin_code !== adminCode) {
            const err = new Error('The admin code is incorrect.');
            await client.commit();
            return next(err);
        }
        await client.query('INSERT INTO User (user_id, password, birth_year, role, overdue_cnt) VALUES (?, ?, ?, ?, 0)', [user_id, password, birth_year, role]);
        await client.commit(); 
        /*
            TODO: username, password, role, admin_code + birty_year를 이용해 새로운 계정을 추가하는 코드를 작성하세요.
        */
       //register 시 transaction 처리 필요
        res.redirect('/login');
    } catch (err) {
        await client.rollback();
        return next(err);
    } finally {
        client.release();
    }
};

module.exports = {
    getLoginPage,
    getRegisterPage,
    logoutAndGetHomePage,
    postLogin,
    postRegister,
};