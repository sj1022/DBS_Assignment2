const db = require('../config/db');

const getBorrowingsPage = async (req, res, next) => {
    const userId = req.session.user_id;

    if (!userId) {
        return res.redirect('/login');
    }

    try {
        /*
            TODO: 유저의 대여 기록을 모두 출력하는 페이지를 렌더링하는 코드를 작성하세요.
        */
        const sql = 
            `SELECT l.loan_id as id, l.book_id as book_instance_id,
                bt.title as book_title, bt.author as book_author,
                DATE_FORMAT(l.loan_date, '%Y.%m.%d') as borrow_date,
                DATE_FORMAT(l.return_date, '%Y.%m.%d') as return_date,
                b.status as status
            FROM Loan l
            JOIN Book b ON l.book_id = b.book_id
            JOIN Booktype bt ON b.booktype_id = bt.booktype_id
            WHERE l.user_id = ?
            ORDER BY l.loan_date DESC
            `;

        const [borrowings] = await db.query(sql, [userId]);

        //사용자 대출 통계 데이터 제공 로직
        //월별 대출 데이터
        //현재부터 12개월 간의 통계를 보여줌
        const monthly_sql = `
            SELECT DATE_FORMAT(loan_date, '%Y-%m') AS month, COUNT(*) AS cnt
            FROM Loan
            WHERE user_id = ?
            GROUP BY DATE_FORMAT(loan_date, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        `;
        const [monthData] = await db.query(monthly_sql, [userId]);

        //카테고리별 대출 데이터
        //사용자의 전체 대출 이력을 살핌
        //대출 횟수를 기준으로 카테고리별 랭킹을 보여줌
        const category_sql = `
            SELECT c.category_name AS category_name, COUNT(*) AS cnt
            FROM Loan AS l
            NATURAL JOIN Book AS b
            NATURAL JOIN Booktype AS bt
            NATURAL JOIN Bookcategory AS bc
            NATURAL JOIN Category c
            WHERE l.user_id = ?
            GROUP BY c.category_id, c.category_name
            ORDER BY cnt DESC
            LIMIT 5
        `
        const [caregoryData] = await db.query(category_sql, [userId]);

        res.render('pages/borrowings', {
            title: 'My Borrowing History',
            borrowings: borrowings, // 대여 기록 리스트가 전달되어야 합니다.
            data: {
                monthly: monthData,
                categories: caregoryData
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getBorrowingsPage
};