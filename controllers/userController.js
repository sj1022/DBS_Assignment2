const db = require('../config/db');

const getUsersPage = async (req, res, next) => {
    const { searchBy, query } = req.query;

    try {
        /*
            TODO: 검색어에 맞춰 유저 목록을 출력하는 페이지를 렌더링하는 코드를 작성하세요.
        */
        let sql = 
            `SELECT user_id, role, birth_year, overdue_cnt 
            FROM User
            LEFT JOIN Blacklist b ON (b.user_id = User.user_id AND b.due_date > CURDATE()`;
        let params = [];

        const columns = ['user_id', 'role', 'birth_year', 'overdue_cnt']; //보안을 위해 searchBy 제한

        if (searchBy && query && query.trim() !== '') { //공백으로 search 제한
            if (columns.includes(searchBy)) {
                //overdue_cnt와 birth_year는 전체 일치
                if (searchBy === 'overdue_cnt') {
                    sql += ' WHERE overdue_cnt = ?';
                    params.push(parseInt(query));
                }
                else if (searchBy === 'birth_year') {
                    sql += ' WHERE birth_year = ?'
                    params.push(parseInt(query));
                } 
                else {
                    // 편의를 위해 user_id와 role은 부분 일치
                    sql += ` WHERE ${searchBy} LIKE ?`;
                    params.push(`%${query}%`);
                }
            }
        }

        if(searchBy && columns.includes(searchBy)) {
            sql += ` ORDER BY ${searchBy}`;
        } else {
            sql += ' ORDER BY user_id'
        }
        console.log('SQL:', sql);
        console.log('Params:', params);

        const [users] = await db.query(sql, params);

        res.render('pages/users', {
            title: 'User Management',
            users: users,
            searchBy,
            query
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getUsersPage
};